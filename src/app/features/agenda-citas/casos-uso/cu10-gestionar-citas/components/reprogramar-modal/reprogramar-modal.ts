import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { AgendaService } from '../../../cu09-consultar-agenda-disponibilidad/services/agenda.service';
import { CitasService } from '../../services/citas.service';
import {
  CitaMedica,
  DisponibilidadCita,
  fechaActualInput,
  formatearFechaCita,
  formatearHoraCita,
  horariosReservables,
  IntervaloCita,
  OftalmologoCita,
  PacienteCatalogo,
} from '../../models/citas.models';
import { SelectorHorarios } from '../selector-horarios/selector-horarios';

@Component({
  selector: 'app-cu10-reprogramar-modal',
  imports: [SelectorHorarios],
  templateUrl: './reprogramar-modal.html',
  styleUrl: './reprogramar-modal.css',
})
export class ReprogramarModal implements OnInit {
  readonly abierto = input(false);
  readonly cita = input<CitaMedica | null>(null);
  readonly pacientes = input<PacienteCatalogo[]>([]);
  readonly oftalmologos = input<OftalmologoCita[]>([]);

  readonly close = output<void>();
  readonly reprogramada = output<CitaMedica>();

  private readonly agendaService = inject(AgendaService);
  private readonly citasService = inject(CitasService);

  protected readonly fecha = signal('');
  protected readonly fechaMinima = fechaActualInput();

  protected readonly consultando = signal(false);
  protected readonly errorConsulta = signal<string | null>(null);
  protected readonly disponibilidad = signal<DisponibilidadCita | null>(null);

  protected readonly opcionesHorarios = computed(() => {
    const disp = this.disponibilidad();
    if (!disp) {
      return [];
    }
    return horariosReservables(disp.intervalos_disponibles);
  });

  protected readonly horarioSeleccionado = signal<IntervaloCita | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);

  ngOnInit(): void {
    const cita = this.cita();
    this.fecha.set(cita?.fecha ?? fechaActualInput());
  }

  cambiarFecha(event: Event): void {
    this.fecha.set((event.target as HTMLInputElement).value);
    this.limpiarResultadosConsulta();
  }

  consultarDisponibilidad(): void {
    const cita = this.cita();
    const fechaTexto = this.fecha();

    if (!cita || !fechaTexto) {
      this.errorConsulta.set('Selecciona la nueva fecha para reprogramar la cita.');
      return;
    }

    this.consultando.set(true);
    this.errorConsulta.set(null);
    this.disponibilidad.set(null);
    this.horarioSeleccionado.set(null);

    this.agendaService.obtenerDisponibilidad(cita.oftalmologo_id, fechaTexto).subscribe({
      next: (disponibilidad) => {
        this.disponibilidad.set(disponibilidad);
        this.consultando.set(false);
      },
      error: (err: unknown) => {
        this.consultando.set(false);
        this.errorConsulta.set(this.extraerError(err, 'No se pudo consultar la disponibilidad.'));
      },
    });
  }

  seleccionarHorario(intervalo: IntervaloCita): void {
    this.horarioSeleccionado.set(intervalo);
    this.errorGuardar.set(null);
  }

  puedeGuardar(): boolean {
    const cita = this.cita();
    return (
      !!cita &&
      this.fecha() !== '' &&
      !!this.horarioSeleccionado() &&
      !this.consultando() &&
      !this.guardando()
    );
  }

  guardarReprogramacion(): void {
    const cita = this.cita();
    const horario = this.horarioSeleccionado();

    if (!cita || !horario || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.citasService
      .reprogramarCita(cita.id, {
        fecha: this.fecha(),
        hora_inicio: horario.hora_inicio,
      })
      .subscribe({
        next: (citaActualizada) => {
          this.guardando.set(false);
          this.reprogramada.emit(citaActualizada);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorGuardar.set(this.extraerError(err, 'No se pudo reprogramar la cita.'));
        },
      });
  }

  cancelar(): void {
    if (!this.guardando()) {
      this.close.emit();
    }
  }

  formatearHora(hora: string): string {
    return formatearHoraCita(hora);
  }

  formatearFecha(fecha: string): string {
    return formatearFechaCita(fecha);
  }

  nombrePaciente(cita: CitaMedica): string {
    const paciente = this.pacientes().find((p) => p.id === cita.paciente_id);
    if (paciente) {
      return `${paciente.nombres} ${paciente.apellidos}`;
    }
    return `Paciente #${cita.paciente_id}`;
  }

  nombreOftalmologo(cita: CitaMedica): string {
    const oftalmologo = this.oftalmologos().find((o) => o.id === cita.oftalmologo_id);
    if (oftalmologo) {
      return `${oftalmologo.nombres} ${oftalmologo.apellidos}`;
    }
    return `Oftalmólogo #${cita.oftalmologo_id}`;
  }

  private limpiarResultadosConsulta(): void {
    if (this.consultando() || this.guardando()) {
      return;
    }
    this.disponibilidad.set(null);
    this.horarioSeleccionado.set(null);
    this.errorConsulta.set(null);
    this.errorGuardar.set(null);
  }

  private extraerError(err: unknown, mensajeDefault: string): string {
    const detalle = this.leerDetalle(err);
    if (detalle) {
      return detalle;
    }

    switch (this.leerStatus(err)) {
      case 400:
        return 'La solicitud enviada no es válida.';
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para reprogramar citas médicas.';
      case 404:
        return 'La cita solicitada no fue encontrada.';
      case 409:
        return 'El horario seleccionado ya no está disponible.';
      case 422:
        return 'Algunos datos enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return mensajeDefault;
    }
  }

  private leerDetalle(err: unknown): string | null {
    const errObj = err as { error?: { detail?: unknown } } | null;
    const detalle = errObj?.error?.detail;
    return typeof detalle === 'string' && detalle.trim() ? detalle : null;
  }

  private leerStatus(err: unknown): number {
    const errObj = err as { status?: unknown } | null;
    return typeof errObj?.status === 'number' ? errObj.status : 0;
  }
}
