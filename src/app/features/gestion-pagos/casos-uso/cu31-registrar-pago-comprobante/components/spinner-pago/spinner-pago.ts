import { Component, input } from '@angular/core';

/** Duración de una vuelta completa del anillo de segmentos. */
const DURACION_VUELTA_MS = 1000;
/** Segmentos redondeados que componen el anillo. */
const TOTAL_SEGMENTOS = 12;
/** Radio en `rem` desde el centro hasta cada segmento. */
const RADIO_SEGMENTO_REM = 0.95;

/**
 * Overlay de carga del registro de pagos (CU31).
 *
 * Depende exclusivamente de la petición HTTP de registro: nunca espera al
 * envío del comprobante por correo, que el backend procesa en segundo plano.
 * Se muestra centrado sobre el formulario del cobro y bloquea la interacción
 * con él mientras la solicitud está en vuelo.
 */
@Component({
  selector: 'app-spinner-pago',
  standalone: true,
  templateUrl: './spinner-pago.html',
  styleUrl: './spinner-pago.css',
})
export class SpinnerPago {
  readonly mensaje = input('Registrando pago…');
  readonly detalle = input(
    'Estamos procesando tu solicitud. No vuelvas a pulsar el botón.',
  );

  protected readonly segmentos = Array.from(
    { length: TOTAL_SEGMENTOS },
    (_, indice) => indice,
  );

  /** Posición fija de cada segmento alrededor del centro del anillo. */
  protected transformacion(indice: number): string {
    const angulo = (indice * 360) / TOTAL_SEGMENTOS;
    return `translate(-50%, -50%) rotate(${angulo}deg) translateY(-${RADIO_SEGMENTO_REM}rem)`;
  }

  /** Desfase negativo para que el brillo recorra el anillo de forma continua. */
  protected retardo(indice: number): string {
    const desfase = (indice * DURACION_VUELTA_MS) / TOTAL_SEGMENTOS;
    return `-${(desfase / 1000).toFixed(3)}s`;
  }
}
