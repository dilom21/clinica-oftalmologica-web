import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { CitasService } from '../../services/citas.service';
import {
  CitaMedica,
  etiquetaEstadoCita,
  formatearFechaCita,
  formatearHoraCita,
  PacienteCatalogo,
} from '../../models/citas.models';

export type ModoEstadoCitaModal = 'cambiar' | 'cancelar';

interface OpcionEstado {
  estado: string;
  descripcion: string;
}

const OPCIONES_ESTADO: OpcionEstado[] = [
  { estado: 'PROGRAMADA', descripcion: 'Cita registrada pendiente de confirmación.' },
  { estado: 'CONFIRMADA', descripcion: 'Cita confirmada con el paciente.' },
  { estado: 'EN_ESPERA', descripcion: 'El paciente se encuentra en espera de atención.' },
  { estado: 'ATENDIDA', descripcion: 'Atención médica completada.' },
  { estado: 'NO_ASISTIO', descripcion: 'El paciente no asistió a la cita.' },
];

@Component({
  selector: 'app-cu10-estado-modal',
  imports: [],
  templateUrl: './estado-modal.html',
  styleUrl: './estado-modal.css',
})
export class EstadoCitaModal implements OnInit {
  readonly abierto = input(false);
  readonly cita = input<CitaMedica | null>(null);
  readonly pacientes = input<PacienteCatalogo[]>([]);
  readonly modo = input<ModoEstadoCitaModal>('cambiar');

  readonly close = output<void>();
  readonly actualizada = output<CitaMedica>();

  private readonly citasService = inject(CitasService);

  protected readonly estadoSeleccionado = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly opciones: OpcionEstado[] = OPCIONES_ESTADO;

  ngOnInit(): void {
    this.estadoSeleccionado.set(this.cita()?.estado ?? '');
  }

  esModoCancelar(): boolean {
    return this.modo() === 'cancelar';
  }

  puedeCambiar(): boolean {
    return (
      this.estadoSeleccionado() !== '' &&
      this.estadoSeleccionado() !== this.cita()?.estado &&
      !this.guardando()
    );
  }

  seleccionarEstado(estado: string): void {
    if (this.guardando()) {
      return;
    }
    this.estadoSeleccionado.set(estado);
    this.error.set(null);
  }

  confirmar(): void {
    const cita = this.cita();
    if (!cita || this.guardando()) {
      return;
    }

    const nuevoEstado = this.esModoCancelar() ? 'CANCELADA' : this.estadoSeleccionado();
    if (!nuevoEstado || (this.esModoCancelar() === false && nuevoEstado === cita.estado)) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.citasService.cambiarEstadoCita(cita.id, nuevoEstado).subscribe({
      next: (citaActualizada) => {
        this.guardando.set(false);
        this.actualizada.emit(citaActualizada);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(this.extraerError(err, 'No se pudo actualizar el estado de la cita.'));
      },
    });
  }

  cancelar(): void {
    if (!this.guardando()) {
      this.close.emit();
    }
  }

  etiquetaEstado(estado: string): string {
    return etiquetaEstadoCita(estado);
  }

  formatearFecha(fecha: string): string {
    return formatearFechaCita(fecha);
  }

  formatearHora(hora: string): string {
    return formatearHoraCita(hora);
  }

  nombrePaciente(cita: CitaMedica): string {
    const paciente = this.pacientes().find((p) => p.id === cita.paciente_id);
    if (paciente) {
      return `${paciente.nombres} ${paciente.apellidos}`;
    }
    return `Paciente #${cita.paciente_id}`;
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
        return 'No tienes permisos para cambiar el estado de las citas.';
      case 404:
        return 'La cita solicitada no fue encontrada.';
      case 409:
        return 'El cambio de estado no es válido para esta cita.';
      case 422:
        return 'El estado enviado no es válido.';
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
