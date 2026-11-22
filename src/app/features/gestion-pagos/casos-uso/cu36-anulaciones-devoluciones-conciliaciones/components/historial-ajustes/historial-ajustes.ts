import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  EstadoAjuste,
  HistorialAjustes as HistorialAjustesRespuesta,
  PagoAjuste,
  centavosDeMonto,
  descripcionEstadoAjuste,
  etiquetaEstadoAjuste,
  etiquetaEfectoCaja,
  etiquetaNaturalezaAjuste,
  etiquetaTipoAjuste,
  formatearFechaHora,
  formatearMonto,
  mensajeErrorAjuste,
  puedeConciliarAjuste,
} from '../../models/ajustes-pagos.models';
import { AjustesPagosService } from '../../services/ajustes-pagos.service';

/**
 * Libro de ajustes de un pago (CU36).
 *
 * Lee el libro y, bajo selección explícita, el detalle real de un ajuste. El
 * libro mantiene una única petición en vuelo y ambos consumidores usan
 * generaciones para descartar respuestas tardías. Nunca escribe ni sondea en
 * segundo plano; el contenedor refresca el libro con `recargar()` después de
 * cada operación.
 *
 * Los estados `PENDIENTE_PROVEEDOR` y `DESCONOCIDO` se presentan con los tokens
 * de aviso e información: el dinero todavía no está confirmado y la interfaz no
 * debe sugerir lo contrario.
 */
@Component({
  selector: 'app-historial-ajustes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-ajustes.html',
  styleUrl: './historial-ajustes.css',
})
export class HistorialAjustes {
  readonly pagoId = input.required<number>();
  readonly puedeConciliar = input(false);

  /** Emite el ajuste que el operador quiere conciliar; el padre abre el diálogo. */
  readonly conciliar = output<PagoAjuste>();

  protected readonly historial = signal<HistorialAjustesRespuesta | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ajusteSeleccionadoId = signal<number | null>(null);
  protected readonly detalleAjuste = signal<PagoAjuste | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly errorDetalle = signal<string | null>(null);
  protected readonly accesoDetalleDenegado = signal(false);

  protected readonly etiquetaTipo = etiquetaTipoAjuste;
  protected readonly etiquetaNaturaleza = etiquetaNaturalezaAjuste;
  protected readonly etiquetaEstado = etiquetaEstadoAjuste;
  protected readonly etiquetaEfecto = etiquetaEfectoCaja;
  protected readonly descripcionEstado = descripcionEstadoAjuste;
  protected readonly fechaHora = formatearFechaHora;

  private readonly api = inject(AjustesPagosService);
  private readonly destroyRef = inject(DestroyRef);

  private ultimoPagoConsultado: number | null = null;
  private solicitudEnCurso = false;
  private recargaPendiente = false;
  /** Identifica la consulta vigente para descartar respuestas tardías. */
  private generacion = 0;
  /** Identifica la selección vigente para que una respuesta A no reemplace a B. */
  private generacionDetalle = 0;

  /**
   * El contrato del libro no repite la moneda del pago, pero cada ajuste la
   * trae. Se usa la del primer ajuste como moneda del libro y, si todavía no
   * hay ajustes, el valor por defecto del formateador.
   */
  protected readonly moneda = computed<string>(
    () => this.historial()?.ajustes[0]?.moneda ?? 'BOB',
  );

  /** Más reciente primero; el empate se resuelve por identificador. */
  protected readonly ajustes = computed<PagoAjuste[]>(() => {
    const lista = [...(this.historial()?.ajustes ?? [])];
    return lista.sort((a, b) => {
      const diferencia = this.milisegundos(b.fecha_creacion) - this.milisegundos(a.fecha_creacion);
      return diferencia !== 0 ? diferencia : b.id - a.id;
    });
  });

  constructor() {
    effect(() => {
      const pagoId = this.pagoId();
      if (pagoId === this.ultimoPagoConsultado) {
        return;
      }
      this.reiniciar();
      this.ultimoPagoConsultado = pagoId;
      this.cargar(pagoId);
    });
  }

  /** Refresco explícito solicitado por el contenedor tras una escritura. */
  recargar(): void {
    if (this.solicitudEnCurso) {
      this.recargaPendiente = true;
      return;
    }
    this.cargar(this.pagoId());
  }

  protected textoMonto(valor: string | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return formatearMonto(valor, this.moneda());
  }

  protected estaAbierto(estado: EstadoAjuste): boolean {
    return estado === 'PENDIENTE_PROVEEDOR' || estado === 'DESCONOCIDO';
  }

  /** El signo se presenta aparte para que el importe negativo sea evidente. */
  protected claseSigno(importe: string): string {
    const centavos = centavosDeMonto(importe);
    if (centavos === null) {
      return '';
    }
    if (centavos < 0) {
      return 'ajustes__monto--negativo';
    }
    return centavos > 0 ? 'ajustes__monto--positivo' : '';
  }

  protected claseEstado(estado: EstadoAjuste): string {
    switch (estado) {
      case 'CONFIRMADO':
        return 'ajustes__badge--confirmado';
      case 'PENDIENTE_PROVEEDOR':
        return 'ajustes__badge--pendiente';
      case 'FALLIDO':
        return 'ajustes__badge--fallido';
      case 'CANCELADO':
        return 'ajustes__badge--cancelado';
      default:
        return 'ajustes__badge--desconocido';
    }
  }

  /**
   * Sólo se ofrece conciliar cuando el ajuste lo admite y el operador tiene la
   * función de escritura: sin permiso no se renderiza un botón deshabilitado
   * que anuncie una capacidad que el usuario no posee.
   */
  protected mostrarConciliar(ajuste: PagoAjuste): boolean {
    return this.puedeConciliar() && puedeConciliarAjuste(ajuste);
  }

  protected solicitarConciliacion(ajuste: PagoAjuste): void {
    const detalle =
      this.ajusteSeleccionadoId() === ajuste.id ? this.detalleAjuste() : null;
    const ajusteVigente = detalle ?? ajuste;
    if (!this.mostrarConciliar(ajusteVigente)) {
      return;
    }
    this.conciliar.emit(ajusteVigente);
  }

  protected consultarDetalle(ajusteId: number): void {
    const generacion = ++this.generacionDetalle;
    this.ajusteSeleccionadoId.set(ajusteId);
    this.detalleAjuste.set(null);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    this.accesoDetalleDenegado.set(false);

    this.api
      .consultarAjuste(ajusteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          if (generacion !== this.generacionDetalle) {
            return;
          }
          this.cargandoDetalle.set(false);
          this.detalleAjuste.set(detalle);
        },
        error: (error: unknown) => {
          if (generacion !== this.generacionDetalle) {
            return;
          }
          this.cargandoDetalle.set(false);
          this.accesoDetalleDenegado.set(
            error instanceof HttpErrorResponse && error.status === 403,
          );
          this.errorDetalle.set(
            mensajeErrorAjuste(error, 'No se pudo consultar el detalle del ajuste.'),
          );
        },
      });
  }

  protected reintentarDetalle(): void {
    const ajusteId = this.ajusteSeleccionadoId();
    if (ajusteId === null || this.accesoDetalleDenegado()) {
      return;
    }
    this.consultarDetalle(ajusteId);
  }

  private cargar(pagoId: number): void {
    if (this.solicitudEnCurso) {
      return;
    }

    const generacion = this.generacion;
    this.solicitudEnCurso = true;
    this.cargando.set(true);
    this.error.set(null);

    this.api
      .consultarHistorialAjustes(pagoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (historial) => {
          if (generacion !== this.generacion) {
            return;
          }
          this.solicitudEnCurso = false;
          this.cargando.set(false);
          this.error.set(null);
          this.historial.set(historial);
          this.ejecutarRecargaPendiente(pagoId);
        },
        error: (error: unknown) => {
          if (generacion !== this.generacion) {
            return;
          }
          this.solicitudEnCurso = false;
          this.cargando.set(false);
          this.historial.set(null);
          this.error.set(
            mensajeErrorAjuste(error, 'No se pudo consultar el libro de ajustes del pago.'),
          );
          this.ejecutarRecargaPendiente(pagoId);
        },
      });
  }

  /** Invalida la consulta vigente y limpia el estado del pago anterior. */
  private reiniciar(): void {
    this.generacion += 1;
    this.generacionDetalle += 1;
    this.solicitudEnCurso = false;
    this.recargaPendiente = false;
    this.historial.set(null);
    this.cargando.set(false);
    this.error.set(null);
    this.ajusteSeleccionadoId.set(null);
    this.detalleAjuste.set(null);
    this.cargandoDetalle.set(false);
    this.errorDetalle.set(null);
    this.accesoDetalleDenegado.set(false);
  }

  private ejecutarRecargaPendiente(pagoId: number): void {
    if (!this.recargaPendiente) {
      return;
    }
    this.recargaPendiente = false;
    this.cargar(pagoId);
  }

  private milisegundos(iso: string): number {
    const valor = Date.parse(iso);
    return Number.isNaN(valor) ? 0 : valor;
  }
}
