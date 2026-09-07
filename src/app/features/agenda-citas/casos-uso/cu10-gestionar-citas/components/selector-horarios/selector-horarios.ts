import { Component, input, output } from '@angular/core';
import {
  formatearHoraCita,
  formatearFechaCita,
  IntervaloCita,
} from '../../models/citas.models';

@Component({
  selector: 'app-cu10-selector-horarios',
  imports: [],
  templateUrl: './selector-horarios.html',
  styleUrl: './selector-horarios.css',
})
export class SelectorHorarios {
  readonly opciones = input<IntervaloCita[]>([]);
  readonly fecha = input('');
  readonly seleccionado = input<IntervaloCita | null>(null);
  readonly deshabilitado = input(false);

  readonly seleccionar = output<IntervaloCita>();

  esSeleccionado(opcion: IntervaloCita): boolean {
    const actual = this.seleccionado();
    return (
      !!actual &&
      actual.hora_inicio === opcion.hora_inicio &&
      actual.hora_fin === opcion.hora_fin
    );
  }

  formatearHora(hora: string): string {
    return formatearHoraCita(hora);
  }

  formatearFecha(fecha: string): string {
    return formatearFechaCita(fecha);
  }
}
