import { Component, computed, input } from '@angular/core';
import {
  ResultadoExamenRespuesta,
  fechaDeResultado,
} from '../../models/examenes.models';
import { formatearFechaHora } from '../../../cu17-registrar-tratamientos-recetas/models/tratamientos-recetas.models';

/**
 * Resultado de un examen oftalmológico (CU18) en modo solo lectura.
 *
 * Si `archivo_url` es nulo se omite por completo (no se muestra un hueco).
 */
@Component({
  selector: 'app-resultado-card',
  imports: [],
  templateUrl: './resultado-card.html',
  styleUrl: './resultado-card.css',
})
export class ResultadoCard {
  readonly resultado = input.required<ResultadoExamenRespuesta>();

  protected readonly fechaDeResultado = fechaDeResultado;

  protected readonly fecha = computed(() =>
    formatearFechaHora(fechaDeResultado(this.resultado())),
  );

  protected readonly tieneArchivo = computed(() => {
    const url = this.resultado().archivo_url;
    return typeof url === 'string' && url.trim().length > 0;
  });

  protected nombreArchivo(url: string): string {
    const limpio = url.split('?')[0];
    const partes = limpio.split('/');
    return partes[partes.length - 1] || url;
  }
}
