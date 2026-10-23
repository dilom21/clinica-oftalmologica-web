import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfirmarPagoDialog } from '../confirmar-pago-dialog/confirmar-pago-dialog';
import { EstadoNotificacion } from '../estado-notificacion/estado-notificacion';
import {
  PagoAdministrativo,
  PermisosPagos,
  etiquetaEstadoPago,
  etiquetaMetodoPago,
  formatearFechaHora,
  formatearMonto,
  mensajeErrorPago,
  puedeDescargarComprobante,
  referenciaPago,
  requiereConfirmacion,
} from '../../models/pagos-administrativos.models';
import { ComprobantePagoService } from '../../services/comprobante-pago.service';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';

/**
 * Panel de detalle de un pago. Concentra las acciones permitidas por el
 * backend (confirmación, comprobante PDF y estado del correo) para que
 * historial y confirmaciones compartan una única implementación.
 */
@Component({
  selector: 'app-detalle-pago',
  standalone: true,
  imports: [CommonModule, EstadoNotificacion, ConfirmarPagoDialog],
  templateUrl: './detalle-pago.html',
  styleUrl: './detalle-pago.css',
})
export class DetallePago {
  readonly pago = input.required<PagoAdministrativo>();
  readonly nombrePaciente = input('Paciente');
  readonly permisos = input<PermisosPagos>({
    ver: false,
    registrar: false,
    confirmar: false,
  });

  readonly pagoActualizado = output<PagoAdministrativo>();
  readonly recargar = output<void>();

  protected readonly dialogoAbierto = signal(false);
  protected readonly procesando = signal(false);
  protected readonly errorConfirmacion = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly descargando = signal(false);
  protected readonly errorDescarga = signal<string | null>(null);

  protected readonly referencia = referenciaPago;
  protected readonly monto = formatearMonto;
  protected readonly metodo = etiquetaMetodoPago;
  protected readonly estado = etiquetaEstadoPago;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly comprobanteDisponible = puedeDescargarComprobante;

  protected readonly pendienteConfirmacion = computed(() =>
    requiereConfirmacion(this.pago()),
  );

  protected readonly puedeConfirmar = computed(
    () => this.permisos().confirmar && this.pendienteConfirmacion(),
  );

  private readonly api = inject(PagosAdministrativosService);
  private readonly comprobantes = inject(ComprobantePagoService);
  private readonly destroyRef = inject(DestroyRef);

  protected abrirConfirmacion(): void {
    if (!this.puedeConfirmar() || this.procesando()) {
      return;
    }
    this.errorConfirmacion.set(null);
    this.dialogoAbierto.set(true);
  }

  protected cerrarConfirmacion(): void {
    if (this.procesando()) {
      return;
    }
    this.dialogoAbierto.set(false);
    this.errorConfirmacion.set(null);
  }

  protected confirmarPago(): void {
    if (this.procesando() || !this.puedeConfirmar()) {
      return;
    }
    const pago = this.pago();
    this.procesando.set(true);
    this.errorConfirmacion.set(null);
    this.exito.set(null);

    this.api
      .confirmarPago(pago.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.procesando.set(false);
          this.dialogoAbierto.set(false);
          this.exito.set(
            actualizado.estado === 'APROBADO'
              ? `Pago ${referenciaPago(actualizado.id)} confirmado y aprobado.`
              : `El pago quedó en estado ${etiquetaEstadoPago(actualizado.estado)}.`,
          );
          this.pagoActualizado.emit(actualizado);
        },
        error: (error: unknown) => {
          this.procesando.set(false);
          const estado = error instanceof HttpErrorResponse ? error.status : -1;
          const mensaje = mensajeErrorPago(
            error,
            'No se pudo confirmar el pago.',
          );
          if (estado === 409 || estado === 404) {
            this.dialogoAbierto.set(false);
            this.errorConfirmacion.set(mensaje);
            this.recargar.emit();
            return;
          }
          this.errorConfirmacion.set(mensaje);
        },
      });
  }

  protected descargarComprobante(): void {
    const pago = this.pago();
    if (this.descargando() || !puedeDescargarComprobante(pago)) {
      return;
    }
    this.descargando.set(true);
    this.errorDescarga.set(null);

    this.comprobantes
      .descargar(pago.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.descargando.set(false),
        error: (error: unknown) => {
          this.descargando.set(false);
          this.errorDescarga.set(
            mensajeErrorPago(error, 'No se pudo descargar el comprobante PDF.'),
          );
        },
      });
  }

  protected claseEstado(): string {
    switch (this.pago().estado) {
      case 'APROBADO':
        return 'detalle__badge--aprobado';
      case 'PENDIENTE':
        return 'detalle__badge--pendiente';
      case 'RECHAZADO':
      case 'ANULADO':
        return 'detalle__badge--negativo';
      default:
        return 'detalle__badge--neutro';
    }
  }
}
