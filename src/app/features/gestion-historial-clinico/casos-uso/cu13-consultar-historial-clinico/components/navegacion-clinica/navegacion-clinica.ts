import { Component, input, output } from '@angular/core';

/** Sección clínica mostrable en la navegación secundaria. */
export interface SeccionClinica {
  id: string;
  etiqueta: string;
  icono: string;
  /** `null` cuando el contador aún no puede determinarse con certeza. */
  contador: number | null;
}

/**
 * Navegación clínica secundaria (segmented control) para el detalle de una
 * consulta: muestra una sola sección a la vez con icono, contador y acento
 * propio por tipo de información.
 */
@Component({
  selector: 'app-navegacion-clinica',
  imports: [],
  templateUrl: './navegacion-clinica.html',
  styleUrl: './navegacion-clinica.css',
})
export class NavegacionClinica {
  readonly secciones = input.required<ReadonlyArray<SeccionClinica>>();
  readonly activo = input.required<string>();

  readonly cambio = output<string>();

  protected seleccionar(id: string): void {
    if (id !== this.activo()) {
      this.cambio.emit(id);
    }
  }

  protected onKeydown(event: KeyboardEvent, indice: number): void {
    const total = this.secciones().length;
    let destino = indice;

    switch (event.key) {
      case 'ArrowRight':
        destino = (indice + 1) % total;
        break;
      case 'ArrowLeft':
        destino = (indice - 1 + total) % total;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = total - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const seccion = this.secciones()[destino];
    this.seleccionar(seccion.id);
    document.getElementById(this.idTab(seccion.id))?.focus();
  }

  protected idTab(id: string): string {
    return `consulta-tab-${id}`;
  }

  protected idPanel(id: string): string {
    return `consulta-panel-${id}`;
  }
}
