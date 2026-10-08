import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  HistorialClinicoDetalle,
  PacienteHistorial,
} from '../../../cu13-consultar-historial-clinico/models/historial-clinico.models';
import { HistorialClinicoService } from '../../../cu13-consultar-historial-clinico/services/historial-clinico.service';
import { ConsultaClinicaRespuesta } from '../../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { ConsultaClinicaService } from '../../../cu15-registrar-consulta-clinica/services/consulta-clinica.service';
import { DiagnosticoRespuesta } from '../../../cu16-registrar-diagnostico/models/diagnostico.models';
import { DiagnosticoService } from '../../../cu16-registrar-diagnostico/services/diagnostico.service';
import { ContextoConsulta } from '../../components/contexto-consulta/contexto-consulta';
import { IndicacionList } from '../../components/indicacion-list/indicacion-list';
import { RecetaCard } from '../../components/receta-card/receta-card';
import { TratamientoList } from '../../components/tratamiento-list/tratamiento-list';
import {
  DetalleRecetaCrear,
  IndicacionCrear,
  IndicacionRespuesta,
  RecetaCrear,
  RecetaRespuesta,
  TratamientoCrear,
  TratamientoRespuesta,
  formatearFecha,
  formatearFechaHora,
} from '../../models/tratamientos-recetas.models';
import { TratamientosRecetasService } from '../../services/tratamientos-recetas.service';

type TabCu17 = 'tratamientos' | 'indicaciones' | 'recetas';
type ContextoError =
  | 'historial'
  | 'consultas'
  | 'diagnosticos'
  | 'tratamientos'
  | 'indicaciones'
  | 'recetas'
  | 'envio';

interface TabItem {
  id: TabCu17;
  etiqueta: string;
}

/** Normaliza un texto opcional: recorta y convierte vacío en null. */
function normalizarTexto(valor: string | null | undefined): string | null {
  const limpio = (valor ?? '').trim();
  return limpio.length > 0 ? limpio : null;
}

/** Valida que `fecha_fin` no sea anterior a `fecha_inicio` cuando ambas existen. */
function rangoFechasValido(control: AbstractControl): { rangoFechas: true } | null {
  const inicio = control.get('fecha_inicio')?.value as string | null;
  const fin = control.get('fecha_fin')?.value as string | null;
  if (inicio && fin && fin < inicio) {
    return { rangoFechas: true };
  }
  return null;
}

/** Exige al menos un detalle de receta antes de poder guardar. */
const alMenosUnDetalle: ValidatorFn = (control: AbstractControl) =>
  (control as FormArray).length > 0 ? null : { sinDetalles: true };

/**
 * CU17 - Registrar tratamientos, indicaciones y recetas.
 *
 * Parte de una consulta clínica existente (CU15) y reutiliza el historial
 * (CU13) y los diagnósticos (CU16) solo como contexto clínico. Tratamientos,
 * indicaciones y recetas son independientes: cada sección carga, reporta y
 * reintenta por separado, de modo que un error parcial nunca inutiliza el
 * resto de la pantalla.
 */
@Component({
  selector: 'app-registrar-tratamientos-recetas',
  imports: [
    Sidebar,
    ReactiveFormsModule,
    ContextoConsulta,
    TratamientoList,
    IndicacionList,
    RecetaCard,
  ],
  templateUrl: './registrar-tratamientos-recetas.html',
  styleUrl: './registrar-tratamientos-recetas.css',
})
export class RegistrarTratamientosRecetas implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  // Selección de paciente.
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly buscarTermino = signal('');
  protected readonly pacienteId = signal<number | null>(null);
  protected readonly cargandoPacientes = signal(true);
  protected readonly errorCargaPacientes = signal(false);

  // Historial clínico del paciente seleccionado.
  protected readonly pacienteSeleccionado = signal<PacienteHistorial | null>(null);
  protected readonly historial = signal<HistorialClinicoDetalle | null>(null);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal<string | null>(null);

  // Consultas clínicas del paciente.
  protected readonly consultas = signal<ConsultaClinicaRespuesta[]>([]);
  protected readonly cargandoConsultas = signal(false);
  protected readonly errorConsultas = signal<string | null>(null);
  protected readonly consultaSeleccionadaId = signal<number | null>(null);

  // Diagnósticos de la consulta (solo contexto).
  protected readonly diagnosticos = signal<DiagnosticoRespuesta[]>([]);
  protected readonly cargandoDiagnosticos = signal(false);
  protected readonly errorDiagnosticos = signal<string | null>(null);

  // Navegación interna por secciones independientes.
  protected readonly tabActiva = signal<TabCu17>('tratamientos');
  protected readonly tabs: ReadonlyArray<TabItem> = [
    { id: 'tratamientos', etiqueta: 'Tratamientos' },
    { id: 'indicaciones', etiqueta: 'Indicaciones' },
    { id: 'recetas', etiqueta: 'Recetas' },
  ];

  // Tratamientos.
  protected readonly tratamientos = signal<TratamientoRespuesta[]>([]);
  protected readonly cargandoTratamientos = signal(false);
  protected readonly errorTratamientos = signal<string | null>(null);
  protected readonly enviandoTratamiento = signal(false);
  protected readonly errorTratamiento = signal<string | null>(null);
  protected readonly exitoTratamiento = signal<string | null>(null);

  // Indicaciones.
  protected readonly indicaciones = signal<IndicacionRespuesta[]>([]);
  protected readonly cargandoIndicaciones = signal(false);
  protected readonly errorIndicaciones = signal<string | null>(null);
  protected readonly enviandoIndicacion = signal(false);
  protected readonly errorIndicacion = signal<string | null>(null);
  protected readonly exitoIndicacion = signal<string | null>(null);

  // Recetas.
  protected readonly recetas = signal<RecetaRespuesta[]>([]);
  protected readonly cargandoRecetas = signal(false);
  protected readonly errorRecetas = signal<string | null>(null);
  protected readonly enviandoReceta = signal(false);
  protected readonly errorReceta = signal<string | null>(null);
  protected readonly exitoReceta = signal<string | null>(null);

  private readonly tratamientoValido = signal(false);
  private readonly indicacionValida = signal(false);
  private readonly recetaValida = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);
  private readonly consultaClinicaService = inject(ConsultaClinicaService);
  private readonly diagnosticoService = inject(DiagnosticoService);
  private readonly tratamientosRecetasService = inject(TratamientosRecetasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly formTratamiento = this.fb.nonNullable.group(
    {
      descripcion: ['', Validators.required],
      observaciones: [''],
      fecha_inicio: [''],
      fecha_fin: [''],
    },
    { validators: rangoFechasValido },
  );

  protected readonly formIndicacion = this.fb.nonNullable.group({
    descripcion: ['', Validators.required],
  });

  protected readonly formReceta = this.fb.nonNullable.group({
    observaciones: [''],
    detalles: this.fb.array([this.crearDetalleForm()], {
      validators: alMenosUnDetalle,
    }),
  });

  protected readonly formatearFecha = formatearFecha;
  protected readonly formatearFechaHora = formatearFechaHora;

  // --- Derivados ----------------------------------------------------------

  protected readonly pacientesFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    if (!termino) {
      return this.pacientes();
    }
    return this.pacientes().filter((paciente) =>
      `${paciente.nombres} ${paciente.apellidos} ${paciente.ci}`
        .toLowerCase()
        .includes(termino),
    );
  });

  protected readonly consultaSeleccionada = computed(() => {
    const id = this.consultaSeleccionadaId();
    if (id === null) {
      return null;
    }
    return this.consultas().find((consulta) => consulta.id === id) ?? null;
  });

  protected readonly puedeRegistrarTratamiento = computed(
    () =>
      this.consultaSeleccionadaId() !== null &&
      !this.enviandoTratamiento() &&
      this.tratamientoValido(),
  );

  protected readonly puedeRegistrarIndicacion = computed(
    () =>
      this.consultaSeleccionadaId() !== null &&
      !this.enviandoIndicacion() &&
      this.indicacionValida(),
  );

  protected readonly puedeRegistrarReceta = computed(
    () =>
      this.consultaSeleccionadaId() !== null &&
      !this.enviandoReceta() &&
      this.recetaValida(),
  );

  ngOnInit(): void {
    this.sincronizarValidez();
    this.cargarPacientes();
  }

  private sincronizarValidez(): void {
    this.tratamientoValido.set(this.formTratamiento.valid);
    this.indicacionValida.set(this.formIndicacion.valid);
    this.recetaValida.set(this.formReceta.valid);

    this.formTratamiento.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tratamientoValido.set(this.formTratamiento.valid));
    this.formIndicacion.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.indicacionValida.set(this.formIndicacion.valid));
    this.formReceta.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recetaValida.set(this.formReceta.valid));
  }

  // --- Carga de catálogos -------------------------------------------------

  private cargarPacientes(): void {
    this.cargandoPacientes.set(true);
    this.errorCargaPacientes.set(false);

    this.pacientesService.listarPacientes().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.cargandoPacientes.set(false);
      },
      error: () => {
        this.pacientes.set([]);
        this.cargandoPacientes.set(false);
        this.errorCargaPacientes.set(true);
      },
    });
  }

  protected reintentarPacientes(): void {
    this.cargarPacientes();
  }

  protected onBuscar(event: Event): void {
    this.buscarTermino.set((event.target as HTMLInputElement).value);
  }

  protected esPacienteActivo(paciente: Paciente): boolean {
    return this.pacienteId() === paciente.id;
  }

  protected iniciales(paciente: Paciente): string {
    return `${paciente.nombres.charAt(0)}${paciente.apellidos.charAt(0)}`.toUpperCase();
  }

  // --- Selección de paciente ----------------------------------------------

  protected seleccionarPaciente(paciente: Paciente): void {
    if (this.pacienteId() === paciente.id) {
      return;
    }
    this.pacienteId.set(paciente.id);
    this.buscarTermino.set('');
    this.limpiarPaciente();
    this.consultarHistorial(paciente.id);
  }

  protected limpiarSeleccion(): void {
    this.pacienteId.set(null);
    this.limpiarPaciente();
  }

  private limpiarPaciente(): void {
    this.pacienteSeleccionado.set(null);
    this.historial.set(null);
    this.cargandoHistorial.set(false);
    this.errorHistorial.set(null);
    this.consultas.set([]);
    this.errorConsultas.set(null);
    this.limpiarConsultaSeleccionada();
    this.reiniciarFormTratamiento();
    this.reiniciarFormIndicacion();
    this.reiniciarFormReceta();
  }

  // --- Historial y consultas ----------------------------------------------

  protected reintentarHistorial(): void {
    const id = this.pacienteId();
    if (id !== null) {
      this.consultarHistorial(id);
    }
  }

  protected reintentarConsultas(): void {
    const id = this.pacienteId();
    if (id !== null) {
      this.cargarConsultas(id);
    }
  }

  private consultarHistorial(pacienteId: number): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);

    this.historialClinicoService
      .obtenerHistorialClinico(pacienteId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.pacienteSeleccionado.set(null);
          this.historial.set(null);
          this.errorHistorial.set(this.extraerError(resultado.error, 'historial'));
        } else {
          this.pacienteSeleccionado.set(resultado.paciente);
          this.historial.set(resultado.historial);
        }
        this.cargandoHistorial.set(false);
        // Las consultas dependen del paciente, no del historial: se cargan
        // aunque el historial falle para no bloquear CU17.
        this.cargarConsultas(pacienteId);
      });
  }

  private cargarConsultas(pacienteId: number): void {
    this.cargandoConsultas.set(true);
    this.errorConsultas.set(null);

    this.consultaClinicaService
      .listarConsultas({ paciente_id: pacienteId })
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.consultas.set([]);
          this.errorConsultas.set(this.extraerError(resultado.error, 'consultas'));
        } else {
          // Más reciente primero.
          const ordenadas = [...resultado].sort(
            (a, b) => this.tiempo(b.fecha_consulta) - this.tiempo(a.fecha_consulta),
          );
          this.consultas.set(ordenadas);
        }
        this.cargandoConsultas.set(false);
      });
  }

  // --- Selección de consulta ----------------------------------------------

  protected seleccionarConsulta(consultaId: number): void {
    if (this.consultaSeleccionadaId() === consultaId) {
      return;
    }
    this.consultaSeleccionadaId.set(consultaId);
    this.reiniciarSecciones();
    this.cargarDiagnosticos(consultaId);
    this.cargarTratamientos(consultaId);
    this.cargarIndicaciones(consultaId);
    this.cargarRecetas(consultaId);
  }

  protected esConsultaActiva(consultaId: number): boolean {
    return this.consultaSeleccionadaId() === consultaId;
  }

  protected volverAConsultas(): void {
    this.limpiarConsultaSeleccionada();
  }

  protected cambiarTab(tab: TabCu17): void {
    this.tabActiva.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, indice: number): void {
    const total = this.tabs.length;
    let siguiente = indice;
    switch (event.key) {
      case 'ArrowRight':
        siguiente = (indice + 1) % total;
        break;
      case 'ArrowLeft':
        siguiente = (indice - 1 + total) % total;
        break;
      case 'Home':
        siguiente = 0;
        break;
      case 'End':
        siguiente = total - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const destino = this.tabs[siguiente].id;
    this.cambiarTab(destino);
    document.getElementById(`cu17-tab-${destino}`)?.focus();
  }

  private limpiarConsultaSeleccionada(): void {
    this.consultaSeleccionadaId.set(null);
    this.reiniciarSecciones();
  }

  private reiniciarSecciones(): void {
    this.diagnosticos.set([]);
    this.cargandoDiagnosticos.set(false);
    this.errorDiagnosticos.set(null);

    this.tratamientos.set([]);
    this.cargandoTratamientos.set(false);
    this.errorTratamientos.set(null);
    this.errorTratamiento.set(null);
    this.exitoTratamiento.set(null);

    this.indicaciones.set([]);
    this.cargandoIndicaciones.set(false);
    this.errorIndicaciones.set(null);
    this.errorIndicacion.set(null);
    this.exitoIndicacion.set(null);

    this.recetas.set([]);
    this.cargandoRecetas.set(false);
    this.errorRecetas.set(null);
    this.errorReceta.set(null);
    this.exitoReceta.set(null);

    this.reiniciarFormTratamiento();
    this.reiniciarFormIndicacion();
    this.reiniciarFormReceta();
  }

  // --- Contexto: diagnósticos ---------------------------------------------

  protected reintentarDiagnosticos(): void {
    const id = this.consultaSeleccionadaId();
    if (id !== null) {
      this.cargarDiagnosticos(id);
    }
  }

  private cargarDiagnosticos(consultaId: number): void {
    this.cargandoDiagnosticos.set(true);
    this.errorDiagnosticos.set(null);

    this.diagnosticoService
      .listarDiagnosticos(consultaId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.diagnosticos.set([]);
          this.errorDiagnosticos.set(this.extraerError(resultado.error, 'diagnosticos'));
        } else {
          this.diagnosticos.set(resultado);
        }
        this.cargandoDiagnosticos.set(false);
      });
  }

  // --- Tratamientos: carga ------------------------------------------------

  protected reintentarTratamientos(): void {
    const id = this.consultaSeleccionadaId();
    if (id !== null) {
      this.cargarTratamientos(id);
    }
  }

  private cargarTratamientos(consultaId: number): void {
    this.cargandoTratamientos.set(true);
    this.errorTratamientos.set(null);

    this.tratamientosRecetasService
      .listarTratamientos(consultaId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.tratamientos.set([]);
          this.errorTratamientos.set(this.extraerError(resultado.error, 'tratamientos'));
        } else {
          this.tratamientos.set(resultado);
        }
        this.cargandoTratamientos.set(false);
      });
  }

  // --- Indicaciones: carga ------------------------------------------------

  protected reintentarIndicaciones(): void {
    const id = this.consultaSeleccionadaId();
    if (id !== null) {
      this.cargarIndicaciones(id);
    }
  }

  private cargarIndicaciones(consultaId: number): void {
    this.cargandoIndicaciones.set(true);
    this.errorIndicaciones.set(null);

    this.tratamientosRecetasService
      .listarIndicaciones(consultaId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.indicaciones.set([]);
          this.errorIndicaciones.set(this.extraerError(resultado.error, 'indicaciones'));
        } else {
          this.indicaciones.set(resultado);
        }
        this.cargandoIndicaciones.set(false);
      });
  }

  // --- Recetas: carga -----------------------------------------------------

  protected reintentarRecetas(): void {
    const id = this.consultaSeleccionadaId();
    if (id !== null) {
      this.cargarRecetas(id);
    }
  }

  private cargarRecetas(consultaId: number): void {
    this.cargandoRecetas.set(true);
    this.errorRecetas.set(null);

    this.tratamientosRecetasService
      .listarRecetas(consultaId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.recetas.set([]);
          this.errorRecetas.set(this.extraerError(resultado.error, 'recetas'));
        } else {
          this.recetas.set(resultado);
        }
        this.cargandoRecetas.set(false);
      });
  }

  // --- Formularios: manipulación ------------------------------------------

  protected get detalles() {
    return this.formReceta.controls.detalles;
  }

  private crearDetalleForm() {
    return this.fb.nonNullable.group({
      medicamento: ['', Validators.required],
      presentacion: [''],
      dosis: [''],
      frecuencia: [''],
      duracion: [''],
      indicaciones: [''],
    });
  }

  protected agregarDetalle(): void {
    this.detalles.push(this.crearDetalleForm());
  }

  protected eliminarDetalle(indice: number): void {
    if (indice < 0 || indice >= this.detalles.length) {
      return;
    }
    this.detalles.removeAt(indice);
    if (this.formReceta.invalid) {
      this.formReceta.markAsTouched();
    }
  }

  private reiniciarFormTratamiento(): void {
    this.formTratamiento.reset({
      descripcion: '',
      observaciones: '',
      fecha_inicio: '',
      fecha_fin: '',
    });
    this.formTratamiento.markAsPristine();
    this.formTratamiento.markAsUntouched();
  }

  private reiniciarFormIndicacion(): void {
    this.formIndicacion.reset({ descripcion: '' });
    this.formIndicacion.markAsPristine();
    this.formIndicacion.markAsUntouched();
  }

  private reiniciarFormReceta(): void {
    this.formReceta.controls.observaciones.reset('');
    this.detalles.clear();
    this.detalles.push(this.crearDetalleForm());
    this.formReceta.markAsPristine();
    this.formReceta.markAsUntouched();
  }

  // --- Tratamientos: registro ---------------------------------------------

  protected registrarTratamiento(): void {
    if (this.enviandoTratamiento()) {
      return;
    }

    const consultaId = this.consultaSeleccionadaId();
    if (consultaId === null) {
      this.errorTratamiento.set(
        'Selecciona una consulta clínica antes de registrar el tratamiento.',
      );
      return;
    }

    if (this.formTratamiento.invalid) {
      this.formTratamiento.markAllAsTouched();
      if (this.formTratamiento.hasError('rangoFechas')) {
        this.errorTratamiento.set(
          'La fecha de fin no puede ser anterior a la fecha de inicio.',
        );
      } else {
        this.errorTratamiento.set('Revisa los datos del tratamiento antes de continuar.');
      }
      return;
    }

    const valor = this.formTratamiento.getRawValue();
    const datos: TratamientoCrear = {
      descripcion: (valor.descripcion ?? '').trim(),
      observaciones: normalizarTexto(valor.observaciones),
      fecha_inicio: normalizarTexto(valor.fecha_inicio),
      fecha_fin: normalizarTexto(valor.fecha_fin),
    };

    this.enviandoTratamiento.set(true);
    this.errorTratamiento.set(null);
    this.exitoTratamiento.set(null);

    this.tratamientosRecetasService.registrarTratamiento(consultaId, datos).subscribe({
      next: (respuesta) => {
        this.enviandoTratamiento.set(false);
        this.tratamientos.update((lista) => [respuesta, ...lista]);
        this.exitoTratamiento.set('Tratamiento registrado correctamente.');
        this.reiniciarFormTratamiento();
      },
      error: (error: unknown) => {
        this.enviandoTratamiento.set(false);
        this.errorTratamiento.set(this.extraerError(error, 'envio'));
      },
    });
  }

  // --- Indicaciones: registro ---------------------------------------------

  protected registrarIndicacion(): void {
    if (this.enviandoIndicacion()) {
      return;
    }

    const consultaId = this.consultaSeleccionadaId();
    if (consultaId === null) {
      this.errorIndicacion.set(
        'Selecciona una consulta clínica antes de agregar la indicación.',
      );
      return;
    }

    if (this.formIndicacion.invalid) {
      this.formIndicacion.markAllAsTouched();
      this.errorIndicacion.set('La descripción de la indicación es obligatoria.');
      return;
    }

    const valor = this.formIndicacion.getRawValue();
    const datos: IndicacionCrear = {
      descripcion: (valor.descripcion ?? '').trim(),
    };
    if (!datos.descripcion) {
      this.errorIndicacion.set('La descripción de la indicación es obligatoria.');
      return;
    }

    this.enviandoIndicacion.set(true);
    this.errorIndicacion.set(null);
    this.exitoIndicacion.set(null);

    this.tratamientosRecetasService.registrarIndicacion(consultaId, datos).subscribe({
      next: (respuesta) => {
        this.enviandoIndicacion.set(false);
        this.indicaciones.update((lista) => [...lista, respuesta]);
        this.exitoIndicacion.set('Indicación agregada correctamente.');
        this.reiniciarFormIndicacion();
      },
      error: (error: unknown) => {
        this.enviandoIndicacion.set(false);
        this.errorIndicacion.set(this.extraerError(error, 'envio'));
      },
    });
  }

  // --- Recetas: registro --------------------------------------------------

  protected registrarReceta(): void {
    if (this.enviandoReceta()) {
      return;
    }

    const consultaId = this.consultaSeleccionadaId();
    if (consultaId === null) {
      this.errorReceta.set('Selecciona una consulta clínica antes de registrar la receta.');
      return;
    }

    if (this.formReceta.invalid) {
      this.formReceta.markAllAsTouched();
      this.errorReceta.set(
        this.detalles.length === 0
          ? 'Agrega al menos un medicamento para registrar la receta.'
          : 'Revisa los medicamentos de la receta. El medicamento es obligatorio.',
      );
      return;
    }

    const valor = this.formReceta.getRawValue();
    const detalles: DetalleRecetaCrear[] = valor.detalles
      .map((detalle) => ({
        medicamento: (detalle.medicamento ?? '').trim(),
        presentacion: normalizarTexto(detalle.presentacion),
        dosis: normalizarTexto(detalle.dosis),
        frecuencia: normalizarTexto(detalle.frecuencia),
        duracion: normalizarTexto(detalle.duracion),
        indicaciones: normalizarTexto(detalle.indicaciones),
      }))
      .filter((detalle) => detalle.medicamento.length > 0);

    if (detalles.length === 0) {
      this.errorReceta.set('Agrega al menos un medicamento para registrar la receta.');
      return;
    }

    const datos: RecetaCrear = {
      observaciones: normalizarTexto(valor.observaciones),
      detalles,
    };

    this.enviandoReceta.set(true);
    this.errorReceta.set(null);
    this.exitoReceta.set(null);

    this.tratamientosRecetasService.registrarReceta(consultaId, datos).subscribe({
      next: (respuesta) => {
        this.enviandoReceta.set(false);
        this.recetas.update((lista) => [respuesta, ...lista]);
        this.exitoReceta.set('Receta registrada correctamente.');
        this.reiniciarFormReceta();
      },
      error: (error: unknown) => {
        this.enviandoReceta.set(false);
        this.errorReceta.set(this.extraerError(error, 'envio'));
      },
    });
  }

  // --- Helpers de vista ---------------------------------------------------

  protected rangoFechasInvalido(): boolean {
    return this.formTratamiento.hasError('rangoFechas');
  }

  protected campoTratamientoInvalido(
    campo: 'descripcion' | 'fecha_inicio' | 'fecha_fin',
  ): boolean {
    const control = this.formTratamiento.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected campoIndicacionInvalido(): boolean {
    const control = this.formIndicacion.controls.descripcion;
    return control.invalid && (control.touched || control.dirty);
  }

  protected detalleMedicamentoInvalido(indice: number): boolean {
    const control = this.detalles.at(indice)?.get('medicamento');
    if (!control) {
      return false;
    }
    return control.invalid && (control.touched || control.dirty);
  }

  protected nombreOftalmologo(consulta: ConsultaClinicaRespuesta): string {
    const oftalmologo = consulta.oftalmologo;
    if (!oftalmologo) {
      return 'Oftalmólogo no asignado';
    }
    return `${oftalmologo.nombres} ${oftalmologo.apellidos}`.trim() || 'Oftalmólogo no asignado';
  }

  private tiempo(fecha: string): number {
    const valor = new Date(fecha).getTime();
    return Number.isNaN(valor) ? 0 : valor;
  }

  // --- Sesión / layout ----------------------------------------------------

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // --- Errores ------------------------------------------------------------

  private extraerError(err: unknown, contexto: ContextoError): string {
    const objeto =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: { detail?: unknown } })
        : null;
    const detail = objeto?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const primero = detail[0] as { msg?: unknown } | undefined;
      if (primero && typeof primero.msg === 'string' && primero.msg.trim()) {
        return primero.msg;
      }
    }

    switch (objeto?.status) {
      case 400:
        return 'La solicitud enviada no es válida.';
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        if (contexto === 'envio') {
          return 'No tienes permisos para registrar información clínica. Solo un oftalmólogo autorizado puede hacerlo.';
        }
        return 'No tienes permisos para consultar la información clínica.';
      case 404:
        if (contexto === 'consultas') {
          return 'No se encontró la consulta clínica del paciente.';
        }
        if (contexto === 'tratamientos' || contexto === 'indicaciones' || contexto === 'recetas') {
          return 'No se encontró la consulta clínica seleccionada.';
        }
        return 'No se encontró el historial clínico del paciente.';
      case 409:
        return 'No se pudo registrar por un conflicto con los datos existentes.';
      case 422:
        return 'Algunos datos enviados no son válidos. Revisa el formulario.';
      case 500:
        return 'Ocurrió un error en el servidor. Inténtalo más tarde.';
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
      default:
        switch (contexto) {
          case 'tratamientos':
            return 'No se pudieron cargar los tratamientos de la consulta.';
          case 'indicaciones':
            return 'No se pudieron cargar las indicaciones de la consulta.';
          case 'recetas':
            return 'No se pudieron cargar las recetas de la consulta.';
          case 'diagnosticos':
            return 'No se pudieron cargar los diagnósticos de la consulta.';
          case 'consultas':
            return 'No se pudieron cargar las consultas clínicas del paciente.';
          default:
            return 'No se pudo completar la operación. Inténtalo nuevamente.';
        }
    }
  }
}
