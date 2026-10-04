import { Component, input } from '@angular/core';
import { DiagnosticoRespuesta } from '../../../cu16-registrar-diagnostico/models/diagnostico.models';

/**
 * Presenta un diagnóstico clínico (CU16) como tarjeta compacta de solo lectura.
 * Se reutiliza tanto en el listado como en el detalle de la consulta.
 */
@Component({
  selector: 'app-diagnostico-chip',
  imports: [],
  templateUrl: './diagnostico-chip.html',
  styleUrl: './diagnostico-chip.css',
})
export class DiagnosticoChip {
  readonly diagnostico = input.required<DiagnosticoRespuesta>();

  protected etiquetaEstado(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  protected formatearFecha(fecha: string): string {
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(valor);
  }
}
