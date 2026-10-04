import { Component, input } from '@angular/core';
import { MetricasHistorial } from '../../models/historial-clinico.models';

/** Tarjetas compactas de resumen del expediente clínico (CU13). */
@Component({
  selector: 'app-historial-metricas',
  imports: [],
  templateUrl: './historial-metricas.html',
  styleUrl: './historial-metricas.css',
})
export class HistorialMetricas {
  readonly metricas = input.required<MetricasHistorial>();
  readonly cargando = input(false);

  protected formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(valor);
  }
}
