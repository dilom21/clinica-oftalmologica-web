import { Component, computed, input, signal } from '@angular/core';
import {
  DetalleRecetaRespuesta,
  RecetaRespuesta,
  formatearFechaHora,
} from '../../models/tratamientos-recetas.models';

/**
 * Tarjeta/acordeón de una receta registrada (CU17).
 *
 * Mantiene el detalle plegado por defecto para que varias recetas puedan
 * escanearse rápidamente sin mostrar todos los medicamentos a la vez.
 */
@Component({
  selector: 'app-receta-card',
  imports: [],
  templateUrl: './receta-card.html',
  styleUrl: './receta-card.css',
})
export class RecetaCard {
  readonly receta = input.required<RecetaRespuesta>();
  readonly compacta = input(false);

  protected readonly abierto = signal(false);

  protected readonly cantidadMedicamentos = computed(() => this.receta().detalles.length);

  protected readonly fechaEmision = computed(() =>
    formatearFechaHora(this.receta().fecha_emision),
  );

  protected readonly panelId = computed(() => `receta-panel-${this.receta().id}`);

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  protected camposDetalle(detalle: DetalleRecetaRespuesta): ReadonlyArray<{
    etiqueta: string;
    valor: string;
  }> {
    return [
      { etiqueta: 'Presentación', valor: detalle.presentacion ?? '—' },
      { etiqueta: 'Dosis', valor: detalle.dosis ?? '—' },
      { etiqueta: 'Frecuencia', valor: detalle.frecuencia ?? '—' },
      { etiqueta: 'Duración', valor: detalle.duracion ?? '—' },
    ];
  }
}
