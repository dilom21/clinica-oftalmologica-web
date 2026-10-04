import { Component, effect, input, signal, untracked } from '@angular/core';
import {
  IndicacionRespuesta,
  formatearFechaHora,
} from '../../models/tratamientos-recetas.models';

/**
 * Indicaciones registradas (CU17) presentadas como línea de tiempo ligera.
 */
@Component({
  selector: 'app-indicacion-list',
  imports: [],
  templateUrl: './indicacion-list.html',
  styleUrl: './indicacion-list.css',
})
export class IndicacionList {
  readonly indicaciones = input.required<IndicacionRespuesta[]>();
  readonly compacto = input(false);

  protected readonly formatearFechaHora = formatearFechaHora;
  protected readonly expandida = signal(false);

  private readonly reiniciarExpansionAlCambiar = effect(() => {
    this.indicaciones();
    untracked(() => this.expandida.set(false));
  });

  protected esDescripcionLarga(descripcion: string): boolean {
    return this.compacto() && descripcion.trim().length > 220;
  }

  protected alternarExpansion(): void {
    this.expandida.update((valor) => !valor);
  }
}
