import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-cu11-estado-dialog',
  imports: [],
  templateUrl: './estado-dialog.html',
  styleUrl: './estado-dialog.css',
})
export class EstadoDialog {
  readonly abierto = input(false);
  readonly titulo = input('');
  readonly detalle = input('');
  readonly botonConfirmar = input('');
  readonly activa = input(false);
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly confirm = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto() && !this.procesando()) {
      this.close.emit();
    }
  }

  cancelar(): void {
    if (this.procesando()) {
      return;
    }
    this.close.emit();
  }
}
