import { HttpErrorResponse } from '@angular/common/http';

import {
  PagoAdministrativo,
  formatearFechaHora,
  formatearMonto,
  mensajeErrorPago,
} from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';

/**
 * Reexportados para que las páginas de CU36 importen un único módulo.
 * No se duplican: la fuente es el contrato de CU31.
 */
export { formatearFechaHora, formatearMonto, mensajeErrorPago };

/**
 * Contratos del CU36 — anulaciones, correcciones, devoluciones y conciliaciones.
 *
 * Fuente de verdad: `app/modules/gestion_pagos/schemas/ajustes.py` y
 * `app/modules/gestion_pagos/api/administrativos.py` del backend local.
 *
 * Los importes del libro de ajustes viajan como cadena decimal (`"-120.00"`),
 * tal como los serializa Pydantic; nunca se convierten a `number` para operar
 * con ellos. La única excepción documentada es `ReembolsoHuerfano.amount`, que
 * Stripe entrega en unidades menores enteras (ver `montoDesdeUnidadesMenores`).
 */

export type TipoAjuste =
  | 'ANULACION'
  | 'CORRECCION'
  | 'DEVOLUCION'
  | 'REEMBOLSO'
  | 'RECONCILIACION';

export type NaturalezaAjuste =
  | 'ERROR_DE_REGISTRO'
  | 'PAGO_DUPLICADO'
  | 'SERVICIO_CANCELADO'
  | 'SOBREPAGO'
  | 'PAGO_INSUFICIENTE'
  | 'REVERSION_FINANCIACION'
  | 'OTRO';

export type EstadoAjuste =
  | 'PENDIENTE_PROVEEDOR'
  | 'CONFIRMADO'
  | 'FALLIDO'
  | 'CANCELADO'
  | 'DESCONOCIDO';

export type EfectoCaja = 'SIN_EFECTO' | 'DEVOLUCION_MANUAL' | 'DEVOLUCION_STRIPE';

export type EstadoReembolsoHuerfano = 'PENDIENTE' | 'ATRIBUIDO' | 'DESCARTADO';

/** `DESCONOCIDO` no es un resultado aceptado por el backend al conciliar. */
export type ResultadoConciliacion = 'CONFIRMADO' | 'FALLIDO' | 'CANCELADO';

export const TIPOS_AJUSTE: ReadonlyArray<TipoAjuste> = [
  'ANULACION',
  'CORRECCION',
  'DEVOLUCION',
  'REEMBOLSO',
  'RECONCILIACION',
];

export const NATURALEZAS_AJUSTE: ReadonlyArray<NaturalezaAjuste> = [
  'ERROR_DE_REGISTRO',
  'PAGO_DUPLICADO',
  'SERVICIO_CANCELADO',
  'SOBREPAGO',
  'PAGO_INSUFICIENTE',
  'REVERSION_FINANCIACION',
  'OTRO',
];

export const ESTADOS_AJUSTE: ReadonlyArray<EstadoAjuste> = [
  'PENDIENTE_PROVEEDOR',
  'CONFIRMADO',
  'FALLIDO',
  'CANCELADO',
  'DESCONOCIDO',
];

/** Estados sobre los que el backend todavía acepta una conciliación manual. */
export const ESTADOS_CONCILIABLES: ReadonlyArray<EstadoAjuste> = [
  'PENDIENTE_PROVEEDOR',
  'DESCONOCIDO',
  'FALLIDO',
];

/**
 * Estados en los que un ajuste sigue abierto: bloquean una segunda operación
 * de dinero sobre el mismo pago (`ajustes_pendientes` del backend).
 */
export const ESTADOS_AJUSTE_ABIERTOS: ReadonlyArray<EstadoAjuste> = [
  'PENDIENTE_PROVEEDOR',
  'DESCONOCIDO',
];

export const RESULTADOS_CONCILIACION: ReadonlyArray<ResultadoConciliacion> = [
  'CONFIRMADO',
  'FALLIDO',
  'CANCELADO',
];

/**
 * Naturalezas que justifican una corrección al alza del importe. El resto de
 * naturalezas sólo describe reducciones o reversiones.
 */
export const NATURALEZAS_CORRECCION_AL_ALZA: ReadonlyArray<NaturalezaAjuste> = [
  'ERROR_DE_REGISTRO',
];

export const ESTADOS_REEMBOLSO_HUERFANO: ReadonlyArray<EstadoReembolsoHuerfano> = [
  'PENDIENTE',
  'ATRIBUIDO',
  'DESCARTADO',
];

/**
 * Límites del contrato de ajustes. Se replican aquí para que un consumidor que
 * valide sólo con estas constantes no pueda emitir una petición que el backend
 * rechazaría con 422. Aplican a `AnularPago`, `CorregirPago`,
 * `ReembolsarPago` y `AtribuirReembolsoHuerfano`.
 */
export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 1000;
export const EVIDENCIA_MINIMA = 5;
export const EVIDENCIA_MAXIMA = 2000;
export const OBSERVACIONES_MAXIMA = 2000;

/** `referencia_devolucion` y `refund_id` comparten rango en el backend. */
export const REFERENCIA_LONGITUD = { min: 3, max: 255 } as const;

/** `servicios` de un ajuste: entre 1 y 50, sin identificadores duplicados. */
export const MIN_SERVICIOS_AJUSTE = 1;
export const MAX_SERVICIOS_AJUSTE = 50;

/** `moneda` del contrato: exactamente tres caracteres, ya en mayúsculas. */
export const MONEDA_LONGITUD = 3;

/**
 * El backend rechaza con 422 cualquier moneda que no sea exactamente tres
 * letras mayúsculas, así que esta comprobación no es cosmética.
 */
export function monedaValida(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && /^[A-Z]{3}$/.test(valor);
}

/* ============================================================
 * Cuerpos de solicitud
 * ============================================================ */

export interface AjusteDetalleCrear {
  servicio_realizado_id: number;
  monto: string;
}

export interface AnularPagoSolicitud {
  /** 10..1000 caracteres. */
  motivo: string;
  naturaleza: NaturalezaAjuste;
  /** 5..2000 caracteres; el backend convierte `''` en `null`. */
  evidencia?: string | null;
}

export interface CorregirPagoSolicitud {
  /** 10..1000 caracteres. */
  motivo: string;
  naturaleza: NaturalezaAjuste;
  /** Distinto de cero y con signo: positivo al alza, negativo a la baja. */
  importe: string;
  /** Exactamente tres caracteres, ya en mayúsculas. */
  moneda?: string | null;
  /** 5..2000 caracteres. */
  evidencia?: string | null;
  /** 1..50 elementos con `servicio_realizado_id` único. */
  servicios: AjusteDetalleCrear[];
}

export interface ReembolsarPagoSolicitud {
  /** 10..1000 caracteres. */
  motivo: string;
  naturaleza: NaturalezaAjuste;
  /** Obligatoriamente negativo. */
  importe: string;
  /** Exactamente tres caracteres, ya en mayúsculas. */
  moneda?: string | null;
  /** 5..2000 caracteres. */
  evidencia?: string | null;
  /** 3..255 caracteres: referencia de la devolución manual. */
  referencia_devolucion?: string | null;
  /** 1..50 elementos únicos; cada `monto` debe ser negativo. */
  servicios: AjusteDetalleCrear[];
}

export interface ConciliarAjusteSolicitud {
  /** Sólo `CONFIRMADO`, `FALLIDO` o `CANCELADO`. */
  resultado: ResultadoConciliacion;
  evidencia?: string | null;
  /** Hasta 2000 caracteres. */
  observaciones?: string | null;
  /** 3..255 caracteres: identificador del reembolso en el proveedor. */
  refund_id?: string | null;
}

export interface AtribuirReembolsoHuerfanoSolicitud {
  /** 10..1000 caracteres. */
  motivo: string;
  naturaleza: NaturalezaAjuste;
  /** Obligatoria en este flujo: no admite ausencia. 5..2000 caracteres. */
  evidencia: string;
  /** 1..50 elementos únicos; cada `monto` debe ser negativo. */
  servicios: AjusteDetalleCrear[];
  // Sin `importe`, sin `moneda` y sin `refund_id`: el reembolso y su importe
  // provienen del propio registro huérfano, no del formulario.
}

/* ============================================================
 * Respuestas
 * ============================================================ */

export interface AjusteDetalleRespuesta {
  servicio_realizado_id: number;
  monto: string;
}

export interface PagoAjuste {
  id: number;
  pago_id: number;
  tipo: TipoAjuste;
  naturaleza: NaturalezaAjuste;
  efecto_caja: EfectoCaja;
  estado: EstadoAjuste;
  importe: string;
  moneda: string;
  motivo: string;
  evidencia: string | null;
  referencia_externa: string | null;
  revertir_aplicacion_cuota: boolean;
  creado_por: number | null;
  confirmado_por: number | null;
  conciliado_por: number | null;
  fecha_creacion: string;
  fecha_confirmacion: string | null;
  fecha_conciliacion: string | null;
  observaciones: string | null;
  detalles: AjusteDetalleRespuesta[];
}

export interface HistorialAjustes {
  pago_id: number;
  importe_base: string;
  importe_vigente: string;
  importe_reembolsado: string;
  ajuste_abierto: boolean;
  ajustes: PagoAjuste[];
}

export interface ReembolsoHuerfano {
  id: number;
  stripe_event_id: string;
  event_type: string;
  refund_id: string;
  payment_intent_id: string | null;
  /**
   * Importe en unidades menores enteras de la moneda (`1010` === `10.10`).
   * Es el único campo monetario del módulo que NO es una cadena decimal:
   * proviene del objeto refund de Stripe.
   */
  amount: number;
  /** Código ISO en mayúsculas (`BOB`, `USD`). */
  currency: string;
  /** Estado bruto del refund en Stripe (`pending`, `succeeded`, …). */
  status: string;
  estado: EstadoReembolsoHuerfano;
  ajuste_id: number | null;
  motivo: string | null;
  creado_en: string;
}

/* ============================================================
 * Importes con signo (aritmética entera, nunca de coma flotante)
 * ============================================================ */

const PATRON_MONTO = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Convierte una cadena decimal a centavos enteros con signo.
 *
 * Acepta `"380.00"`, `"5"`, `"7.5"`, `"-1234.56"` y `"0.00"`. Devuelve `null`
 * —nunca `NaN`— cuando el texto no es un importe con hasta dos decimales.
 */
export function centavosDeMonto(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  const coincidencia = PATRON_MONTO.exec(valor.trim());
  if (!coincidencia) {
    return null;
  }
  const enteros = Number(coincidencia[2]);
  const decimales = Number((coincidencia[3] ?? '').padEnd(2, '0').slice(0, 2));
  const total = enteros * 100 + decimales;
  if (!Number.isSafeInteger(total)) {
    return null;
  }
  return coincidencia[1] ? -total : total;
}

/**
 * Centavos enteros con signo → cadena decimal de dos dígitos (`"-1234.56"`).
 * Se construye con texto para no depender de la división binaria.
 */
export function montoDeCentavos(centavos: number): string {
  if (!Number.isFinite(centavos)) {
    return '0.00';
  }
  const truncado = Math.trunc(centavos);
  const signo = truncado < 0 ? '-' : '';
  const texto = String(Math.abs(truncado)).padStart(3, '0');
  return `${signo}${texto.slice(0, -2)}.${texto.slice(-2)}`;
}

/**
 * Suma importes con signo en centavos enteros.
 *
 * Los elementos `null`/`undefined` se ignoran (importe ausente en la
 * respuesta); un texto no numérico invalida la suma completa y devuelve
 * `null`, para no presentar un total incorrecto.
 */
export function sumarMontos(valores: (string | null | undefined)[]): string | null {
  let total = 0;
  for (const valor of valores) {
    if (valor === null || valor === undefined) {
      continue;
    }
    const centavos = centavosDeMonto(valor);
    if (centavos === null) {
      return null;
    }
    total += centavos;
    if (!Number.isSafeInteger(total)) {
      return null;
    }
  }
  return montoDeCentavos(total);
}

/** `true` sólo si el texto es un importe válido estrictamente negativo. */
export function montoEsNegativo(valor: string): boolean {
  const centavos = centavosDeMonto(valor);
  return centavos !== null && centavos < 0;
}

/**
 * `ReembolsoHuerfano.amount` llega en unidades menores enteras (`1010`), no
 * como cadena decimal como el resto de importes del módulo. `currency` se
 * conserva en la firma por trazabilidad con el evento de Stripe; el backend
 * opera con monedas de dos decimales (BOB), de modo que la unidad menor es el
 * centavo y basta dividir por 100 sin coma flotante.
 */
export function montoDesdeUnidadesMenores(amount: number, currency: string): string {
  void currency;
  return montoDeCentavos(amount);
}

/* ============================================================
 * Elegibilidad observable desde el frontend
 *
 * Sólo se usan hechos que el backend entrega en `PagoAdministrativo`:
 * `estado`, `metodo_pago`, `importe_vigente`, `importe_reembolsado` y
 * `ajustes_pendientes`. Deliberadamente NO se intenta detectar si el pago
 * pertenece a una cuota ni si fue capturado por Stripe: el vínculo con la
 * cuota y la pasarela son datos del servidor que este contrato no expone, y
 * el backend sigue siendo la autoridad final (un 409/403 se traduce, no se
 * adivina).
 * ============================================================ */

/**
 * Anular se ofrece mientras el pago no esté ya anulado o reembolsado. Sobre un
 * pago aprobado el backend rechaza además el caso de devoluciones ya
 * registradas: cuando `importe_vigente` es menor que el `monto` original ya hay
 * ajustes confirmados, así que se deja de ofrecer. Con `importe_vigente`
 * ausente no se puede verificar y se deja decidir al backend.
 */
export function puedeAnularPago(
  pago: Pick<PagoAdministrativo, 'estado' | 'monto' | 'importe_vigente'>,
): boolean {
  if (pago.estado === 'PENDIENTE' || pago.estado === 'RECHAZADO') {
    return true;
  }
  if (pago.estado !== 'APROBADO') {
    return false;
  }
  const vigente = centavosDeMonto(pago.importe_vigente);
  const original = centavosDeMonto(pago.monto);
  if (vigente === null || original === null) {
    return true;
  }
  return vigente >= original;
}

/** Corregir exige un pago aprobado y ningún ajuste abierto sobre él. */
export function puedeCorregirPago(
  pago: Pick<PagoAdministrativo, 'estado' | 'ajustes_pendientes'>,
): boolean {
  return pago.estado === 'APROBADO' && pago.ajustes_pendientes !== true;
}

/**
 * Reembolsar exige un pago aprobado, sin ajustes abiertos y con importe
 * vigente positivo. Si la respuesta no incluye `importe_vigente` no se ofrece
 * la acción: no hay forma de verificar que quede saldo por devolver.
 */
export function puedeReembolsarPago(
  pago: Pick<PagoAdministrativo, 'estado' | 'ajustes_pendientes' | 'importe_vigente'>,
): boolean {
  if (pago.estado !== 'APROBADO' || pago.ajustes_pendientes === true) {
    return false;
  }
  const vigente = centavosDeMonto(pago.importe_vigente);
  return vigente !== null && vigente > 0;
}

/** Conciliar sólo tiene sentido mientras el proveedor no dio un veredicto. */
export function puedeConciliarAjuste(ajuste: Pick<PagoAjuste, 'estado'>): boolean {
  return ESTADOS_CONCILIABLES.includes(ajuste.estado);
}

/**
 * Anular un pago APROBADO exige evidencia de que no hubo captura real de
 * dinero; el backend responde 409 si falta. La regla depende sólo del estado,
 * nunca del método de pago: `PagoAdministrativo` no expone la pasarela y el
 * backend decide por su cuenta si el pago es Stripe.
 */
export function requiereEvidenciaParaAnular(
  pago: Pick<PagoAdministrativo, 'estado'>,
): boolean {
  return pago.estado === 'APROBADO';
}

/**
 * Toda corrección al alza debe justificarse con evidencia. `importe` admite más
 * de dos decimales en el esquema del backend (se cuantiza a centavos después,
 * sin cambiar el signo), así que una entrada como `"10.005"` también es al alza.
 */
export function requiereEvidenciaParaCorreccionAlAlza(importe: string): boolean {
  const centavos = centavosDeMonto(importe);
  if (centavos !== null) {
    return centavos > 0;
  }
  const normalizado = importe.trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) {
    return false;
  }
  return !normalizado.startsWith('-') && /[1-9]/.test(normalizado);
}

/** Sólo los reembolsos huérfanos todavía sin resolver se pueden atribuir. */
export function puedeAtribuirHuerfano(huerfano: Pick<ReembolsoHuerfano, 'estado'>): boolean {
  return huerfano.estado === 'PENDIENTE';
}

/* ============================================================
 * Etiquetas y descripciones
 * ============================================================ */

export function etiquetaTipoAjuste(tipo: TipoAjuste): string {
  switch (tipo) {
    case 'ANULACION':
      return 'Anulación';
    case 'CORRECCION':
      return 'Corrección';
    case 'DEVOLUCION':
      return 'Devolución';
    case 'REEMBOLSO':
      return 'Reembolso';
    default:
      return 'Conciliación';
  }
}

export function etiquetaNaturalezaAjuste(naturaleza: NaturalezaAjuste): string {
  switch (naturaleza) {
    case 'ERROR_DE_REGISTRO':
      return 'Error de registro';
    case 'PAGO_DUPLICADO':
      return 'Pago duplicado';
    case 'SERVICIO_CANCELADO':
      return 'Servicio cancelado';
    case 'SOBREPAGO':
      return 'Sobrepago';
    case 'PAGO_INSUFICIENTE':
      return 'Pago insuficiente';
    case 'REVERSION_FINANCIACION':
      return 'Reversión de financiación';
    default:
      return 'Otro motivo';
  }
}

export function etiquetaEstadoAjuste(estado: EstadoAjuste): string {
  switch (estado) {
    case 'PENDIENTE_PROVEEDOR':
      return 'Pendiente del proveedor';
    case 'CONFIRMADO':
      return 'Confirmado';
    case 'FALLIDO':
      return 'Fallido';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return 'Estado desconocido';
  }
}

export function etiquetaEfectoCaja(efecto: EfectoCaja): string {
  switch (efecto) {
    case 'DEVOLUCION_MANUAL':
      return 'Devolución manual en caja';
    case 'DEVOLUCION_STRIPE':
      return 'Devolución por el proveedor';
    default:
      return 'Sin efecto en caja';
  }
}

export function etiquetaEstadoReembolsoHuerfano(estado: EstadoReembolsoHuerfano): string {
  switch (estado) {
    case 'ATRIBUIDO':
      return 'Atribuido a un pago';
    case 'DESCARTADO':
      return 'Descartado';
    default:
      return 'Pendiente de atribución';
  }
}

export function etiquetaResultadoConciliacion(resultado: ResultadoConciliacion): string {
  switch (resultado) {
    case 'CONFIRMADO':
      return 'Confirmado';
    case 'FALLIDO':
      return 'Fallido';
    default:
      return 'Cancelado';
  }
}

/**
 * Explicación de una línea por estado. Deja explícito que ni
 * `PENDIENTE_PROVEEDOR` ni `DESCONOCIDO` son un resultado exitoso.
 */
export function descripcionEstadoAjuste(estado: EstadoAjuste): string {
  switch (estado) {
    case 'PENDIENTE_PROVEEDOR':
      return 'El proveedor todavía no confirma la operación; aún no se completó.';
    case 'CONFIRMADO':
      return 'La operación quedó confirmada y figura en el libro de ajustes.';
    case 'FALLIDO':
      return 'El proveedor rechazó la operación; no se aplicó ningún cambio al pago.';
    case 'CANCELADO':
      return 'La operación se canceló y no modifica el pago.';
    default:
      return 'El resultado del proveedor es desconocido; requiere conciliación antes de considerarse válido.';
  }
}

/* ============================================================
 * Idempotencia y errores
 * ============================================================ */

/** Alfabeto admitido por el header `Idempotency-Key` del backend. */
const CARACTERES_CLAVE_IDEMPOTENCIA = /[^A-Za-z0-9._:/-]/g;

/**
 * Clave de idempotencia por operación lógica. Se reutiliza únicamente al
 * reintentar el mismo payload; el backend responde 409 si cambia el cuerpo.
 * Se sanea al alfabeto `[A-Za-z0-9._:/-]` y se recorta a 100 caracteres.
 */
export function generarClaveIdempotenciaAjuste(
  operacion: 'anulacion' | 'correccion' | 'devolucion',
): string {
  const generador = globalThis.crypto;
  const uuid =
    generador && typeof generador.randomUUID === 'function'
      ? generador.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const crudo = `ajuste-${operacion}-${uuid}`;
  return crudo.replace(CARACTERES_CLAVE_IDEMPOTENCIA, '-').slice(0, 100).padEnd(8, '0');
}

/** Fallback cuando el backend no explica el 403. */
export const MENSAJE_REQUIERE_ADMINISTRADOR = 'Esta operación requiere un administrador.';

/**
 * Extrae el `detail` de un error FastAPI ya normalizado por el interceptor.
 * El 403 del backend puede venir del gate de permisos o de un gate de rol: el
 * texto del servidor es siempre más preciso que un mensaje genérico, y sólo se
 * usa el fallback de administrador cuando no hay detalle.
 */
function detalleBackend(error: HttpErrorResponse): string | null {
  const cuerpo: unknown = error.error;
  if (typeof cuerpo === 'string') {
    return cuerpo.trim() || null;
  }
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return null;
  }
  const detalle = (cuerpo as { detail?: unknown }).detail;
  if (typeof detalle === 'string') {
    return detalle.trim() || null;
  }
  if (Array.isArray(detalle)) {
    const mensajes = detalle
      .map((item) =>
        typeof item === 'object' && item !== null && typeof (item as { msg?: unknown }).msg === 'string'
          ? ((item as { msg: string }).msg ?? '').trim()
          : '',
      )
      .filter((mensaje) => mensaje.length > 0);
    return mensajes.length > 0 ? mensajes.join(' ') : null;
  }
  return null;
}

/**
 * Mensajes del CU36. Conserva el mapa genérico de CU31 y, en el 403, prioriza
 * lo que el backend explique; sólo si no hay detalle se afirma que la operación
 * requiere un administrador.
 */
export function mensajeErrorAjuste(error: unknown, alternativa: string): string {
  if (error instanceof HttpErrorResponse && error.status === 403) {
    return detalleBackend(error) ?? MENSAJE_REQUIERE_ADMINISTRADOR;
  }
  return mensajeErrorPago(error, alternativa);
}
