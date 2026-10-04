import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
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
import { ContextoConsulta } from '../../../cu17-registrar-tratamientos-recetas/components/contexto-consulta/contexto-consulta';
import { ExamenCard } from '../../components/examen-card/examen-card';
import { RegistroNavegador } from '../../../../../../core/components/registro-navegador/registro-navegador';
import {
  ExamenOftalmologicoCrear,
  ExamenOftalmologicoRespuesta,
  ResultadoExamenCrear,
  ResultadoExamenRespuesta,
} from '../../models/examenes.models';
import { ExamenesService } from '../../services/examenes.service';

type ContextoError =
  | 'historial'
  | 'consultas'
  | 'diagnosticos'
  | 'examenes'
  | 'resultados'
  | 'envio';

/** Normaliza un texto opcional: recorta y convierte vacío en null. */
function normalizarTexto(valor: string | null | undefined): string | null {
  const limpio = (valor ?? '').trim();
  return limpio.length > 0 ? limpio : null;
}

/**
 * CU18 - Registrar resultados de exámenes oftalmológicos.
 *
 * Parte de una consulta clínica existente (CU15) y reutiliza el historial
 * (CU13) y los diagnósticos (CU16) como contexto. Los exámenes y sus
 * resultados se cargan y reportan de forma independiente para que un error
 * parcial no inutilice la pantalla.
 */
@Component({
  selector: 'app-registrar-examenes',
  imports: [Sidebar, ReactiveFormsModule, ContextoConsulta, ExamenCard, RegistroNavegador],
  templateUrl: './registrar-examenes.html',
  styleUrl: './registrar-examenes.css',
})
export class RegistrarExamenes implements OnInit {
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

  // Consultas clínicas.
  protected readonly consultas = signal<ConsultaClinicaRespuesta[]>([]);
  protected readonly cargandoConsultas = signal(false);
  protected readonly errorConsultas = signal<string | null>(null);
  protected readonly consultaSeleccionadaId = signal<number | null>(null);

  // Diagnósticos (solo contexto clínico).
  protected readonly diagnosticos = signal<DiagnosticoRespuesta[]>([]);
  protected readonly cargandoDiagnosticos = signal(false);
  protected readonly errorDiagnosticos = signal<string | null>(null);

  // Exámenes de la consulta.
  protected readonly examenes = signal<ExamenOftalmologicoRespuesta[]>([]);
  protected readonly cargandoExamenes = signal(false);
  protected readonly errorExamenes = signal<string | null>(null);
  protected readonly indiceExamen = signal(0);

  // Resultados por examen (se cargan al seleccionar cada examen).
  protected readonly resultadosPorExamen = signal<
    Record<number, ResultadoExamenRespuesta[]>
  >({});
  protected readonly cargandoResultados = signal(false);
  protected readonly errorResultados = signal<string | null>(null);

  // Envío y resultado.
  protected readonly enviandoExamen = signal(false);
  protected readonly errorExamen = signal<string | null>(null);
  protected readonly exitoExamen = signal<string | null>(null);
  protected readonly enviandoResultado = signal(false);
  protected readonly errorResultado = signal<string | null>(null);
  protected readonly exitoResultado = signal<string | null>(null);

  private readonly examenValido = signal(false);
  private readonly resultadoValido = signal(false);

  private readonly fb = inject(FormBuilder);

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);
  private readonly consultaClinicaService = inject(ConsultaClinicaService);
  private readonly diagnosticoService = inject(DiagnosticoService);
  private readonly examenesService = inject(ExamenesService);

  protected readonly formExamen = this.fb.nonNullable.group({
    nombre_examen: ['', Validators.required],
    observaciones: [''],
  });

  protected readonly formResultado = this.fb.nonNullable.group({
    resultado: ['', Validators.required],
    archivo_url: [''],
  });

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

  protected readonly examenActual = computed<ExamenOftalmologicoRespuesta | null>(() => {
    const lista = this.examenes();
    return lista[this.indiceExamen()] ?? null;
  });

  /** `null` mientras los resultados del examen actual no se hayan cargado. */
  protected readonly resultadosDelExamenActual = computed<
    ReadonlyArray<ResultadoExamenRespuesta> | null
  >(() => {
    const examen = this.examenActual();
    if (!examen) {
      return null;
    }
    return this.resultadosPorExamen()[examen.id] ?? null;
  });

  protected readonly puedeRegistrarExamen = computed(
    () =>
      this.consultaSeleccionadaId() !== null &&
      !this.enviandoExamen() &&
      this.examenValido(),
  );

  protected readonly puedeRegistrarResultado = computed(
    () => this.examenActual() !== null && !this.enviandoResultado() && this.resultadoValido(),
  );

  ngOnInit(): void {
    this.sincronizarValidez();
    this.cargarPacientes();
  }

  private sincronizarValidez(): void {
    this.examenValido.set(this.formExamen.valid);
    this.resultadoValido.set(this.formResultado.valid);

    this.formExamen.statusChanges.subscribe(() =>
      this.examenValido.set(this.formExamen.valid),
    );
    this.formResultado.statusChanges.subscribe(() =>
      this.resultadoValido.set(this.formResultado.valid),
    );
  }

  // --- Selección de paciente y consulta -----------------------------------

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
    this.consultaSeleccionadaId.set(null);
    this.limpiarConsulta();
  }

  private limpiarConsulta(): void {
    this.diagnosticos.set([]);
    this.cargandoDiagnosticos.set(false);
    this.errorDiagnosticos.set(null);
    this.limpiarExamenes();
    this.reiniciarFormExamen();
  }

  private limpiarExamenes(): void {
    this.examenes.set([]);
    this.cargandoExamenes.set(false);
    this.errorExamenes.set(null);
    this.indiceExamen.set(0);
    this.resultadosPorExamen.set({});
    this.cargandoResultados.set(false);
    this.errorResultados.set(null);
    this.reiniciarFormResultado();
    this.exitoResultado.set(null);
  }

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

  // --- Carga del historial, consultas y contexto --------------------------

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
          const ordenadas = [...resultado].sort(
            (a, b) => this.tiempo(b.fecha_consulta) - this.tiempo(a.fecha_consulta),
          );
          this.consultas.set(ordenadas);
        }
        this.cargandoConsultas.set(false);
      });
  }

  protected seleccionarConsulta(consultaId: number): void {
    if (this.consultaSeleccionadaId() === consultaId) {
      return;
    }
    this.consultaSeleccionadaId.set(consultaId);
    this.limpiarConsulta();
    this.cargarDiagnosticos(consultaId);
    this.cargarExamenes(consultaId);
  }

  protected volverAConsultas(): void {
    this.consultaSeleccionadaId.set(null);
    this.limpiarConsulta();
  }

  protected esConsultaActiva(consultaId: number): boolean {
    return this.consultaSeleccionadaId() === consultaId;
  }

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

  // --- Exámenes y resultados ----------------------------------------------

  protected reintentarExamenes(): void {
    const id = this.consultaSeleccionadaId();
    if (id !== null) {
      this.cargarExamenes(id);
    }
  }

  private cargarExamenes(consultaId: number): void {
    this.cargandoExamenes.set(true);
    this.errorExamenes.set(null);

    this.examenesService
      .listarExamenes(consultaId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.examenes.set([]);
          this.errorExamenes.set(this.extraerError(resultado.error, 'examenes'));
        } else {
          this.examenes.set(resultado);
          this.indiceExamen.set(0);
          const primero = resultado[0];
          if (primero) {
            this.cargarResultadosDeExamen(primero.id);
          }
        }
        this.cargandoExamenes.set(false);
      });
  }

  /** Navega al examen indicado cargando sus resultados si aún no se tienen. */
  protected irAExamen(indice: number): void {
    const lista = this.examenes();
    if (indice < 0 || indice >= lista.length) {
      return;
    }
    this.indiceExamen.set(indice);
    this.errorResultados.set(null);
    this.reiniciarFormResultado();
    this.exitoResultado.set(null);
    this.cargarResultadosDeExamen(lista[indice].id);
  }

  protected anteriorExamen(): void {
    this.irAExamen(this.indiceExamen() - 1);
  }

  protected siguienteExamen(): void {
    this.irAExamen(this.indiceExamen() + 1);
  }

  protected reintentarResultados(): void {
    const examen = this.examenActual();
    if (examen) {
      this.cargarResultadosDeExamen(examen.id, true);
    }
  }

  private cargarResultadosDeExamen(examenId: number, forzar = false): void {
    if (!forzar && this.resultadosPorExamen()[examenId] !== undefined) {
      this.cargandoResultados.set(false);
      this.errorResultados.set(null);
      return;
    }

    this.cargandoResultados.set(true);
    this.errorResultados.set(null);

    this.examenesService
      .listarResultados(examenId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.errorResultados.set(this.extraerError(resultado.error, 'resultados'));
        } else {
          this.resultadosPorExamen.update((mapa) => ({
            ...mapa,
            [examenId]: resultado,
          }));
        }
        this.cargandoResultados.set(false);
      });
  }

  // --- Registro de examen -------------------------------------------------

  protected registrarExamen(): void {
    if (this.enviandoExamen()) {
      return;
    }

    const consultaId = this.consultaSeleccionadaId();
    if (consultaId === null) {
      this.errorExamen.set('Selecciona una consulta clínica antes de registrar el examen.');
      return;
    }

    if (this.formExamen.invalid) {
      this.formExamen.markAllAsTouched();
      this.errorExamen.set('El nombre del examen es obligatorio.');
      return;
    }

    const valor = this.formExamen.getRawValue();
    const datos: ExamenOftalmologicoCrear = {
      nombre_examen: (valor.nombre_examen ?? '').trim(),
      observaciones: normalizarTexto(valor.observaciones),
    };
    if (!datos.nombre_examen) {
      this.errorExamen.set('El nombre del examen es obligatorio.');
      return;
    }

    this.enviandoExamen.set(true);
    this.errorExamen.set(null);
    this.exitoExamen.set(null);

    this.examenesService.registrarExamen(consultaId, datos).subscribe({
      next: (respuesta) => {
        this.enviandoExamen.set(false);
        // El nuevo examen pasa a ser el seleccionado y aún no tiene resultados.
        this.examenes.update((lista) => [respuesta, ...lista]);
        this.indiceExamen.set(0);
        this.resultadosPorExamen.update((mapa) => ({ ...mapa, [respuesta.id]: [] }));
        this.errorResultados.set(null);
        this.exitoExamen.set('Examen registrado correctamente.');
        this.reiniciarFormExamen();
        this.reiniciarFormResultado();
      },
      error: (error: unknown) => {
        this.enviandoExamen.set(false);
        this.errorExamen.set(this.extraerError(error, 'envio'));
      },
    });
  }

  // --- Registro de resultado ----------------------------------------------

  protected registrarResultado(): void {
    if (this.enviandoResultado()) {
      return;
    }

    const examen = this.examenActual();
    if (!examen) {
      this.errorResultado.set('Selecciona un examen antes de registrar el resultado.');
      return;
    }

    if (this.formResultado.invalid) {
      this.formResultado.markAllAsTouched();
      this.errorResultado.set('El resultado es obligatorio.');
      return;
    }

    const valor = this.formResultado.getRawValue();
    const datos: ResultadoExamenCrear = {
      resultado: (valor.resultado ?? '').trim(),
      archivo_url: normalizarTexto(valor.archivo_url),
    };
    if (!datos.resultado) {
      this.errorResultado.set('El resultado es obligatorio.');
      return;
    }

    this.enviandoResultado.set(true);
    this.errorResultado.set(null);
    this.exitoResultado.set(null);

    this.examenesService.registrarResultado(examen.id, datos).subscribe({
      next: (respuesta) => {
        this.enviandoResultado.set(false);
        this.resultadosPorExamen.update((mapa) => ({
          ...mapa,
          [examen.id]: [...(mapa[examen.id] ?? []), respuesta],
        }));
        this.exitoResultado.set('Resultado registrado correctamente.');
        this.reiniciarFormResultado();
      },
      error: (error: unknown) => {
        this.enviandoResultado.set(false);
        this.errorResultado.set(this.extraerError(error, 'envio'));
      },
    });
  }

  private reiniciarFormExamen(): void {
    this.formExamen.reset({ nombre_examen: '', observaciones: '' });
    this.formExamen.markAsPristine();
    this.formExamen.markAsUntouched();
  }

  private reiniciarFormResultado(): void {
    this.formResultado.reset({ resultado: '', archivo_url: '' });
    this.formResultado.markAsPristine();
    this.formResultado.markAsUntouched();
    this.errorResultado.set(null);
  }

  // --- Helpers de vista ---------------------------------------------------

  protected campoExamenInvalido(): boolean {
    const control = this.formExamen.controls.nombre_examen;
    return control.invalid && (control.touched || control.dirty);
  }

  protected campoResultadoInvalido(): boolean {
    const control = this.formResultado.controls.resultado;
    return control.invalid && (control.touched || control.dirty);
  }

  protected nombreOftalmologo(consulta: ConsultaClinicaRespuesta): string {
    const oftalmologo = consulta.oftalmologo;
    if (!oftalmologo) {
      return 'Oftalmólogo no asignado';
    }
    return (
      `${oftalmologo.nombres} ${oftalmologo.apellidos}`.trim() || 'Oftalmólogo no asignado'
    );
  }

  protected formatearFechaHora(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(valor);
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
        if (contexto === 'examenes' || contexto === 'resultados') {
          return 'No se encontró el examen seleccionado.';
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
          case 'examenes':
            return 'No se pudieron cargar los exámenes de la consulta.';
          case 'resultados':
            return 'No se pudieron cargar los resultados del examen.';
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

