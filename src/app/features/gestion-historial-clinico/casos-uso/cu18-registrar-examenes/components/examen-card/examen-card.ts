import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { RegistroNavegador } from '../../../../../../core/components/registro-navegador/registro-navegador';
import { formatearFechaHora } from '../../../cu17-registrar-tratamientos-recetas/models/tratamientos-recetas.models';
import {
  ExamenOftalmologicoRespuesta,
  ResultadoExamenRespuesta,
  cantidadResultadosDe,
} from '../../models/examenes.models';
import { ResultadoCard } from '../resultado-card/resultado-card';

/**
 * Examen oftalmológico (CU18) con sus resultados.
 *
 * Es autocontenido: además de los datos del examen muestra el navegador de
 * resultados, de modo que CU18 y CU13 pueden reutilizarlo sin duplicar la
 * lógica de navegación.
 */
@Component({
  selector: 'app-examen-card',
  imports: [RegistroNavegador, ResultadoCard],
  templateUrl: './examen-card.html',
  styleUrl: './examen-card.css',
})
export class ExamenCard {
  readonly examen = input.required<ExamenOftalmologicoRespuesta>();
  /** `null` cuando los resultados aún no se han solicitado. */
  readonly resultados = input<ReadonlyArray<ResultadoExamenRespuesta> | null>(null);
  readonly cargandoResultados = input(false);
  readonly errorResultados = input<string | null>(null);
  readonly mostrarResultados = input(true);

  readonly reintentarResultados = output<void>();

  protected readonly indiceResultado = signal(0);

  /** Reinicia la navegación cuando llegan nuevos resultados. */
  private readonly reiniciarAlCambiar = effect(() => {
    this.resultados();
    untracked(() => this.indiceResultado.set(0));
  });

  protected readonly listaResultados = computed(
    () => this.resultados() ?? [],
  );

  protected readonly cantidadResultados = computed(() =>
    cantidadResultadosDe(this.examen(), this.resultados()),
  );

  protected readonly fechaSolicitud = computed(() =>
    formatearFechaHora(this.examen().fecha_solicitud),
  );

  protected readonly resultadoActual = computed(
    () => this.listaResultados()[this.indiceResultado()] ?? null,
  );

  protected anteriorResultado(): void {
    this.indiceResultado.update((actual) => Math.max(actual - 1, 0));
  }

  protected siguienteResultado(): void {
    this.indiceResultado.update((actual) =>
      Math.min(actual + 1, this.listaResultados().length - 1),
    );
  }

  protected etiquetaEstado(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }
}
