import { Component, HostListener, input, output } from '@angular/core';
import {
  CitaMedica,
  claseEstadoCita,
  esEstadoCitaTerminal,
  etiquetaEstadoCita,
  formatearFechaCita,
  formatearHoraCita,
  OftalmologoCita,
  PacienteCatalogo,
} from '../../models/citas.models';

@Component({
  selector: 'app-cu10-cita-detail-modal',
  imports: [],
  templateUrl: './cita-detail-modal.html',
  styleUrl: './cita-detail-modal.css',
})
export class CitaDetailModal {
  readonly abierto = input(false);
  readonly cita = input<CitaMedica | null>(null);
  readonly pacientes = input<PacienteCatalogo[]>([]);
  readonly oftalmologos = input<OftalmologoCita[]>([]);

  readonly close = output<void>();
  readonly reprogramar = output<CitaMedica>();
  readonly cambiarEstado = output<CitaMedica>();
  readonly cancelar = output<CitaMedica>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto()) {
      this.close.emit();
    }
  }

  esEstadoTerminal(cita: CitaMedica): boolean {
    return esEstadoCitaTerminal(cita.estado);
  }

  clasesEstado(estado: string): string {
    return `cita-detail-modal__badge ${claseEstadoCita(estado)}`;
  }

  etiquetaEstado(estado: string): string {
    return etiquetaEstadoCita(estado);
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

  ciPaciente(cita: CitaMedica): string {
    const paciente = this.pacientes().find((p) => p.id === cita.paciente_id);
    return paciente?.ci ? `CI: ${paciente.ci}` : '—';
  }

  detalleOftalmologo(cita: CitaMedica): string {
    const oftalmologo = this.oftalmologos().find((o) => o.id === cita.oftalmologo_id);
    if (oftalmologo?.especialidad) {
      return oftalmologo.especialidad;
    }
    if (oftalmologo?.matricula) {
      return `Matrícula ${oftalmologo.matricula}`;
    }
    return '—';
  }

  formatearFecha(fecha: string): string {
    return formatearFechaCita(fecha);
  }

  formatearHora(hora: string): string {
    return formatearHoraCita(hora);
  }
}
