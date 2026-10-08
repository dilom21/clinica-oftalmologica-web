import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, filter, merge, of, Subscription, take } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import {
  CitaMedica,
  claseEstadoCita,
  etiquetaEstadoCita,
  formatearFechaCita,
  formatearHoraCita,
} from '../../../../../../features/agenda-citas/casos-uso/cu10-gestionar-citas/models/citas.models';
import { CitasService } from '../../../../../../features/agenda-citas/casos-uso/cu10-gestionar-citas/services/citas.service';
import { Paciente } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  HistorialClinicoDetalle,
  PacienteHistorial,
} from '../../../cu13-consultar-historial-clinico/models/historial-clinico.models';
import { HistorialClinicoService } from '../../../cu13-consultar-historial-clinico/services/historial-clinico.service';
import {
  ConsultaClinicaCrear,
  ConsultaClinicaRespuesta,
  esEstadoCitaIniciable,
  MOTIVO_CONSULTA_MAX_LENGTH,
} from '../../models/consulta-clinica.models';
import { ConsultaClinicaService } from '../../services/consulta-clinica.service';
import { IaClinicaService } from '../../../../services/ia-clinica.service';
import { AnalisisConsultaIa } from '../../../../services/ia-clinica.models';
import { VoiceRecognitionService } from '../../../../../../shared/services/voice-recognition.service';

type OpcionCita = 'sin-cita' | number;
type ContextoError = 'historial' | 'citas' | 'envio';

/** Normaliza un texto opcional: recorta y convierte vacío en null. */
function normalizarTexto(valor: string | null | undefined): string | null {
  const limpio = (valor ?? '').trim();
  return limpio.length > 0 ? limpio : null;
}

@Component({
  selector: 'app-registrar-consulta',
  imports: [Sidebar, ReactiveFormsModule],
  templateUrl: './registrar-consulta.html',
  styleUrl: './registrar-consulta.css',
})
export class RegistrarConsulta implements OnInit {
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

  // Citas válidas para iniciar la consulta.
  protected readonly citas = signal<CitaMedica[]>([]);
  protected readonly cargandoCitas = signal(false);
  protected readonly errorCitas = signal<string | null>(null);
  protected readonly opcionCita = signal<OpcionCita>('sin-cita');

  // Envío y resultado.
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly consultaRegistrada = signal<ConsultaClinicaRespuesta | null>(null);
  protected readonly analisisIa = signal<AnalisisConsultaIa | null>(null);
  protected readonly analizandoIa = signal(false);
  protected readonly errorIa = signal<string | null>(null);
  protected readonly campoDictando = signal<string | null>(null);

  protected readonly motivoMax = MOTIVO_CONSULTA_MAX_LENGTH;
  protected readonly motivoLongitud = signal(0);
  private readonly formularioValido = signal(false);

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    motivo_consulta: ['', [Validators.maxLength(MOTIVO_CONSULTA_MAX_LENGTH)]],
    anamnesis: ['', [Validators.required]],
    observaciones: [''],
  });

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
    if (this.enviando() || this.consultaRegistrada()) {
      return false;
    }
    if (!this.pacienteSeleccionado() || !this.historial()) {
      return false;
    }
    return this.formularioValido();
  });

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);
  private readonly citasService = inject(CitasService);
  private readonly consultaClinicaService = inject(ConsultaClinicaService);
  private readonly iaClinicaService = inject(IaClinicaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly voice = inject(VoiceRecognitionService);
  private dictationSubscription: Subscription | null = null;

  protected vozSoportada(): boolean { return this.voice.isSupported(); }
  protected vozEstado(): string { return this.voice.state(); }
  protected vozError(): string | null { return this.voice.mensajeError(); }

  protected dictarCampo(campo: 'motivo_consulta' | 'anamnesis' | 'observaciones'): void {
    this.dictationSubscription?.unsubscribe();
    this.dictationSubscription = null;
    this.campoDictando.set(campo);
    let sessionId = 0;
    this.dictationSubscription = merge(this.voice.results$, this.voice.terminal$).pipe(
      filter((event) => event.sessionId === sessionId),
      take(1),
    ).subscribe((event) => {
      if ('transcript' in event) {
        const control = this.form.controls[campo];
        const current = control.value.trim();
        control.setValue(current ? `${current}\n${event.transcript}` : event.transcript);
        control.markAsDirty();
      }
      this.dictationSubscription = null;
      this.campoDictando.set(null);
    });
    sessionId = this.voice.start({ fallbackLang: 'es-ES' });
    if (!this.voice.isSupported()) {
      this.dictationSubscription.unsubscribe();
      this.dictationSubscription = null;
      this.campoDictando.set(null);
    }
  }

  protected detenerDictado(): void {
    this.voice.stop();
    this.dictationSubscription?.unsubscribe();
    this.dictationSubscription = null;
    this.campoDictando.set(null);
  }

  ngOnInit(): void {
    this.formularioValido.set(this.form.valid);
    this.motivoLongitud.set(this.form.controls.motivo_consulta.value.length);

    this.form.controls.motivo_consulta.valueChanges.subscribe((valor) => {
      this.motivoLongitud.set((valor ?? '').length);
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

  protected reintentarCitas(): void {
    const id = Number(this.pacienteId());
    if (id) {
      this.cargarCitas(id);
    }
  }

  private seleccionarPacientePorId(pacienteId: number): void {
    const cambio = this.pacienteId() !== String(pacienteId);
    this.pacienteId.set(String(pacienteId));

    if (cambio) {
      this.reiniciarFormulario();
    }

    this.errorHistorial.set(null);
    this.errorCitas.set(null);
    this.pacienteSeleccionado.set(null);
    this.historial.set(null);
    this.citas.set([]);
    this.opcionCita.set('sin-cita');

    this.cargarHistorial(pacienteId);
    this.cargarCitas(pacienteId);
  }

  private limpiarPaciente(): void {
    this.pacienteId.set('');
    this.pacienteSeleccionado.set(null);
    this.historial.set(null);
    this.citas.set([]);
    this.opcionCita.set('sin-cita');
    this.errorHistorial.set(null);
    this.errorCitas.set(null);
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

  private cargarCitas(pacienteId: number): void {
    this.cargandoCitas.set(true);

    this.citasService
      .listarCitas({ paciente_id: pacienteId })
      .pipe(
        catchError((error: unknown) => {
          this.errorCitas.set(this.extraerError(error, 'citas'));
          return of(null);
        }),
      )
      .subscribe((citas) => {
        if (citas) {
          this.citas.set(citas.filter((cita) => esEstadoCitaIniciable(cita.estado)));
        }
        this.cargandoCitas.set(false);
      });
  }

  // --- Selección de cita --------------------------------------------------

  protected seleccionarOpcionCita(opcion: string | number): void {
    this.opcionCita.set(opcion === 'sin-cita' ? 'sin-cita' : Number(opcion));
    this.errorEnvio.set(null);
  }

  protected opcionCitaSeleccionada(opcion: OpcionCita): boolean {
    return this.opcionCita() === opcion;
  }

  // --- Registro -----------------------------------------------------------

  protected registrar(): void {
    if (this.enviando()) {
      return;
    }

    const historial = this.historial();
    if (!this.pacienteSeleccionado() || !historial) {
      this.errorEnvio.set(
        'Selecciona un paciente con historial clínico antes de registrar la consulta.',
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorEnvio.set('Revisa los datos de la consulta antes de continuar.');
      return;
    }

    const valor = this.form.getRawValue();
    const opcion = this.opcionCita();
    const datos: ConsultaClinicaCrear = {
      historial_clinico_id: historial.id,
      cita_id: typeof opcion === 'number' ? opcion : null,
      motivo_consulta: normalizarTexto(valor.motivo_consulta),
      anamnesis: normalizarTexto(valor.anamnesis),
      observaciones: normalizarTexto(valor.observaciones),
    };

    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.consultaClinicaService.registrarConsulta(datos).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        this.consultaRegistrada.set(respuesta);
        this.quitarCitaAtendida(respuesta.cita_id);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.errorEnvio.set(this.extraerError(error, 'envio'));
      },
    });
  }

  protected registrarOtraConsulta(): void {
    const pacienteId = Number(this.pacienteId());
    this.consultaRegistrada.set(null);
    this.analisisIa.set(null);
    this.errorIa.set(null);
    this.errorEnvio.set(null);
    this.reiniciarFormulario();
    this.opcionCita.set('sin-cita');

    if (pacienteId) {
      this.cargarCitas(pacienteId);
    }
  }

  protected analizarConsultaIa(): void {
    const id = this.consultaRegistrada()?.id;
    if (!id || this.analizandoIa()) return;
    this.analizandoIa.set(true);
    this.errorIa.set(null);
    this.analisisIa.set(null);
    this.iaClinicaService.analizarConsulta(id).subscribe({
      next: (resultado) => { this.analisisIa.set(resultado); this.analizandoIa.set(false); },
      error: (error: unknown) => { this.errorIa.set(this.mensajeErrorIa(error)); this.analizandoIa.set(false); },
    });
  }

  private mensajeErrorIa(error: unknown): string {
    switch (error instanceof HttpErrorResponse ? error.status : 0) {
      case 403: return 'No tienes autorización para utilizar IA sobre esta consulta.';
      case 502: return 'La IA devolvió una respuesta que no pudo procesarse.';
      case 503: return 'El servicio de IA no está disponible en este momento.';
      default: return 'No se pudo completar la asistencia con IA.';
    }
  }

  private reiniciarFormulario(): void {
    this.form.reset({
      motivo_consulta: '',
      anamnesis: '',
      observaciones: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.errorEnvio.set(null);
  }

  private quitarCitaAtendida(citaId: number | null): void {
    if (citaId === null) {
      return;
    }
    this.citas.update((lista) => lista.filter((cita) => cita.id !== citaId));
  }

  // --- Helpers de vista ---------------------------------------------------

  protected campoInvalido(campo: 'motivo_consulta' | 'anamnesis' | 'observaciones'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected etiquetaEstado(estado: string): string {
    return etiquetaEstadoCita(estado);
  }

  protected claseEstado(estado: string): string {
    return claseEstadoCita(estado);
  }

  protected fechaCita(fecha: string): string {
    return formatearFechaCita(fecha);
  }

  protected horaCita(hora: string): string {
    return formatearHoraCita(hora);
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

  protected nombreOftalmologo(respuesta: ConsultaClinicaRespuesta): string {
    const oftalmologo = respuesta.oftalmologo;
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
        if (contexto === 'citas') {
          return 'No tienes permisos para consultar las citas del paciente.';
        }
        return 'No tienes permisos para registrar consultas clínicas. Solo un oftalmólogo autorizado puede hacerlo.';
      case 404:
        if (contexto === 'citas') {
          return 'No se encontró la cita seleccionada.';
        }
        return 'No se encontró el historial clínico del paciente.';
      case 409:
        return 'No se pudo registrar la consulta por un conflicto con los datos: verifica que la cita esté vigente y no tenga una consulta previa.';
      case 422:
        return 'Algunos datos de la consulta no son válidos. Revisa el formulario.';
      case 500:
        return 'Ocurrió un error en el servidor. Inténtalo más tarde.';
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
      default:
        return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
  }
}
