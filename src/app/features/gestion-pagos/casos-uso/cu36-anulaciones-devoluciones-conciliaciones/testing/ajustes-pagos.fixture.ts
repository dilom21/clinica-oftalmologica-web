import { PagoAdministrativo } from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import { HistorialAjustes, PagoAjuste } from '../models/ajustes-pagos.models';

/**
 * Pago de referencia para las specs de los diálogos del CU36.
 *
 * Se define una sola vez y cada spec la ajusta con `overrides` para no repetir
 * el mismo objeto en tres archivos.
 */
export function pagoAdministrativo(
  overrides: Partial<PagoAdministrativo> = {},
): PagoAdministrativo {
  return {
    id: 1024,
    paciente_id: 7,
    consulta_clinica_id: 142,
    fecha_creacion: '2026-10-19T15:42:00Z',
    fecha_hora_pago: null,
    monto: '380.00',
    moneda: 'BOB',
    metodo_pago: 'TRANSFERENCIA',
    estado: 'APROBADO',
    referencia_bancaria: 'TRX-9911',
    observaciones: null,
    servicio_realizado_ids: [11, 12],
    notificacion: null,
    importe_vigente: '380.00',
    importe_reembolsado: '0.00',
    ajustes_pendientes: false,
    ...overrides,
  };
}

/**
 * Ajuste de referencia para las specs del libro y del diálogo de conciliación.
 * El estado por defecto es `PENDIENTE_PROVEEDOR`: el caso que la UI no debe
 * presentar como dinero asentado.
 */
export function ajustePago(overrides: Partial<PagoAjuste> = {}): PagoAjuste {
  return {
    id: 55,
    pago_id: 1024,
    tipo: 'DEVOLUCION',
    naturaleza: 'SERVICIO_CANCELADO',
    efecto_caja: 'DEVOLUCION_STRIPE',
    estado: 'PENDIENTE_PROVEEDOR',
    importe: '-40.00',
    moneda: 'BOB',
    motivo: 'El paciente canceló el tratamiento antes de la atención',
    evidencia: null,
    referencia_externa: 're_123',
    revertir_aplicacion_cuota: false,
    creado_por: 3,
    confirmado_por: null,
    conciliado_por: null,
    fecha_creacion: '2026-10-19T16:10:00Z',
    fecha_confirmacion: null,
    fecha_conciliacion: null,
    observaciones: null,
    detalles: [{ servicio_realizado_id: 11, monto: '-40.00' }],
    ...overrides,
  };
}

/** Libro de ajustes de referencia; cada spec lo ajusta con `overrides`. */
export function historialAjustes(
  overrides: Partial<HistorialAjustes> = {},
): HistorialAjustes {
  return {
    pago_id: 1024,
    importe_base: '380.00',
    importe_vigente: '340.00',
    importe_reembolsado: '40.00',
    ajuste_abierto: false,
    ajustes: [],
    ...overrides,
  };
}
