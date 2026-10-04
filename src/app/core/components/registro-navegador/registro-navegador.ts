import { Component, input, output } from '@angular/core';

/**
 * Navegador manual compacto para recorrer registros clínicos sin apilarlos.
 * El contenido visible se proyecta desde la sección propietaria para poder
 * reutilizar el mismo control con diagnósticos, tratamientos, indicaciones y
 * recetas.
 */
@Component({
  selector: 'app-registro-navegador',
  imports: [],
  templateUrl: './registro-navegador.html',
  styleUrl: './registro-navegador.css',
})
export class RegistroNavegador {
  readonly etiqueta = input.required<string>();
  readonly indice = input.required<number>();
  readonly total = input.required<number>();

  readonly anterior = output<void>();
  readonly siguiente = output<void>();

  protected irAnterior(): void {
    if (this.indice() > 0) {
      this.anterior.emit();
    }
  }

  protected irSiguiente(): void {
    if (this.indice() < this.total() - 1) {
      this.siguiente.emit();
    }
  }
}
