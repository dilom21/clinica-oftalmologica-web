import { Component, input } from '@angular/core';
import {
  TratamientoRespuesta,
  formatearFecha,
} from '../../models/tratamientos-recetas.models';

/**
 * Listado compacto de tratamientos registrados (CU17) en modo solo lectura.
 */
@Component({
  selector: 'app-tratamiento-list',
  imports: [],
  templateUrl: './tratamiento-list.html',
  styleUrl: './tratamiento-list.css',
})
export class TratamientoList {
  readonly tratamientos = input.required<TratamientoRespuesta[]>();

  protected readonly formatearFecha = formatearFecha;

  protected rangoFechas(tratamiento: TratamientoRespuesta): string {
    const inicio = formatearFecha(tratamiento.fecha_inicio);
    const fin = formatearFecha(tratamiento.fecha_fin);

    if (inicio === '—' && fin === '—') {
      return 'Sin fechas definidas';
    }
    if (fin === '—') {
      return `Desde ${inicio}`;
    }
    if (inicio === '—') {
      return `Hasta ${fin}`;
    }
    return `${inicio} → ${fin}`;
  }
}
