import { HttpErrorResponse } from '@angular/common/http';

import { MenuFuncion } from '../../../../../core/models/menu.models';
import {
  formatearFechaHora,
  formatearMonto,
  normalizarTexto,
} from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';

/** Reexportados para que las páginas de CU32/CU33 importen un único módulo. */
export { formatearFechaHora, formatearMonto, normalizarTexto };

/**
 * Contratos del CU32 (planes de pago) y CU33 (cuotas).
 *
 * Fuente de verdad: `app/modules/gestion_pagos/schemas/planes_cuotas.py`
 * y `app/modules/gestion_pagos/api/planes_cuotas.py` del backend.
 *
 * Los importes viajan como cadena decimal (`"300.00"`), tal como los
 * serializa Pydantic; la UI nunca los convierte a `number` para enviarlos.
 */

export type EstadoPlan = 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
export type EstadoCuota = 'PENDIENTE' | 'VENCIDA' | 'PAGADA' | 'CANCELADA';
export type MetodoPagoCuota = 'EFECTIVO' | 'TRANSFERENCIA' | 'QR';

export const ESTADOS_PLAN: ReadonlyArray<EstadoPlan> = ['ACTIVO', 'COMPLETADO', 'CANCELADO'];
export const METODOS_COBRO: ReadonlyArray<MetodoPagoCuota> = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'QR',
];

/** Tope de cuotas que acepta el backend (`CuotaPlanCrear` 1..120). */
export const MAX_CUOTAS = 120;

export interface CuotaPlanCrear {
  numero_cuota: number;
  monto_programado: string;
  fecha_vencimiento: string;
}

export interface PlanPagoCrear {
  paciente_id: number;
  consulta_clinica_id: number;
  servicio_realizado_ids: number[];
  cuotas: CuotaPlanCrear[];
  observaciones?: string | null;
}

export interface ServicioDisponiblePlan {
  servicio_realizado_id: number;
  nombre_servicio: string;
  precio_aplicado: string;
  saldo_cobrado: string;
  saldo_disponible: string;
  disponible: boolean;
  conflicto: string | null;
}

export interface ServiciosDisponiblesPlanRespuesta {
  paciente_id: number;
  consulta_clinica_id: number;
  servicios: ServicioDisponiblePlan[];
  total_disponible: string;
}

export interface ServicioPlanRespuesta {
  servicio_realizado_id: number;
  nombre_servicio: string;
  monto_financiado: string;
  activo: boolean;
}

export interface PagoCuotaResumen {
  pago_id: number;
  metodo_pago: string;
  estado: string;
  monto: string;
  fecha_creacion: string;
  aplicado_a_cuota: boolean;
}

export interface CuotaRespuesta {
  id: number;
  numero_cuota: number;
  monto_programado: string;
  fecha_vencimiento: string;
  estado: EstadoCuota;
  pagos: PagoCuotaResumen[];
}

export interface PlanPagoRespuesta {
  id: number;
  paciente_id: number;
  consulta_clinica_id: number;
  monto_total: string;
  moneda: string;
  cantidad_cuotas: number;
  fecha_creacion: string;
  estado: EstadoPlan;
  observaciones: string | null;
  creado_por: number;
  saldo_pendiente: string;
  monto_pagado: string;
  servicios: ServicioPlanRespuesta[];
  cuotas: CuotaRespuesta[];
}

export interface PlanPagoListadoItem {
  id: number;
  paciente_id: number;
  consulta_clinica_id: number;
  monto_total: string;
  monto_pagado: string;
  saldo_pendiente: string;
  moneda: string;
  cantidad_cuotas: number;
  cuotas_pagadas: number;
  fecha_creacion: string;
  estado: EstadoPlan;
  tiene_cuotas_vencidas: boolean;
}

export interface PlanesPagoPagina {
  items: PlanPagoListadoItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FiltrosPlanes {
  paciente_id?: number | null;
  estado?: EstadoPlan | null;
  page?: number;
  page_size?: number;
}

export interface CancelarPlanPago {
  motivo: string;
}

export interface PagoCuotaCrear {
  metodo_pago: MetodoPagoCuota;
  referencia_bancaria?: string | null;
  observaciones?: string | null;
}

export interface PagoCuotaRespuesta {
  pago_id: number;
  cuota_id: number;
  plan_pago_id: number;
  monto: string;
  moneda: string;
  metodo_pago: string;
  estado_pago: string;
  estado_cuota: EstadoCuota;
  aplicado_a_cuota: boolean;
  referencia_bancaria: string | null;
}

export interface IntentosCuotaRespuesta {
  cuota_id: number;
  estado_cuota: EstadoCuota;
  intentos: PagoCuotaResumen[];
}


/** Consulta clínica mínima para elegir la atención que se va a financiar. */
export interface ConsultaPaciente {
  id: number;
  fecha: string | null;
  motivo: string | null;
  activa: boolean;
}

/**
 * Origen de las consultas listadas:
 * - `historial`: `GET /historial-clinico/consultas?paciente_id=…`
 * - `pagos`: respaldo con `GET /pagos/administrativos/servicios-pendientes`
 *   cuando el usuario no tiene lectura del historial clínico.
 */
export interface ConsultasPacienteResultado {
  consultas: ConsultaPaciente[];
  origen: 'historial' | 'pagos';
}

export interface PermisosPlanesCuotas {
  /** `Gestionar planes de pago` (LECTURA): listado, detalle y servicios. */
  verPlanes: boolean;
  /** `Gestionar planes de pago` (ESCRITURA): crear y cancelar planes. */
  escribirPlanes: boolean;
  /** `Gestionar cuotas` (LECTURA): intentos y estado de cuotas. */
  verCuotas: boolean;
  /** `Gestionar cuotas` (ESCRITURA): cobrar, confirmar y rechazar. */
  escribirCuotas: boolean;
}

const SIN_PERMISOS: PermisosPlanesCuotas = {
  verPlanes: false,
  escribirPlanes: false,
  verCuotas: false,
  escribirCuotas: false,
};

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

/** Traduce las funciones de `/seguridad/menu` a capacidades de CU32/CU33. */
export function permisosPlanesCuotas(
  funciones: ReadonlyArray<MenuFuncion> | null | undefined,
): PermisosPlanesCuotas {
  if (!funciones?.length) {
    return SIN_PERMISOS;
  }

  let verPlanes = false;
  let escribirPlanes = false;
  let verCuotas = false;
  let escribirCuotas = false;

  for (const funcion of funciones) {
    const nombre = normalizarTexto(funcion?.nombre);
    if (nombre === 'gestionar planes de pago') {
      verPlanes = verPlanes || accionPermite(funcion?.accion_nombre, 'lectura');
      escribirPlanes = escribirPlanes || accionPermite(funcion?.accion_nombre, 'escritura');
    } else if (nombre === 'gestionar cuotas') {
      verCuotas = verCuotas || accionPermite(funcion?.accion_nombre, 'lectura');
      escribirCuotas = escribirCuotas || accionPermite(funcion?.accion_nombre, 'escritura');
    }
  }

  return { verPlanes, escribirPlanes, verCuotas, escribirCuotas };
}

export function sinPermisosPlanesCuotas(): PermisosPlanesCuotas {
  return { ...SIN_PERMISOS };
}

/* ============================================================
 * Formatos y etiquetas
 * ============================================================ */

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Importe con dos decimales: `"300.00"` → `"Bs 300,00"`. */
export function formatearMontoPlan(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : formatearMonto(valor);
}

/** Importe sin los centavos cuando son `,00` (tarjetas de indicadores). */
export function formatearMontoCorto(valor: string | number | null | undefined): string {
  const texto = formatearMontoPlan(valor);
  return texto.endsWith(',00') ? texto.slice(0, -3) : texto;
}

function partesFecha(valor: string | null | undefined): [number, number, number] | null {
  if (!valor) {
    return null;
  }
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
  if (!coincidencia) {
    return null;
  }
  return [Number(coincidencia[1]), Number(coincidencia[2]), Number(coincidencia[3])];
}

/** `"2026-11-05"` → `"05 nov 2026"`. Las fechas DATE no se convierten de zona. */
export function formatearFechaTabla(fecha: string | null | undefined): string {
  const partes = partesFecha(fecha);
  if (!partes) {
    return '—';
  }
  const [anio, mes, dia] = partes;
  return `${String(dia).padStart(2, '0')} ${MESES_CORTOS[mes - 1] ?? ''} ${anio}`.trim();
}

/** `"2026-11-05"` → `"5 de noviembre de 2026"`. */
export function formatearFechaLarga(fecha: string | null | undefined): string {
  const partes = partesFecha(fecha);
  if (!partes) {
    return '—';
  }
  const [anio, mes, dia] = partes;
  return `${dia} de ${MESES_LARGOS[mes - 1] ?? ''} de ${anio}`;
}

export function formatearFechaHoraPlan(iso: string | null | undefined): string {
  return formatearFechaHora(iso);
}

export function etiquetaEstadoPlan(estado: EstadoPlan): string {
  switch (estado) {
    case 'ACTIVO':
      return 'Activo';
    case 'COMPLETADO':
      return 'Completado';
    default:
      return 'Cancelado';
  }
}

export function etiquetaEstadoCuota(estado: EstadoCuota): string {
  switch (estado) {
    case 'PAGADA':
      return 'Pagada';
    case 'VENCIDA':
      return 'Vencida';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

export function etiquetaMetodoCobro(metodo: string): string {
  switch (metodo) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'TRANSFERENCIA':
      return 'Transferencia';
    case 'QR':
      return 'QR';
    default:
      return 'Otro';
  }
}

/** Estados de pago que devuelve el backend para un cobro de cuota. */
export function etiquetaEstadoPagoCuota(estado: string): string {
  switch (estado) {
    case 'APROBADO':
      return 'Aprobado';
    case 'PENDIENTE':
      return 'Pendiente';
    case 'RECHAZADO':
      return 'Rechazado';
    case 'ANULADO':
      return 'Anulado';
    default:
      return estado || '—';
  }
}

/** Iniciales para el avatar del listado (`María López` → `ML`). */
export function inicialesPaciente(
  nombres: string | null | undefined,
  apellidos: string | null | undefined,
): string {
  const inicial = (texto: string | null | undefined) => (texto ?? '').trim().charAt(0).toUpperCase();
  return `${inicial(nombres)}${inicial(apellidos)}` || '··';
}

/* ============================================================
 * Importes y cronograma
 * ============================================================ */

/** Convierte `"1200.50"` a centavos exactos (evita errores de coma flotante). */
export function montoACentavos(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) {
    return 0;
  }
  const texto = (typeof valor === 'number' ? valor.toFixed(2) : valor).trim();
  const coincidencia = /^(-)?(\d+)(?:\.(\d{1,4}))?$/.exec(texto);
  if (!coincidencia) {
    const numero = Number(texto);
    return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
  }
  const signo = coincidencia[1] ? -1 : 1;
  const enteros = Number(coincidencia[2]);
  const decimales = Number((coincidencia[3] ?? '').padEnd(2, '0').slice(0, 2));
  return signo * (enteros * 100 + decimales);
}

/** Centavos → cadena decimal con dos dígitos (`"1200.00"`). */
export function centavosAMonto(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(Math.round(centavos));
  const enteros = Math.trunc(absoluto / 100);
  const resto = absoluto % 100;
  return `${signo}${enteros}.${String(resto).padStart(2, '0')}`;
}

function fechaISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Suma meses a una fecha `YYYY-MM-DD` ajustando el día al último del mes. */
export function sumarMeses(fecha: string, meses: number): string {
  const partes = partesFecha(fecha);
  if (!partes) {
    return fecha;
  }
  const [anio, mes, dia] = partes;
  const base = new Date(anio, mes - 1 + meses, 1);
  const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return fechaISO(base.getFullYear(), base.getMonth() + 1, Math.min(dia, ultimoDia));
}

/** Fecha local de hoy en formato `YYYY-MM-DD`. */
export function fechaHoyISO(): string {
  const hoy = new Date();
  return fechaISO(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
}

/**
 * Propone un cronograma con importes iguales en centavos exactos y
 * vencimientos mensuales consecutivos. El residuo de redondeo se asigna a la
 * última cuota para que la sumatoria coincida con el total.
 */
export function distribuirCuotas(
  total: string | number,
  cantidad: number,
  primerVencimiento: string,
): CuotaPlanCrear[] {
  const totalCentavos = montoACentavos(total);
  const numeroCuotas = Math.trunc(cantidad);
  if (numeroCuotas < 1 || totalCentavos <= 0) {
    return [];
  }
  const base = Math.trunc(totalCentavos / numeroCuotas);
  const residuo = totalCentavos - base * numeroCuotas;

  return Array.from({ length: numeroCuotas }, (_, indice) => ({
    numero_cuota: indice + 1,
    monto_programado: centavosAMonto(indice === numeroCuotas - 1 ? base + residuo : base),
    fecha_vencimiento: sumarMeses(primerVencimiento, indice),
  }));
}

export interface ResultadoCronograma {
  valido: boolean;
  mensaje: string | null;
  totalCentavos: number;
}

/**
 * Reglas del backend: cuotas consecutivas desde 1, fechas cronológicas,
 * importes positivos con dos decimales y sumatoria exacta del total.
 */
export function validarCronograma(
  cuotas: ReadonlyArray<CuotaPlanCrear>,
  totalEsperado: string | number,
): ResultadoCronograma {
  const totalCentavos = cuotas.reduce(
    (acumulado, cuota) => acumulado + montoACentavos(cuota.monto_programado),
    0,
  );

  if (!cuotas.length) {
    return { valido: false, mensaje: 'Añade al menos una cuota al cronograma.', totalCentavos };
  }

  const esperado = montoACentavos(totalEsperado);
  let anterior = '';

  for (const [indice, cuota] of cuotas.entries()) {
    if (cuota.numero_cuota !== indice + 1) {
      return { valido: false, mensaje: 'Las cuotas deben numerarse de forma consecutiva desde 1.', totalCentavos };
    }
    if (!/^\d+\.\d{2}$/.test(cuota.monto_programado.trim())) {
      return { valido: false, mensaje: 'Cada importe debe tener exactamente dos decimales.', totalCentavos };
    }
    if (montoACentavos(cuota.monto_programado) <= 0) {
      return { valido: false, mensaje: 'Cada cuota debe tener un importe mayor que cero.', totalCentavos };
    }
    if (!partesFecha(cuota.fecha_vencimiento)) {
      return { valido: false, mensaje: 'Cada cuota necesita una fecha de vencimiento válida.', totalCentavos };
    }
    if (anterior && cuota.fecha_vencimiento < anterior) {
      return {
        valido: false,
        mensaje: 'Las fechas de vencimiento deben estar en orden cronológico.',
        totalCentavos,
      };
    }
    anterior = cuota.fecha_vencimiento;
  }

  if (totalCentavos !== esperado) {
    return {
      valido: false,
      mensaje: `La suma de las cuotas debe ser exactamente ${formatearMontoPlan(centavosAMonto(esperado))}.`,
      totalCentavos,
    };
  }

  return { valido: true, mensaje: null, totalCentavos };
}

/* ============================================================
 * Derivaciones desde datos reales del plan
 * ============================================================ */

export function cuotasPagadasDePlan(plan: Pick<PlanPagoRespuesta, 'cuotas'>): number {
  return plan.cuotas.filter((cuota) => cuota.estado === 'PAGADA').length;
}

/** Avance de cobro calculado sobre el total y lo efectivamente pagado. */
export function progresoPlan(plan: Pick<PlanPagoRespuesta, 'monto_total' | 'monto_pagado'>): number {
  const total = montoACentavos(plan.monto_total);
  if (total <= 0) {
    return 0;
  }
  const porcentaje = Math.round((montoACentavos(plan.monto_pagado) / total) * 100);
  return Math.min(100, Math.max(0, porcentaje));
}

/** Primera cuota exigible por fecha (PENDIENTE o VENCIDA derivada del backend). */
export function proximoVencimiento(plan: Pick<PlanPagoRespuesta, 'cuotas'>): CuotaRespuesta | null {
  const exigibles = plan.cuotas
    .filter((cuota) => cuota.estado === 'PENDIENTE' || cuota.estado === 'VENCIDA')
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  return exigibles[0] ?? null;
}

export function puedeCobrarCuota(cuota: Pick<CuotaRespuesta, 'estado'>): boolean {
  return cuota.estado === 'PENDIENTE' || cuota.estado === 'VENCIDA';
}

/** Intentos pendientes de confirmación de una cuota (QR/transferencia). */
export function pagosPendientesCuota(
  cuota: Pick<CuotaRespuesta, 'pagos'>,
): PagoCuotaResumen[] {
  return cuota.pagos.filter((pago) => pago.estado === 'PENDIENTE');
}

/** Último pago aprobado de la cuota, base del comprobante. */
export function pagoAprobadoCuota(cuota: Pick<CuotaRespuesta, 'pagos'>): PagoCuotaResumen | null {
  return cuota.pagos.find((pago) => pago.estado === 'APROBADO') ?? null;
}

/** El comprobante sólo existe para pagos APROBADOS y exige lectura de cuotas. */
export function puedeDescargarComprobanteCuota(pago: Pick<PagoCuotaResumen, 'estado'>): boolean {
  return pago.estado === 'APROBADO';
}

/**
 * Regla del backend (`cancelar_plan` en CU32): un plan con cualquier cobro
 * aprobado no puede cancelarse, aunque queden cuotas pendientes.
 */
export function planTieneCobrosAprobados(plan: Pick<PlanPagoRespuesta, 'cuotas'>): boolean {
  return plan.cuotas.some((cuota) => cuota.pagos.some((pago) => pago.estado === 'APROBADO'));
}

/** Sólo un plan ACTIVO sin cobros aprobados puede cancelarse. */
export function puedeCancelarPlanPago(
  plan: Pick<PlanPagoRespuesta, 'estado' | 'cuotas'>,
): boolean {
  return plan.estado === 'ACTIVO' && !planTieneCobrosAprobados(plan);
}

/** Explicación que acompaña al botón de cancelación deshabilitado. */
export const MOTIVO_CANCELACION_BLOQUEADA =
  'El plan ya tiene cobros aprobados y no puede cancelarse: el servidor conserva los pagos registrados.';

export interface PagoPendientePlan {
  cuota: CuotaRespuesta;
  pago: PagoCuotaResumen;
}

/** Cobros pendientes de verificación del plan cargado. */
export function pagosPendientesPlan(plan: Pick<PlanPagoRespuesta, 'cuotas'>): PagoPendientePlan[] {
  return plan.cuotas.flatMap((cuota) =>
    pagosPendientesCuota(cuota).map((pago) => ({ cuota, pago })),
  );
}

/** Clave estable por intento de creación: se reutiliza si la respuesta es incierta. */
export function generarClaveIdempotencia(prefijo: 'plan' | 'cuota'): string {
  const aleatorio =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefijo}-${aleatorio}`;
}

/**
 * Mensaje legible para los errores del backend. `alternativa` describe la
 * acción que falló ("crear el plan", "registrar el cobro", …).
 */
export function mensajeErrorPlanes(error: unknown, alternativa: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return `No se pudo ${alternativa}. Revisa la conexión e inténtalo de nuevo.`;
  }

  const detalle = extraerDetalle(error);

  switch (error.status) {
    case 0:
      return `No se pudo ${alternativa}: el servidor no respondió. Verifica la conexión.`;
    case 400:
    case 422:
      return detalle || `Revisa los datos: no se pudo ${alternativa}.`;
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
    case 403:
      return `No tienes permisos para ${alternativa}.`;
    case 404:
      return `No se encontró el registro solicitado al ${alternativa}.`;
    case 409:
      return detalle || `La operación no está disponible ahora: no se pudo ${alternativa}.`;
    default:
      return detalle || `No se pudo ${alternativa}. Inténtalo de nuevo en unos segundos.`;
  }
}

/**
 * Mensaje legible al descargar el comprobante PDF de un pago de cuota.
 * La respuesta es binaria: si el fallo llega del backend se traduce como el
 * resto de CU33 y, si procede del servicio (por ejemplo un PDF vacío), se
 * conserva el texto del servicio.
 */
export function mensajeErrorDescargaComprobante(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return mensajeErrorPlanes(error, 'descargar el comprobante');
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'No se pudo descargar el comprobante. Inténtalo de nuevo.';
}

function extraerDetalle(error: HttpErrorResponse): string {
  const cuerpo = error.error;
  if (typeof cuerpo === 'string') {
    return cuerpo;
  }
  if (cuerpo && typeof cuerpo === 'object' && 'detail' in cuerpo) {
    const detalle = (cuerpo as { detail?: unknown }).detail;
    if (typeof detalle === 'string') {
      return detalle;
    }
    if (Array.isArray(detalle)) {
      return detalle
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg?: unknown }).msg ?? '')
            : '',
        )
        .filter(Boolean)
        .join(' ');
    }
  }
  return '';
}

