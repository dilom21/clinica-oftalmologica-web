import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, filter, merge, of, Subscription, take } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  HistorialClinicoDetalle,
  PacienteHistorial,
} from '../../../cu13-consultar-historial-clinico/models/historial-clinico.models';
import { HistorialClinicoService } from '../../../cu13-consultar-historial-clinico/services/historial-clinico.service';
import {
  ConsultaClinicaRespuesta,
} from '../../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { ConsultaClinicaService } from '../../../cu15-registrar-consulta-clinica/services/consulta-clinica.service';
import {
  DiagnosticoCrear,
  DiagnosticoRespuesta,
  NOMBRE_DIAGNOSTICO_MAX_LENGTH,
} from '../../models/diagnostico.models';
import { DiagnosticoService } from '../../services/diagnostico.service';
import { IaClinicaService } from '../../../../services/ia-clinica.service';
import { MejoraDiagnosticoIa } from '../../../../services/ia-clinica.models';
import { VoiceRecognitionService } from '../../../../../../shared/services/voice-recognition.service';

type ContextoError = 'historial' | 'consultas' | 'diagnosticos' | 'envio';

/** Normaliza un texto opcional: recorta y convierte vacío en null. */
function normalizarTexto(valor: string | null | undefined): string | null {
  const limpio = (valor ?? '').trim();
  return limpio.length > 0 ? limpio : null;
}

@Component({
  selector: 'app-registrar-diagnostico',
  imports: [Sidebar, ReactiveFormsModule],
  templateUrl: './registrar-diagnostico.html',
  styleUrl: './registrar-diagnostico.css',
})
export class RegistrarDiagnostico implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  // Selección de paciente.
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly buscarTermino = signal('');
  protected readonly pacienteId = signal('');
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

  // Diagnósticos de la consulta seleccionada.
  protected readonly diagnosticos = signal<DiagnosticoRespuesta[]>([]);
  protected readonly cargandoDiagnosticos = signal(false);
  protected readonly errorDiagnosticos = signal<string | null>(null);

  // Envío y resultado.
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly diagnosticoRegistrado = signal<DiagnosticoRespuesta | null>(null);
  protected readonly mejoraIa = signal<MejoraDiagnosticoIa | null>(null);
  protected readonly mejorandoIa = signal(false);
  protected readonly errorIa = signal<string | null>(null);
  protected readonly estadoIa = signal<string | null>(null);
  protected readonly dictandoDescripcion = signal(false);

  protected readonly nombreMax = NOMBRE_DIAGNOSTICO_MAX_LENGTH;
  protected readonly nombreLongitud = signal(0);
  private readonly formularioValido = signal(false);

  private readonly fb = inject(FormBuilder);

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

  protected readonly puedeRegistrar = computed(() => {
    if (this.enviando() || this.diagnosticoRegistrado()) {
      return false;
    }
    if (!this.consultaSeleccionadaId()) {
      return false;
    }
    return this.formularioValido();
  });

  protected readonly consultaSeleccionada = computed(() => {
    const id = this.consultaSeleccionadaId();
    if (id === null) {
      return null;
    }
    return this.consultas().find((c) => c.id === id) ?? null;
  });

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);
  private readonly consultaClinicaService = inject(ConsultaClinicaService);
  private readonly diagnosticoService = inject(DiagnosticoService);
  private readonly iaClinicaService = inject(IaClinicaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly voice = inject(VoiceRecognitionService);
  private dictationSubscription: Subscription | null = null;

  protected vozEstado(): string { return this.voice.state(); }
  protected vozError(): string | null { return this.voice.mensajeError(); }

  protected dictarDescripcion(): void {
    this.dictationSubscription?.unsubscribe();
    this.dictationSubscription = null;
    this.dictandoDescripcion.set(true);
    let sessionId = 0;
    this.dictationSubscription = merge(this.voice.results$, this.voice.terminal$).pipe(
      filter((event) => event.sessionId === sessionId),
      take(1),
    ).subscribe((event) => {
      if ('transcript' in event) {
        const current = this.form.controls.descripcion.value.trim();
        this.form.controls.descripcion.setValue(current ? `${current}\n${event.transcript}` : event.transcript);
        this.form.controls.descripcion.markAsDirty();
      }
      this.dictationSubscription = null;
      this.dictandoDescripcion.set(false);
    });
    sessionId = this.voice.start({ fallbackLang: 'es-ES' });
    if (!this.voice.isSupported()) {
      this.dictationSubscription.unsubscribe();
      this.dictationSubscription = null;
      this.dictandoDescripcion.set(false);
    }
  }

  protected detenerDictado(): void {
    this.voice.stop();
    this.dictationSubscription?.unsubscribe();
    this.dictationSubscription = null;
    this.dictandoDescripcion.set(false);
  }

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_DIAGNOSTICO_MAX_LENGTH)]],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.formularioValido.set(this.form.valid);
    this.nombreLongitud.set(this.form.controls.nombre.value.length);

    this.form.controls.nombre.valueChanges.subscribe((valor) => {
      this.nombreLongitud.set((valor ?? '').length);
    });
    this.form.statusChanges.subscribe(() => {
      this.formularioValido.set(this.form.valid);
    });

    this.cargarPacientes();
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

  protected seleccionarPaciente(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    if (!id) {
      this.limpiarPaciente();
      return;
    }
    this.seleccionarPacientePorId(id);
  }

  protected consultarPaciente(paciente: Paciente): void {
    this.buscarTermino.set('');
    this.seleccionarPacientePorId(paciente.id);
  }

  protected reintentarHistorial(): void {
    const id = Number(this.pacienteId());
    if (id) {
      this.cargarHistorial(id);
    }
  }

  protected reintentarConsultas(): void {
    const id = Number(this.pacienteId());
    if (id) {
      this.cargarConsultas(id);
    }
  }

  protected reintentarDiagnosticos(): void {
    const id = this.consultaSeleccionadaId();
    if (id !== null) {
      this.cargarDiagnosticos(id);
    }
  }

  private seleccionarPacientePorId(pacienteId: number): void {
    const cambio = this.pacienteId() !== String(pacienteId);
    this.pacienteId.set(String(pacienteId));

    if (cambio) {
      this.reiniciarFormulario();
    }

    this.errorHistorial.set(null);
    this.errorConsultas.set(null);
    this.errorDiagnosticos.set(null);
    this.pacienteSeleccionado.set(null);
    this.historial.set(null);
    this.consultas.set([]);
    this.consultaSeleccionadaId.set(null);
    this.diagnosticos.set([]);
    this.diagnosticoRegistrado.set(null);

    this.cargarHistorial(pacienteId);
    this.cargarConsultas(pacienteId);
  }

  private limpiarPaciente(): void {
    this.pacienteId.set('');
    this.pacienteSeleccionado.set(null);
    this.historial.set(null);
    this.consultas.set([]);
    this.consultaSeleccionadaId.set(null);
    this.diagnosticos.set([]);
    this.errorHistorial.set(null);
    this.errorConsultas.set(null);
    this.errorDiagnosticos.set(null);
    this.reiniciarFormulario();
  }

  private cargarHistorial(pacienteId: number): void {
    this.cargandoHistorial.set(true);

    this.historialClinicoService
      .obtenerHistorialClinico(pacienteId)
      .pipe(
        catchError((error: unknown) => {
          this.errorHistorial.set(this.extraerError(error, 'historial'));
          return of(null);
        }),
      )
      .subscribe((resultado) => {
        if (resultado) {
          this.pacienteSeleccionado.set(resultado.paciente);
          this.historial.set(resultado.historial);
        }
        this.cargandoHistorial.set(false);
      });
  }

  private cargarConsultas(pacienteId: number): void {
    this.cargandoConsultas.set(true);

    // Reutilizamos el endpoint de consulta clínica existente que permite filtros
    this.consultaClinicaService
      .listarConsultas({ paciente_id: pacienteId })
      .pipe(
        catchError((error: unknown) => {
          this.errorConsultas.set(this.extraerError(error, 'consultas'));
          return of(null);
        }),
      )
      .subscribe((consultas) => {
        if (consultas) {
          this.consultas.set(consultas);
        }
        this.cargandoConsultas.set(false);
      });
  }

  protected seleccionarConsulta(consultaId: number): void {
    if (this.consultaSeleccionadaId() === consultaId) {
      return;
    }
    this.consultaSeleccionadaId.set(consultaId);
    this.diagnosticoRegistrado.set(null);
    this.mejoraIa.set(null);
    this.errorIa.set(null);
    this.estadoIa.set(null);
    this.reiniciarFormulario();
    this.cargarDiagnosticos(consultaId);
  }

  protected mejorarRedaccionIa(): void {
    const consultaId = this.consultaSeleccionadaId();
    const { nombre, descripcion } = this.form.getRawValue();
    if (this.mejorandoIa()) return;
    if (!consultaId || !nombre.trim() || !descripcion.trim()) {
      this.errorIa.set('Selecciona una consulta e ingresa el nombre y la descripción para solicitar una sugerencia.');
      return;
    }
    this.mejorandoIa.set(true);
    this.errorIa.set(null);
    this.estadoIa.set(null);
    this.mejoraIa.set(null);
    this.iaClinicaService.mejorarRedaccionDiagnostico(consultaId, {
      nombre: nombre.trim(), descripcion: descripcion.trim(),
    }).subscribe({
      next: (sugerencia) => { this.mejoraIa.set(sugerencia); this.mejorandoIa.set(false); },
      error: (error: unknown) => { this.errorIa.set(this.mensajeErrorIa(error)); this.mejorandoIa.set(false); },
    });
  }

  protected usarSugerenciaIa(): void {
    const sugerencia = this.mejoraIa();
    if (!sugerencia) return;
    this.form.controls.descripcion.setValue(sugerencia.descripcion_mejorada);
    this.mejoraIa.set(null);
    this.estadoIa.set('La sugerencia se copió al campo descripción. Aún no se ha registrado el diagnóstico.');
  }

  protected descartarSugerenciaIa(): void {
    this.mejoraIa.set(null);
    this.estadoIa.set('Se descartó la sugerencia. La descripción original se conserva.');
  }

  private mensajeErrorIa(error: unknown): string {
    switch (error instanceof HttpErrorResponse ? error.status : 0) {
      case 403: return 'No tienes autorización para utilizar IA sobre esta consulta.';
      case 502: return 'La IA devolvió una respuesta que no pudo procesarse.';
      case 503: return 'El servicio de IA no está disponible en este momento.';
      default: return 'No se pudo completar la asistencia con IA.';
    }
  }

  private cargarDiagnosticos(consultaId: number): void {
    this.cargandoDiagnosticos.set(true);
    this.errorDiagnosticos.set(null);

    this.diagnosticoService
      .listarDiagnosticos(consultaId)
      .pipe(
        catchError((error: unknown) => {
          this.errorDiagnosticos.set(this.extraerError(error, 'diagnosticos'));
          return of(null);
        }),
      )
      .subscribe((diagnosticos) => {
        if (diagnosticos) {
          this.diagnosticos.set(diagnosticos);
        }
        this.cargandoDiagnosticos.set(false);
      });
  }

  // --- Registro -----------------------------------------------------------

  protected registrar(): void {
    if (this.enviando()) {
      return;
    }

    const consultaId = this.consultaSeleccionadaId();
    if (!consultaId) {
      this.errorEnvio.set('Selecciona una consulta clínica antes de registrar el diagnóstico.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorEnvio.set('Revisa los datos del diagnóstico antes de continuar.');
      return;
    }

    const valor = this.form.getRawValue();
    const datos: DiagnosticoCrear = {
      nombre: normalizarTexto(valor.nombre)!,
      descripcion: normalizarTexto(valor.descripcion),
    };

    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.diagnosticoService.registrarDiagnostico(consultaId, datos).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        this.diagnosticoRegistrado.set(respuesta);
        this.diagnosticos.update((lista) => [respuesta, ...lista]);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.errorEnvio.set(this.extraerError(error, 'envio'));
      },
    });
  }

  protected registrarOtroDiagnostico(): void {
    this.diagnosticoRegistrado.set(null);
    this.errorEnvio.set(null);
    this.reiniciarFormulario();
  }

  private reiniciarFormulario(): void {
    this.form.reset({
      nombre: '',
      descripcion: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.errorEnvio.set(null);
  }

  // --- Helpers de vista ---------------------------------------------------

  protected campoInvalido(campo: 'nombre' | 'descripcion'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (soloFecha) {
      const [, anio, mes, dia] = soloFecha;
      return `${dia}/${mes}/${anio}`;
    }
    const fechaDate = new Date(fecha);
    if (Number.isNaN(fechaDate.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(fechaDate);
  }

  protected formatearFechaHora(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    const fechaDate = new Date(fecha);
    if (Number.isNaN(fechaDate.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(fechaDate);
  }

  protected etiquetaEstado(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  protected claseEstado(estado: boolean): string {
    return estado ? 'diagnostico-estado--activo' : 'diagnostico-estado--inactivo';
  }

  protected nombreOftalmologo(consulta: ConsultaClinicaRespuesta): string {
    const oftalmologo = consulta.oftalmologo;
    if (!oftalmologo) {
      return '—';
    }
    return `${oftalmologo.nombres} ${oftalmologo.apellidos}`.trim();
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
        if (contexto === 'historial') {
          return 'No tienes permisos para consultar el historial clínico.';
        }
        if (contexto === 'consultas') {
          return 'No tienes permisos para consultar las consultas clínicas.';
        }
        if (contexto === 'diagnosticos') {
          return 'No tienes permisos para consultar los diagnósticos.';
        }
        return 'No tienes permisos para registrar diagnósticos. Solo un oftalmólogo autorizado puede hacerlo.';
      case 404:
        if (contexto === 'consultas') {
          return 'No se encontró la consulta clínica seleccionada.';
        }
        if (contexto === 'diagnosticos') {
          return 'No se encontró la consulta clínica o no tiene diagnósticos.';
        }
        return 'No se encontró el historial clínico del paciente.';
      case 409:
        return 'No se pudo registrar el diagnóstico por un conflicto con los datos.';
      case 422:
        return 'Algunos datos del diagnóstico no son válidos. Revisa el formulario.';
      case 500:
        return 'Ocurrió un error en el servidor. Inténtalo más tarde.';
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
      default:
        return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
  }
}
