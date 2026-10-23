import { CommonModule } from '@angular/common';
import { Component, HostListener, input, output } from '@angular/core';

import {
  PagoAdministrativo,
  etiquetaMetodoPago,
  formatearFechaHora,
  formatearMonto,
  referenciaPago,
} from '../../models/pagos-administrativos.models';

/** Diálogo de confirmación explícita de transferencias y QR. */
@Component({
  selector: 'app-confirmar-pago-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-pago-dialog.html',
  styleUrl: './confirmar-pago-dialog.css',
})
export class ConfirmarPagoDialog {
  readonly pago = input.required<PagoAdministrativo>();
  readonly nombrePaciente = input('Paciente');
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  protected readonly referencia = referenciaPago;
  protected readonly monto = formatearMonto;
  protected readonly metodo = etiquetaMetodoPago;
  protected readonly fechaHora = formatearFechaHora;

  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void {
    if (!this.procesando()) {
      this.cancelar.emit();
    }
  }

  protected cerrarAlFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget && !this.procesando()) {
      this.cancelar.emit();
    }
  }
}
