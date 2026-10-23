import { HttpErrorResponse } from '@angular/common/http';

import { MenuFuncion } from '../../../../../core/models/menu.models';

/**
 * Contratos del CU31 — pagos administrativos.
 *
 * Fuente de verdad: `app/modules/gestion_pagos/schemas/administrativos.py`
 * y `app/modules/gestion_pagos/api/administrativos.py` del backend local.
 *
 * Los montos viajan como cadena decimal (`"380.00"`), tal como los serializa
 * Pydantic; nunca se convierten a `number` para enviarlos de vuelta.
 */

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'QR';
export type MetodoPagoRegistrado = MetodoPago | 'TARJETA' | 'OTRO';
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ANULADO' | 'REEMBOLSADO';
export type EstadoNotificacion =
  'PENDIENTE' | 'PROCESANDO' | 'ACEPTADO_POR_PROVEEDOR' | 'FALLIDO' | 'ENTREGADO';

export const METODOS_PAGO: ReadonlyArray<MetodoPago> = ['EFECTIVO', 'TRANSFERENCIA', 'QR'];

/** El listado administrativo también admite filtrar por pagos con tarjeta. */
export const METODOS_FILTRO: ReadonlyArray<MetodoPagoRegistrado> = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'QR',
  'TARJETA',
];

export const ESTADOS_PAGO: ReadonlyArray<EstadoPago> = [
  'PENDIENTE',
  'APROBADO',
  'RECHAZADO',
  'ANULADO',
  'REEMBOLSADO',
];

/**
 * Límite de reintentos que ofrece la interfaz. El backend no impone un tope,
 * pero la UI no debe permitir reintentos ilimitados (CU31 §7).
 */
export const MAX_REINTENTOS_UI = 3;

/**
 * Marca informativa que el backend usa cuando el comprobante se redirige a un
 * buzón de pruebas (`EMAIL_TEST`). No es un fallo de Resend: la interfaz no
 * debe presentarla como error, pero sí debe tolerarla en notificaciones
 * históricas que todavía la contienen.
 */
export const MARCA_EMAIL_PRUEBAS = 'DESTINATARIO_REDIRECT_PRUEBAS';

export interface ServicioPendienteAdministrativo {
  servicio_realizado_id: number;
  paciente_id: number;
  consulta_clinica_id: number;
  nombre_servicio: string;
  fecha_realizacion: string | null;
  precio_aplicado: string;
  cobrable: boolean;
  conflicto_pago: string | null;
}

export interface ResumenServiciosPendientes {
  paciente_id: number;
  consulta_clinica_id: number | null;
  servicios: ServicioPendienteAdministrativo[];
  total: string;
}

export interface PagoAdministrativoCrear {
  paciente_id: number;
  servicio_realizado_ids: number[];
  metodo_pago: MetodoPago;
  referencia_bancaria?: string | null;
  observaciones?: string | null;
}

export interface NotificacionPago {
  estado: EstadoNotificacion;
  intentos: number;
  proveedor_mensaje_id: string | null;
  fecha_aceptado: string | null;
  fecha_entregado: string | null;
  ultimo_error: string | null;
}

export interface PagoAdministrativo {
  id: number;
  paciente_id: number;
  consulta_clinica_id: number;
  fecha_creacion: string;
  fecha_hora_pago: string | null;
  monto: string;
  moneda: string;
  metodo_pago: MetodoPagoRegistrado;
  estado: EstadoPago;
  referencia_bancaria: string | null;
  observaciones: string | null;
  servicio_realizado_ids: number[];
  notificacion: NotificacionPago | null;
}

export interface PagosAdministrativosPagina {
  items: PagoAdministrativo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FiltrosPagos {
  paciente_id?: number | null;
  metodo_pago?: MetodoPagoRegistrado | null;
  estado?: EstadoPago | null;
  desde?: string | null;
  hasta?: string | null;
  page?: number;
  page_size?: number;
}

export interface PermisosPagos {
  /** Puede consultar pagos, servicios pendientes y comprobantes (LECTURA). */
  ver: boolean;
  /** Puede registrar pagos y reintentar notificaciones (ESCRITURA). */
  registrar: boolean;
  /** Puede confirmar transferencias y QR (función independiente). */
  confirmar: boolean;
}

const SIN_PERMISOS: PermisosPagos = {
  ver: false,
  registrar: false,
  confirmar: false,
};

/** Normaliza nombres de módulos, funciones y acciones del menú de seguridad. */
export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function accionPermite(
  accion: string | null | undefined,
  minimo: 'lectura' | 'escritura',
): boolean {
  const valor = normalizarTexto(accion).toUpperCase();
  if (!valor) {
    return false;
  }
  return minimo === 'lectura'
    ? valor === 'LECTURA' || valor === 'AMBAS'
    : valor === 'ESCRITURA' || valor === 'AMBAS';
}

/**
 * Traduce las funciones de `/seguridad/menu` a capacidades de la UI.
 * Un permiso de lectura de `Gestionar pagos` no habilita el registro y la
 * confirmación depende exclusivamente de `Confirmar pagos bancarios`.
 */
export function permisosPagos(
  funciones: ReadonlyArray<MenuFuncion> | null | undefined,
): PermisosPagos {
  if (!funciones?.length) {
    return SIN_PERMISOS;
  }

  let ver = false;
  let registrar = false;
  let confirmar = false;

  for (const funcion of funciones) {
    const nombre = normalizarTexto(funcion?.nombre);
    if (nombre === 'gestionar pagos') {
      ver = ver || accionPermite(funcion?.accion_nombre, 'lectura');
      registrar = registrar || accionPermite(funcion?.accion_nombre, 'escritura');
    } else if (nombre === 'confirmar pagos bancarios') {
      confirmar = confirmar || accionPermite(funcion?.accion_nombre, 'escritura');
    }
  }

  return { ver, registrar, confirmar };
}

/** Sólo las transferencias y el QR requieren confirmación administrativa. */
export function requiereConfirmacion(pago: PagoAdministrativo): boolean {
  return (
    pago.estado === 'PENDIENTE' &&
    (pago.metodo_pago === 'TRANSFERENCIA' || pago.metodo_pago === 'QR')
  );
}

/** El backend sólo genera el comprobante de pagos APROBADOS. */
export function puedeDescargarComprobante(pago: PagoAdministrativo): boolean {
  return pago.estado === 'APROBADO';
}

/**
 * Reintento permitido por la interfaz: la notificación debe existir, estar en
 * un estado no terminal y no superar el tope de la UI.
 */
export function notificacionReintentable(
  notificacion: NotificacionPago | null | undefined,
): boolean {
  if (!notificacion) {
    return false;
  }
  if (notificacion.estado !== 'PENDIENTE' && notificacion.estado !== 'FALLIDO') {
    return false;
  }
  return notificacion.intentos < MAX_REINTENTOS_UI;
}

/**
 * Estados en los que el proveedor todavía puede cambiar el resultado del
 * envío. `ACEPTADO_POR_PROVEEDOR` y `ENTREGADO` son terminales, igual que
 * `FALLIDO`.
 */
export function notificacionEnSeguimiento(estado: EstadoNotificacion): boolean {
  return estado === 'PENDIENTE' || estado === 'PROCESANDO';
}

/**
 * Error real del proveedor para mostrar en pantalla. Las marcas informativas
 * del modo de pruebas se normalizan a `null`; el backend hace lo mismo, pero
 * se conserva esta salvaguarda para notificaciones históricas.
 */
export function errorNotificacionVisible(
  codigo: string | null | undefined,
): string | null {
  const valor = (codigo ?? '').trim();
  if (!valor) {
    return null;
  }
  return normalizarTexto(valor) === normalizarTexto(MARCA_EMAIL_PRUEBAS)
    ? null
    : valor;
}

export function etiquetaMetodoPago(metodo: MetodoPagoRegistrado): string {
  switch (metodo) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'TRANSFERENCIA':
      return 'Transferencia';
    case 'QR':
      return 'QR';
    case 'TARJETA':
      return 'Tarjeta';
    default:
      return 'Otro';
  }
}

export function etiquetaEstadoPago(estado: EstadoPago): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'APROBADO':
      return 'Aprobado';
    case 'RECHAZADO':
      return 'Rechazado';
    case 'ANULADO':
      return 'Anulado';
    default:
      return 'Reembolsado';
  }
}

export function etiquetaEstadoNotificacion(estado: EstadoNotificacion): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente de envío';
    case 'PROCESANDO':
      return 'En proceso';
    case 'ACEPTADO_POR_PROVEEDOR':
      return 'Aceptada por el proveedor';
    case 'FALLIDO':
      return 'Fallida';
    default:
      return 'Entregada';
  }
}

const formatoNumerico = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `"380.00"` → `"Bs 380,00"`. Devuelve `—` si el valor no es numérico. */
export function formatearMonto(valor: string | number, moneda = 'BOB'): string {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero)) {
    return '—';
  }
  const prefijo = moneda === 'BOB' ? 'Bs' : moneda;
  return `${prefijo} ${formatoNumerico.format(numero)}`;
}

const formatoFechaHora = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/La_Paz',
});

const formatoFecha = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium',
  timeZone: 'America/La_Paz',
});

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) {
    return 'Sin fecha registrada';
  }
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? 'Fecha no disponible' : formatoFechaHora.format(fecha);
}

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) {
    return 'Sin fecha registrada';
  }
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? 'Fecha no disponible' : formatoFecha.format(fecha);
}
/**
 * `desde`/`hasta` del contrato son `AwareDatetime`: se envían con el desfase
 * fijo de Bolivia (UTC-4, sin horario de verano).
 */
export function fechaInicioIso(dia: string): string | null {
  return convertirDia(dia, 'T00:00:00.000-04:00');
}

export function fechaFinIso(dia: string): string | null {
  return convertirDia(dia, 'T23:59:59.999-04:00');
}

function convertirDia(dia: string, sufijo: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) {
    return null;
  }
  const fecha = new Date(`${dia}${sufijo}`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Clave válida para `Idempotency-Key` (8–100, `[A-Za-z0-9._:/-]`). */
export function generarClaveIdempotencia(): string {
  const generador = globalThis.crypto;
  const uuid =
    generador && typeof generador.randomUUID === 'function'
      ? generador.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `pago-${uuid}`;
}

/**
 * Nombre de archivo seguro para el comprobante. Se prioriza el nombre que
 * envía el backend y se descarta cualquier ruta o carácter inseguro.
 */
export function nombreArchivoComprobante(
  contentDisposition: string | null | undefined,
  pagoId: number,
): string {
  const porDefecto = `comprobante_pago_${pagoId}.pdf`;
  if (!contentDisposition) {
    return porDefecto;
  }
  const coincidencia = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
  if (!coincidencia) {
    return porDefecto;
  }
  const limpio = coincidencia[1]
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\.{2,}/g, '.');
  return limpio.toLowerCase().endsWith('.pdf') && limpio.length > 4 ? limpio : porDefecto;
}

function detalleDeError(cuerpo: unknown): string | null {
  if (typeof cuerpo === 'string') {
    return cuerpo.trim() || null;
  }
  if (!cuerpo || typeof cuerpo !== 'object') {
    return null;
  }
  const registro = cuerpo as Record<string, unknown>;
  const detalle = registro['detail'] ?? registro['message'];
  if (typeof detalle === 'string') {
    return detalle.trim() || null;
  }
  if (Array.isArray(detalle)) {
    const mensajes = detalle
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const msg = (item as Record<string, unknown>)['msg'];
        return typeof msg === 'string' ? msg : null;
      })
      .filter((msg): msg is string => !!msg);
    return mensajes.length ? mensajes.slice(0, 3).join(' · ') : null;
  }
  return null;
}

/**
 * Mensajes de error del CU31. FastAPI puede devolver `detail` como texto o
 * como lista de errores de validación (422), por eso se contemplan ambos.
 */
export function mensajeErrorPago(error: unknown, alternativa: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return alternativa;
  }

  const detalle = detalleDeError(error.error);

  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor. Comprueba tu conexión e intenta nuevamente.';
    case 401:
      return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
    case 403:
      return detalle ?? 'No tienes permisos para realizar esta operación.';
    case 404:
      return detalle ?? 'El recurso solicitado no está disponible.';
    case 409:
      return detalle ?? 'La operación entra en conflicto con el estado actual del pago.';
    case 422:
      return detalle ?? 'Revisa los datos ingresados: hay valores inválidos o incompletos.';
    case 400:
      return detalle ?? 'La operación o los datos enviados no son válidos.';
    default:
      return error.status >= 500
        ? 'El servidor no pudo completar la operación. Intenta nuevamente en unos minutos.'
        : alternativa;
  }
}

/** Número de comprobante visible, derivado del identificador real del pago. */
export function referenciaPago(pagoId: number): string {
  return `#PAG-${String(pagoId).padStart(5, '0')}`;
}
