import { HttpErrorResponse } from '@angular/common/http';

import { MenuModulo } from '../../../../../core/models/menu.models';
import {
  CuotaRespuesta,
  MOTIVO_CANCELACION_BLOQUEADA,
  PagoCuotaResumen,
  PlanPagoRespuesta,
  centavosAMonto,
  cuotasPagadasDePlan,
  distribuirCuotas,
  etiquetaEstadoCuota,
  etiquetaEstadoPlan,
  etiquetaMetodoCobro,
  generarClaveIdempotencia,
  mensajeErrorDescargaComprobante,
  mensajeErrorPlanes,
  montoACentavos,
  pagosPendientesPlan,
  permisosPlanesCuotas,
  planTieneCobrosAprobados,
  progresoPlan,
  proximoVencimiento,
  puedeCancelarPlanPago,
  puedeCobrarCuota,
  puedeDescargarComprobanteCuota,
  sinPermisosPlanesCuotas,
  sumarMeses,
  validarCronograma,
} from './planes-cuotas.models';

function pago(estado: string, pagoId = 1): PagoCuotaResumen {
  return {
    pago_id: pagoId,
    metodo_pago: 'QR',
    estado,
    monto: '100.00',
    fecha_creacion: '2026-10-01T12:00:00.000Z',
    aplicado_a_cuota: estado === 'APROBADO',
  };
}

function cuota(
  id: number,
  numero: number,
  estado: CuotaRespuesta['estado'],
  fecha: string,
  pagos: PagoCuotaResumen[] = [],
): CuotaRespuesta {
  return {
    id,
    numero_cuota: numero,
    monto_programado: '100.00',
    fecha_vencimiento: fecha,
    estado,
    pagos,
  };
}

function plan(cuotas: CuotaRespuesta[]): PlanPagoRespuesta {
  return {
    id: 9,
    paciente_id: 7,
    consulta_clinica_id: 142,
    monto_total: '300.00',
    moneda: 'BOB',
    cantidad_cuotas: cuotas.length,
    fecha_creacion: '2026-09-01T12:00:00.000Z',
    estado: 'ACTIVO',
    observaciones: null,
    creado_por: 4,
    saldo_pendiente: '100.00',
    monto_pagado: '100.00',
    servicios: [],
    cuotas,
  };
}

const MENU_PAGOS: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 3, accion_nombre: 'AMBAS' },
    { id: 41, nombre: 'Gestionar cuotas', accion_id: 1, accion_nombre: 'LECTURA' },
  ],
};

describe('CU32/CU33 — utilidades de planes y cuotas', () => {
  it('convierte importes decimales a centavos sin errores de coma flotante', () => {
    expect(montoACentavos('150.25')).toBe(15025);
    expect(montoACentavos('150.5')).toBe(15050);
    expect(montoACentavos('0.07')).toBe(7);
    expect(montoACentavos(null)).toBe(0);
    expect(centavosAMonto(15025)).toBe('150.25');
    expect(centavosAMonto(7)).toBe('0.07');
  });

  it('distribuye el residuo de redondeo en la última cuota', () => {
    const cuotas = distribuirCuotas('100.00', 3, '2026-01-31');

    expect(cuotas.map((cuota) => cuota.monto_programado)).toEqual([
      '33.33',
      '33.33',
      '33.34',
    ]);
    expect(cuotas.map((cuota) => cuota.numero_cuota)).toEqual([1, 2, 3]);
    expect(cuotas.map((cuota) => cuota.fecha_vencimiento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('no propone cuotas sin importe o sin cantidad válida', () => {
    expect(distribuirCuotas('0.00', 3, '2026-01-31')).toEqual([]);
    expect(distribuirCuotas('100.00', 0, '2026-01-31')).toEqual([]);
  });

  it('avanza los vencimientos respetando el último día del mes', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2024-01-31', 1)).toBe('2024-02-29');
    expect(sumarMeses('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('valida el cronograma con las reglas del backend', () => {
    const valido = distribuirCuotas('100.00', 3, '2026-01-31');
    expect(validarCronograma(valido, '100.00').valido).toBe(true);
    expect(validarCronograma([], '100.00').valido).toBe(false);

    const sumaIncorrecta = validarCronograma(valido, '120.00');
    expect(sumaIncorrecta.valido).toBe(false);
    expect(sumaIncorrecta.mensaje).toContain('La suma de las cuotas');

    const desordenado = validarCronograma(
      [
        { numero_cuota: 1, monto_programado: '50.00', fecha_vencimiento: '2026-03-01' },
        { numero_cuota: 2, monto_programado: '50.00', fecha_vencimiento: '2026-02-01' },
      ],
      '100.00',
    );
    expect(desordenado.valido).toBe(false);
    expect(desordenado.mensaje).toContain('orden cronológico');

    const decimales = validarCronograma(
      [{ numero_cuota: 1, monto_programado: '100', fecha_vencimiento: '2026-02-01' }],
      '100.00',
    );
    expect(decimales.valido).toBe(false);
    expect(decimales.mensaje).toContain('dos decimales');
  });

  it('traduce las funciones del menú a permisos de planes y cuotas', () => {
    const permisos = permisosPlanesCuotas(MENU_PAGOS.funciones);

    expect(permisos).toEqual({
      verPlanes: true,
      escribirPlanes: true,
      verCuotas: true,
      escribirCuotas: false,
    });
    expect(permisosPlanesCuotas([])).toEqual(sinPermisosPlanesCuotas());
    expect(
      permisosPlanesCuotas([
        { id: 1, nombre: 'Gestionar pacientes', accion_id: 3, accion_nombre: 'AMBAS' },
      ]),
    ).toEqual(sinPermisosPlanesCuotas());
  });

  it('calcula el avance real del plan entre 0 y 100', () => {
    const base = plan([cuota(1, 1, 'PAGADA', '2026-10-01')]);
    expect(progresoPlan({ ...base, monto_pagado: '100.00' })).toBe(33);
    expect(progresoPlan({ ...base, monto_pagado: '500.00' })).toBe(100);
    expect(progresoPlan({ ...base, monto_total: '0.00' })).toBe(0);
    expect(cuotasPagadasDePlan(base)).toBe(1);
  });

  it('elige la próxima cuota exigible y descarta las cerradas', () => {
    const datos = plan([
      cuota(1, 1, 'PAGADA', '2026-09-01'),
      cuota(2, 2, 'PENDIENTE', '2026-11-01'),
      cuota(3, 3, 'VENCIDA', '2026-10-01'),
      cuota(4, 4, 'CANCELADA', '2026-12-01'),
    ]);

    expect(proximoVencimiento(datos)?.id).toBe(3);
    expect(puedeCobrarCuota(datos.cuotas[2])).toBe(true);
    expect(puedeCobrarCuota(datos.cuotas[0])).toBe(false);
    expect(proximoVencimiento(plan([cuota(1, 1, 'PAGADA', '2026-09-01')]))).toBeNull();
  });

  it('lista los cobros pendientes de verificación por cuota', () => {
    const datos = plan([
      cuota(1, 1, 'PENDIENTE', '2026-10-01', [pago('PENDIENTE', 31), pago('APROBADO', 32)]),
      cuota(2, 2, 'PENDIENTE', '2026-11-01', [pago('RECHAZADO', 33)]),
      cuota(3, 3, 'PENDIENTE', '2026-12-01', [pago('PENDIENTE', 34)]),
    ]);

    const pendientes = pagosPendientesPlan(datos);
    expect(pendientes.map((item) => item.pago.pago_id)).toEqual([31, 34]);
    expect(pendientes[0].cuota.id).toBe(1);
  });

  it('genera claves de idempotencia con el prefijo de la operación', () => {
    expect(generarClaveIdempotencia('plan')).toMatch(/^plan-/);
    expect(generarClaveIdempotencia('cuota')).toMatch(/^cuota-/);
  });

  it('explica los errores HTTP del backend sin filtrar detalles técnicos', () => {
    const forbidden = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
    expect(mensajeErrorPlanes(forbidden, 'crear el plan')).toBe(
      'No tienes permisos para crear el plan.',
    );

    const conflicto = new HttpErrorResponse({
      status: 409,
      error: { detail: 'La cuota ya fue cobrada.' },
    });
    expect(mensajeErrorPlanes(conflicto, 'registrar el cobro')).toBe('La cuota ya fue cobrada.');

    expect(mensajeErrorPlanes(new Error('boom'), 'cargar los planes de pago')).toBe(
      'No se pudo cargar los planes de pago. Revisa la conexión e inténtalo de nuevo.',
    );
  });

  it('sólo ofrece el comprobante de los pagos aprobados de la cuota', () => {
    expect(puedeDescargarComprobanteCuota(pago('APROBADO'))).toBe(true);
    expect(puedeDescargarComprobanteCuota(pago('PENDIENTE'))).toBe(false);
    expect(puedeDescargarComprobanteCuota(pago('RECHAZADO'))).toBe(false);
    expect(puedeDescargarComprobanteCuota(pago('ANULADO'))).toBe(false);
  });

  it('bloquea la cancelación del plan cuando ya existe un cobro aprobado', () => {
    const sinCobros = plan([
      cuota(1, 1, 'PENDIENTE', '2026-11-01'),
      cuota(2, 2, 'PENDIENTE', '2026-12-01', [pago('PENDIENTE', 41)]),
    ]);
    expect(planTieneCobrosAprobados(sinCobros)).toBe(false);
    expect(puedeCancelarPlanPago(sinCobros)).toBe(true);

    const conCobro = plan([
      cuota(1, 1, 'PAGADA', '2026-10-01', [pago('APROBADO', 42)]),
      cuota(2, 2, 'PENDIENTE', '2026-11-01'),
    ]);
    expect(planTieneCobrosAprobados(conCobro)).toBe(true);
    expect(puedeCancelarPlanPago(conCobro)).toBe(false);
    expect(puedeCancelarPlanPago({ ...sinCobros, estado: 'CANCELADO' })).toBe(false);
    expect(puedeCancelarPlanPago({ ...sinCobros, estado: 'COMPLETADO' })).toBe(false);
    expect(MOTIVO_CANCELACION_BLOQUEADA).toContain('cobros aprobados');
  });

  it('traduce los errores de la descarga del comprobante PDF', () => {
    expect(
      mensajeErrorDescargaComprobante(new Error('El servidor no devolvió un comprobante PDF.')),
    ).toContain('no devolvió');

    expect(mensajeErrorDescargaComprobante(new HttpErrorResponse({ status: 403 }))).toBe(
      'No tienes permisos para descargar el comprobante.',
    );
    expect(mensajeErrorDescargaComprobante(new HttpErrorResponse({ status: 404 }))).toContain(
      'No se encontró',
    );
    expect(mensajeErrorDescargaComprobante(undefined)).toContain('No se pudo descargar');
  });

  it('etiqueta estados y métodos de cobro en español', () => {
    expect(etiquetaEstadoPlan('ACTIVO')).toBe('Activo');
    expect(etiquetaEstadoPlan('CANCELADO')).toBe('Cancelado');
    expect(etiquetaEstadoCuota('VENCIDA')).toBe('Vencida');
    expect(etiquetaMetodoCobro('TRANSFERENCIA')).toBe('Transferencia');
  });
});
