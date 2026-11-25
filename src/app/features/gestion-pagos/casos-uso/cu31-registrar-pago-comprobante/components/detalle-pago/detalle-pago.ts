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
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

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
import { DialogoAnularPago } from '../../../cu36-anulaciones-devoluciones-conciliaciones/components/dialogo-anular-pago/dialogo-anular-pago';
import { DialogoConciliarAjuste } from '../../../cu36-anulaciones-devoluciones-conciliaciones/components/dialogo-conciliar-ajuste/dialogo-conciliar-ajuste';
import { DialogoCorregirPago } from '../../../cu36-anulaciones-devoluciones-conciliaciones/components/dialogo-corregir-pago/dialogo-corregir-pago';
import { DialogoReembolsoPago } from '../../../cu36-anulaciones-devoluciones-conciliaciones/components/dialogo-reembolso-pago/dialogo-reembolso-pago';
import { HistorialAjustes } from '../../../cu36-anulaciones-devoluciones-conciliaciones/components/historial-ajustes/historial-ajustes';
import {
  AnularPagoSolicitud,
  ConciliarAjusteSolicitud,
  CorregirPagoSolicitud,
  EstadoAjuste,
  PagoAjuste,
  ReembolsarPagoSolicitud,
  generarClaveIdempotenciaAjuste,
  mensajeErrorAjuste,
  puedeAnularPago,
  puedeCorregirPago,
  puedeReembolsarPago,
} from '../../../cu36-anulaciones-devoluciones-conciliaciones/models/ajustes-pagos.models';
import { AjustesPagosService } from '../../../cu36-anulaciones-devoluciones-conciliaciones/services/ajustes-pagos.service';

/** Operaciones del CU36 que exigen `Idempotency-Key`. */
type OperacionAjuste = 'anulacion' | 'correccion' | 'devolucion';

/**
 * Desenlace real informado por el servidor. Se guarda el estado del ajuste y
 * el importe que devolvió el backend, nunca un valor calculado en el cliente.
 */
interface ResultadoAjuste {
  tono: 'exito' | 'aviso' | 'error';
  codigo: EstadoAjuste;
  importe: string;
}

/**
 * Panel de detalle de un pago. Concentra las acciones permitidas por el
 * backend (confirmación, comprobante PDF, estado del correo) y, desde CU36,
 * las operaciones de dinero sobre lo ya capturado: anular, corregir, devolver
 * y conciliar.
 *
 * El permiso de escritura del CU36 es el mismo `registrar` de `Gestionar
 * pagos`: no se inventan funciones nuevas. Toda escritura se confirma en un
 * diálogo, reutiliza la clave de idempotencia sólo para el mismo cuerpo y
 * ramifica por el `estado` devuelto: un 200 con `PENDIENTE_PROVEEDOR` o
 * `DESCONOCIDO` jamás se presenta como dinero confirmado.
 */
@Component({
  selector: 'app-detalle-pago',
  standalone: true,
  imports: [
    CommonModule,
    EstadoNotificacion,
    ConfirmarPagoDialog,
    HistorialAjustes,
    DialogoAnularPago,
    DialogoCorregirPago,
    DialogoReembolsoPago,
    DialogoConciliarAjuste,
  ],
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
  /** Hides all operational controls when embedded in a read-only consultation. */
  readonly soloLectura = input(false);
  /** Variante de presentación optativa; CU31 conserva su diseño por defecto. */
  readonly compacto = input(false);

  readonly pagoActualizado = output<PagoAdministrativo>();
  readonly recargar = output<void>();

  protected readonly dialogoAbierto = signal(false);
  protected readonly procesando = signal(false);
  protected readonly errorConfirmacion = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly descargando = signal(false);
  protected readonly errorDescarga = signal<string | null>(null);

  protected readonly dialogoAnular = signal(false);
  protected readonly dialogoCorregir = signal(false);
  protected readonly dialogoReembolso = signal(false);
  protected readonly dialogoConciliar = signal(false);
  protected readonly procesandoAjuste = signal(false);
  protected readonly errorOperacion = signal<string | null>(null);
  protected readonly ajusteSeleccionado = signal<PagoAjuste | null>(null);
  protected readonly resultadoOperacion = signal<ResultadoAjuste | null>(null);

  protected readonly referencia = referenciaPago;
  protected readonly monto = formatearMonto;
  protected readonly metodo = etiquetaMetodoPago;
  protected readonly estado = etiquetaEstadoPago;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly comprobanteDisponible = puedeDescargarComprobante;

  protected readonly puedeAnular = puedeAnularPago;
  protected readonly puedeCorregir = puedeCorregirPago;
  protected readonly puedeReembolsar = puedeReembolsarPago;

  protected readonly pendienteConfirmacion = computed(() => requiereConfirmacion(this.pago()));

  protected readonly puedeConfirmar = computed(
    () => !this.soloLectura() && this.permisos().confirmar && this.pendienteConfirmacion(),
  );

  /** El CU36 escribe con la función `Gestionar pagos`; leer exige `ver`. */
  protected readonly puedeOperar = computed(
    () => !this.soloLectura() && this.permisos().ver && this.permisos().registrar,
  );

  /** Texto honesto del resultado: depende del estado real devuelto. */
  protected readonly mensajeResultado = computed<string | null>(() => {
    const resultado = this.resultadoOperacion();
    if (!resultado) {
      return null;
    }
    const moneda = this.pago().moneda;
    const importe = formatearMonto(resultado.importe, moneda);
    switch (resultado.codigo) {
      case 'CONFIRMADO':
        return `Ajuste confirmado por ${importe}. El libro fue confirmado; los datos actualizados del servidor mostrarán el importe vigente actual.`;
      case 'PENDIENTE_PROVEEDOR':
        return `Solicitud enviada por ${importe}. El proveedor aún no confirma; no se contabiliza todavía.`;
      case 'DESCONOCIDO':
        return `Resultado desconocido por ${importe}. Conciliar con el proveedor antes de reintentar.`;
      case 'FALLIDO':
        return `El proveedor rechazó la operación por ${importe}: no se aplicó ningún cambio al pago.`;
      default:
        return `La operación por ${importe} quedó cancelada: no modifica el pago.`;
    }
  });

  protected readonly claseResultado = computed<string>(() => {
    const resultado = this.resultadoOperacion();
    if (!resultado) {
      return '';
    }
    if (resultado.tono === 'exito') {
      return 'detalle__resultado--exito';
    }
    return resultado.tono === 'aviso' ? 'detalle__resultado--aviso' : 'detalle__resultado--error';
  });

  private readonly api = inject(PagosAdministrativosService);
  private readonly comprobantes = inject(ComprobantePagoService);
  private readonly ajustes = inject(AjustesPagosService);
  private readonly destroyRef = inject(DestroyRef);

  /** Libro de ajustes para refrescarlo después de cada escritura. */
  private readonly libro = viewChild(HistorialAjustes);

  /**
   * Una clave por operación y por cuerpo. Se reutiliza mientras el operador
   * reintente exactamente el mismo payload (incluido un 5xx o un timeout) y se
   * descarta en cuanto el cuerpo cambia, el operador cierra el diálogo o el
   * servidor responde correctamente.
   */
  private readonly claves = new Map<OperacionAjuste, { clave: string; huella: string }>();

  /** Último pago sobre el que se informó un resultado; limpia al cambiar de pago. */
  private ultimoPagoAjuste: number | null = null;

  constructor() {
    effect(() => {
      const pagoId = this.pago().id;
      if (pagoId === this.ultimoPagoAjuste) {
        return;
      }
      this.ultimoPagoAjuste = pagoId;
      // El resultado de otro pago no debe sobrevivir al cambio de selección.
      this.resultadoOperacion.set(null);
      this.errorOperacion.set(null);
      this.ajusteSeleccionado.set(null);
    });
  }

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
          const mensaje = mensajeErrorPago(error, 'No se pudo confirmar el pago.');
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

  // --- CU36: anulaciones, correcciones, devoluciones y conciliaciones ------

  protected abrirAnulacion(): void {
    if (!this.puedeAbrir()) {
      return;
    }
    this.dialogoAnular.set(true);
  }

  protected abrirCorreccion(): void {
    if (!this.puedeAbrir()) {
      return;
    }
    this.dialogoCorregir.set(true);
  }

  protected abrirReembolso(): void {
    if (!this.puedeAbrir()) {
      return;
    }
    this.dialogoReembolso.set(true);
  }

  /** Abre la conciliación del ajuste que emitió el libro de ajustes. */
  protected abrirConciliacion(ajuste: PagoAjuste): void {
    if (!this.puedeAbrir()) {
      return;
    }
    this.ajusteSeleccionado.set(ajuste);
    this.dialogoConciliar.set(true);
  }

  protected cerrarAnulacion(): void {
    this.cerrarDialogoAjuste('anulacion', this.dialogoAnular);
  }

  protected cerrarCorreccion(): void {
    this.cerrarDialogoAjuste('correccion', this.dialogoCorregir);
  }

  protected cerrarReembolso(): void {
    this.cerrarDialogoAjuste('devolucion', this.dialogoReembolso);
  }

  protected cerrarConciliacion(): void {
    if (this.procesandoAjuste()) {
      return;
    }
    this.dialogoConciliar.set(false);
    this.ajusteSeleccionado.set(null);
    this.errorOperacion.set(null);
  }

  protected anularPago(solicitud: AnularPagoSolicitud): void {
    if (!this.puedeOperar() || this.procesandoAjuste()) {
      return;
    }
    const pagoId = this.pago().id;
    const clave = this.claveIdempotencia('anulacion', solicitud);
    this.ejecutarAjuste(
      this.ajustes.anularPago(pagoId, solicitud, clave),
      'la anulación',
      () => this.dialogoAnular.set(false),
      'anulacion',
    );
  }

  protected corregirPago(solicitud: CorregirPagoSolicitud): void {
    if (!this.puedeOperar() || this.procesandoAjuste()) {
      return;
    }
    const pagoId = this.pago().id;
    const clave = this.claveIdempotencia('correccion', solicitud);
    this.ejecutarAjuste(
      this.ajustes.corregirPago(pagoId, solicitud, clave),
      'la corrección',
      () => this.dialogoCorregir.set(false),
      'correccion',
    );
  }

  protected reembolsarPago(solicitud: ReembolsarPagoSolicitud): void {
    if (!this.puedeOperar() || this.procesandoAjuste()) {
      return;
    }
    const pagoId = this.pago().id;
    const clave = this.claveIdempotencia('devolucion', solicitud);
    this.ejecutarAjuste(
      this.ajustes.reembolsarPago(pagoId, solicitud, clave),
      'el reembolso',
      () => this.dialogoReembolso.set(false),
      'devolucion',
    );
  }

  /** `conciliar` es idempotente por estado: el servicio no envía cabecera. */
  protected conciliarAjuste(solicitud: ConciliarAjusteSolicitud): void {
    const ajuste = this.ajusteSeleccionado();
    if (!this.puedeOperar() || !ajuste || this.procesandoAjuste()) {
      return;
    }
    this.ejecutarAjuste(
      this.ajustes.conciliarAjuste(ajuste.id, solicitud),
      'la conciliación',
      () => {
        this.dialogoConciliar.set(false);
        this.ajusteSeleccionado.set(null);
      },
    );
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
      case 'REEMBOLSADO':
        return 'detalle__badge--reembolsado';
      default:
        return 'detalle__badge--neutro';
    }
  }

  // --- Internos -----------------------------------------------------------

  private puedeAbrir(): boolean {
    if (!this.puedeOperar() || this.procesandoAjuste()) {
      return false;
    }
    this.errorOperacion.set(null);
    this.resultadoOperacion.set(null);
    return true;
  }

  private cerrarDialogoAjuste(
    operacion: OperacionAjuste,
    dialogo: { set(valor: boolean): void },
  ): void {
    if (this.procesandoAjuste()) {
      return;
    }
    dialogo.set(false);
    this.errorOperacion.set(null);
    // Cerrar el diálogo termina el intento: el próximo envío es una operación nueva.
    this.claves.delete(operacion);
  }

  /**
   * Una sola petición en vuelo por panel. Un 409 mantiene el diálogo abierto
   * para que el operador lea la explicación del backend; un 404 lo cierra y
   * pide recargar porque el recurso ya no existe con ese estado.
   */
  private ejecutarAjuste(
    peticion: Observable<PagoAjuste>,
    descripcion: string,
    cerrar: () => void,
    operacionIdempotente?: OperacionAjuste,
  ): void {
    this.procesandoAjuste.set(true);
    this.errorOperacion.set(null);
    this.resultadoOperacion.set(null);
    this.exito.set(null);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ajuste) => {
        this.procesandoAjuste.set(false);
        if (operacionIdempotente) {
          this.claves.delete(operacionIdempotente);
        }
        cerrar();
        this.resultadoOperacion.set({
          tono: this.tonoDe(ajuste.estado),
          codigo: ajuste.estado,
          importe: ajuste.importe,
        });
        // El pago y el libro se refrescan desde el servidor, nunca en local.
        this.recargar.emit();
        this.libro()?.recargar();
      },
      error: (error: unknown) => {
        this.procesandoAjuste.set(false);
        this.errorOperacion.set(mensajeErrorAjuste(error, descripcion));
        if (error instanceof HttpErrorResponse && error.status === 404) {
          cerrar();
          this.recargar.emit();
          this.libro()?.recargar();
        }
      },
    });
  }

  /** `CONFIRMADO` es el único estado que representa dinero asentado. */
  private tonoDe(estado: EstadoAjuste): ResultadoAjuste['tono'] {
    switch (estado) {
      case 'CONFIRMADO':
        return 'exito';
      case 'PENDIENTE_PROVEEDOR':
      case 'DESCONOCIDO':
        return 'aviso';
      default:
        return 'error';
    }
  }

  private claveIdempotencia(operacion: OperacionAjuste, cuerpo: unknown): string {
    const huella = JSON.stringify({ pagoId: this.pago().id, cuerpo });
    const actual = this.claves.get(operacion);
    if (actual && actual.huella === huella) {
      return actual.clave;
    }
    const clave = generarClaveIdempotenciaAjuste(operacion);
    this.claves.set(operacion, { clave, huella });
    return clave;
  }
}
