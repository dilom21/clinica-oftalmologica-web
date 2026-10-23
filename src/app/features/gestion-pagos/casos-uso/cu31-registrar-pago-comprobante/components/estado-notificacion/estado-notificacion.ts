import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, timer } from 'rxjs';

import {
  EstadoNotificacion as EstadoNotificacionPago,
  EstadoPago,
  MAX_REINTENTOS_UI,
  NotificacionPago,
  errorNotificacionVisible,
  etiquetaEstadoNotificacion,
  formatearFechaHora,
  mensajeErrorPago,
  notificacionEnSeguimiento,
  notificacionReintentable,
} from '../../models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';

/**
 * Intervalo del sondeo del estado del correo. Moderado a propósito: el envío
 * del comprobante es una operación de segundo plano y no debe saturar el
 * backend ni la base tenant.
 */
export const INTERVALO_SEGUIMIENTO_MS = 4000;

/**
 * Consultas automáticas antes de detener el seguimiento y ofrecer al usuario
 * una actualización manual (sin reenviar el correo).
 */
export const MAX_CONSULTAS_SEGUIMIENTO = 15;

/**
 * Estado real del comprobante por correo (Resend) de un pago aprobado.
 *
 * Sólo consulta y solicita reintentos al backend; nunca afirma que el correo
 * fue entregado si el estado devuelto no lo confirma. Mientras el estado sea
 * `PENDIENTE` o `PROCESANDO` refresca el GET periódicamente; el POST de
 * reintento siempre es una acción explícita del usuario.
 */
@Component({
  selector: 'app-estado-notificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estado-notificacion.html',
  styleUrl: './estado-notificacion.css',
})
export class EstadoNotificacion {
  readonly pagoId = input.required<number>();
  readonly estadoPago = input<EstadoPago>('PENDIENTE');
  readonly notificacionInicial = input<NotificacionPago | null>(null);
  readonly puedeReintentar = input(false);

  protected readonly notificacion = signal<NotificacionPago | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sinNotificacion = signal(false);
  protected readonly reintentando = signal(false);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly seguimiento = signal(false);
  protected readonly errorSeguimiento = signal<string | null>(null);
  protected readonly consultasSeguimiento = signal(0);
  protected readonly seguimientoAgotado = signal(false);
  protected readonly maxReintentos = MAX_REINTENTOS_UI;
  protected readonly etiquetaEstado = etiquetaEstadoNotificacion;

  /** Error real del proveedor, sin la marca informativa de EMAIL_TEST. */
  protected readonly errorVisible = computed(() =>
    errorNotificacionVisible(this.notificacion()?.ultimo_error),
  );

  /** El backend todavía puede cambiar el resultado: vale la pena seguir. */
  protected readonly enSeguimiento = computed(() => {
    const actual = this.notificacion();
    return !!actual && notificacionEnSeguimiento(actual.estado);
  });

  protected fechaOpcional(iso: string | null): string {
    return iso ? formatearFechaHora(iso) : '—';
  }

  private readonly api = inject(PagosAdministrativosService);
  private readonly destroyRef = inject(DestroyRef);
  private ultimoPagoConsultado: string | null = null;
  private temporizador: Subscription | null = null;
  private solicitudEnCurso = false;
  /** Identifica la consulta vigente para descartar respuestas tardías. */
  private generacion = 0;

  constructor() {
    effect(() => {
      const pagoId = this.pagoId();
      const estadoPago = this.estadoPago();
      const inicial = this.notificacionInicial();

      if (estadoPago !== 'APROBADO') {
        this.reiniciar();
        return;
      }

      const clave = `${pagoId}`;
      if (clave === this.ultimoPagoConsultado) {
        return;
      }

      this.reiniciar();
      this.ultimoPagoConsultado = clave;
      this.notificacion.set(inicial);
      this.cargar(pagoId);
    });

    this.destroyRef.onDestroy(() => this.detenerTemporizador());
  }

  /** Actualización manual: sólo GET, nunca reenvía el correo. */
  protected consultar(): void {
    this.consultasSeguimiento.set(0);
    this.seguimientoAgotado.set(false);
    this.cargar(this.pagoId());
  }

  protected reintentar(): void {
    const actual = this.notificacion();
    if (
      this.reintentando() ||
      !this.puedeReintentar() ||
      !notificacionReintentable(actual)
    ) {
      return;
    }

    this.reintentando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    this.errorSeguimiento.set(null);

    this.api
      .reintentarNotificacion(this.pagoId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notificacion) => {
          this.reintentando.set(false);
          this.notificacion.set(notificacion);
          this.mensaje.set(
            'Reintento solicitado. El comprobante quedó en cola para su envío; el resultado depende del proveedor.',
          );
          this.consultasSeguimiento.set(0);
          this.seguimientoAgotado.set(false);
          this.programarSeguimiento(this.pagoId(), notificacion);
        },
        error: (error: unknown) => {
          this.reintentando.set(false);
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.sinNotificacion.set(true);
            this.notificacion.set(null);
          }
          this.error.set(
            mensajeErrorPago(error, 'No se pudo solicitar el reenvío del comprobante.'),
          );
        },
      });
  }

  protected puedeReintentarAhora(notificacion: NotificacionPago): boolean {
    return this.puedeReintentar() && notificacionReintentable(notificacion);
  }

  protected limiteAlcanzado(notificacion: NotificacionPago): boolean {
    return (
      notificacion.intentos >= MAX_REINTENTOS_UI &&
      notificacion.estado !== 'ACEPTADO_POR_PROVEEDOR' &&
      notificacion.estado !== 'ENTREGADO'
    );
  }

  protected claseEstado(estado: EstadoNotificacionPago): string {
    switch (estado) {
      case 'ENTREGADO':
        return 'notificacion__estado--entregado';
      case 'FALLIDO':
        return 'notificacion__estado--fallido';
      case 'PROCESANDO':
      case 'ACEPTADO_POR_PROVEEDOR':
        return 'notificacion__estado--proceso';
      default:
        return 'notificacion__estado--pendiente';
    }
  }

  protected descripcionError(codigo: string | null): string {
    if (!codigo) {
      return 'Sin detalle del proveedor.';
    }
    if (codigo === 'DESTINATARIO_NO_DISPONIBLE') {
      return 'El paciente no tiene un correo electrónico válido registrado.';
    }
    if (codigo === 'ENTREGA_FALLIDA') {
      return 'El proveedor no pudo entregar el mensaje.';
    }
    return codigo;
  }

  /**
   * Consulta el endpoint dedicado de notificación. `automatico` identifica los
   * sondeos de fondo: no muestran el estado de carga global ni descartan los
   * datos ya recibidos si fallan.
   */
  private cargar(pagoId: number, automatico = false): void {
    if (this.solicitudEnCurso) {
      return;
    }

    const generacion = this.generacion;
    this.solicitudEnCurso = true;
    this.detenerTemporizador();

    if (automatico) {
      this.seguimiento.set(true);
    } else {
      this.cargando.set(true);
      this.error.set(null);
      this.errorSeguimiento.set(null);
      this.sinNotificacion.set(false);
      this.mensaje.set(null);
    }

    this.api
      .consultarNotificacion(pagoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notificacion) => {
          if (generacion !== this.generacion) {
            return;
          }
          this.solicitudEnCurso = false;
          this.cargando.set(false);
          this.error.set(null);
          this.sinNotificacion.set(false);
          this.notificacion.set(notificacion);
          this.programarSeguimiento(pagoId, notificacion);
        },
        error: (error: unknown) => {
          if (generacion !== this.generacion) {
            return;
          }
          this.solicitudEnCurso = false;
          this.cargando.set(false);
          this.detenerSeguimiento();

          const detalle = mensajeErrorPago(
            error,
            'No se pudo consultar el estado del comprobante por correo.',
          );

          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.notificacion.set(null);
            this.sinNotificacion.set(true);
            this.seguimientoAgotado.set(false);
            return;
          }

          if (automatico) {
            this.errorSeguimiento.set(detalle);
            this.seguimientoAgotado.set(true);
            return;
          }

          this.error.set(detalle);
        },
      });
  }

  /**
   * Programa el siguiente sondeo sólo tras resolver la consulta anterior: hay
   * como máximo una petición en vuelo y no se solapan respuestas.
   */
  private programarSeguimiento(
    pagoId: number,
    notificacion: NotificacionPago,
  ): void {
    this.detenerTemporizador();

    if (!notificacionEnSeguimiento(notificacion.estado)) {
      this.seguimiento.set(false);
      this.seguimientoAgotado.set(false);
      this.errorSeguimiento.set(null);
      return;
    }

    if (this.consultasSeguimiento() >= MAX_CONSULTAS_SEGUIMIENTO) {
      this.seguimiento.set(false);
      this.seguimientoAgotado.set(true);
      return;
    }

    this.seguimiento.set(true);
    this.temporizador = timer(INTERVALO_SEGUIMIENTO_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.temporizador = null;
        this.consultasSeguimiento.update((valor) => valor + 1);
        this.cargar(pagoId, true);
      });
  }

  private detenerSeguimiento(): void {
    this.detenerTemporizador();
    this.seguimiento.set(false);
  }

  private detenerTemporizador(): void {
    this.temporizador?.unsubscribe();
    this.temporizador = null;
  }

  /** Invalida la consulta vigente y limpia el estado de seguimiento. */
  private reiniciar(): void {
    this.detenerTemporizador();
    this.generacion += 1;
    this.solicitudEnCurso = false;
    this.ultimoPagoConsultado = null;
    this.consultasSeguimiento.set(0);
    this.seguimiento.set(false);
    this.seguimientoAgotado.set(false);
    this.errorSeguimiento.set(null);
    this.error.set(null);
    this.cargando.set(false);
    this.sinNotificacion.set(false);
    this.notificacion.set(null);
    this.mensaje.set(null);
    this.reintentando.set(false);
  }
}
