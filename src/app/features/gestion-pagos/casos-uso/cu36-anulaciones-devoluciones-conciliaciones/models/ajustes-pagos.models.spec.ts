import { HttpErrorResponse } from '@angular/common/http';

import { PagoAdministrativo } from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import {
  ESTADOS_AJUSTE,
  ESTADOS_CONCILIABLES,
  ESTADOS_REEMBOLSO_HUERFANO,
  NATURALEZAS_AJUSTE,
  PagoAjuste,
  RESULTADOS_CONCILIACION,
  ReembolsoHuerfano,
  TIPOS_AJUSTE,
  centavosDeMonto,
  descripcionEstadoAjuste,
  etiquetaEfectoCaja,
  etiquetaEstadoAjuste,
  etiquetaEstadoReembolsoHuerfano,
  etiquetaNaturalezaAjuste,
  etiquetaResultadoConciliacion,
  etiquetaTipoAjuste,
  generarClaveIdempotenciaAjuste,
  mensajeErrorAjuste,
  monedaValida,
  montoDeCentavos,
  montoDesdeUnidadesMenores,
  montoEsNegativo,
  puedeAnularPago,
  puedeAtribuirHuerfano,
  puedeConciliarAjuste,
  puedeCorregirPago,
  puedeReembolsarPago,
  requiereEvidenciaParaAnular,
  requiereEvidenciaParaCorreccionAlAlza,
  sumarMontos,
} from './ajustes-pagos.models';

function pago(overrides: Partial<PagoAdministrativo> = {}): PagoAdministrativo {
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

function ajuste(overrides: Partial<PagoAjuste> = {}): PagoAjuste {
  return {
    id: 55,
    pago_id: 1024,
    tipo: 'ANULACION',
    naturaleza: 'ERROR_DE_REGISTRO',
    efecto_caja: 'SIN_EFECTO',
    estado: 'PENDIENTE_PROVEEDOR',
    importe: '-380.00',
    moneda: 'BOB',
    motivo: 'Registro duplicado del mismo cobro',
    evidencia: null,
    referencia_externa: null,
    revertir_aplicacion_cuota: false,
    creado_por: 3,
    confirmado_por: null,
    conciliado_por: null,
    fecha_creacion: '2026-10-19T16:00:00Z',
    fecha_confirmacion: null,
    fecha_conciliacion: null,
    observaciones: null,
    detalles: [],
    ...overrides,
  };
}

function huerfano(overrides: Partial<ReembolsoHuerfano> = {}): ReembolsoHuerfano {
  return {
    id: 9,
    stripe_event_id: 'evt_123',
    event_type: 'charge.refunded',
    refund_id: 're_123',
    payment_intent_id: 'pi_123',
    amount: 1010,
    currency: 'BOB',
    status: 'succeeded',
    estado: 'PENDIENTE',
    ajuste_id: null,
    motivo: null,
    creado_en: '2026-10-19T16:10:00Z',
    ...overrides,
  };
}

describe('CU36 — importes con signo', () => {
  it('convierte cadenas decimales a centavos enteros', () => {
    expect(centavosDeMonto('380.00')).toBe(38000);
    expect(centavosDeMonto('5')).toBe(500);
    expect(centavosDeMonto('7.5')).toBe(750);
    expect(centavosDeMonto('0.00')).toBe(0);
    expect(centavosDeMonto('-5.00')).toBe(-500);
    expect(centavosDeMonto('-1234.56')).toBe(-123456);
    expect(centavosDeMonto(' -1234.56 ')).toBe(-123456);
  });

  it('rechaza contenido no numérico o con más de dos decimales', () => {
    expect(centavosDeMonto('no-numero')).toBeNull();
    expect(centavosDeMonto('')).toBeNull();
    expect(centavosDeMonto('12,50')).toBeNull();
    expect(centavosDeMonto('1.234')).toBeNull();
    expect(centavosDeMonto('1.2.3')).toBeNull();
    expect(centavosDeMonto(null)).toBeNull();
    expect(centavosDeMonto(undefined)).toBeNull();
  });

  it('devuelve siempre dos decimales y conserva el signo', () => {
    expect(montoDeCentavos(38000)).toBe('380.00');
    expect(montoDeCentavos(0)).toBe('0.00');
    expect(montoDeCentavos(5)).toBe('0.05');
    expect(montoDeCentavos(-500)).toBe('-5.00');
    expect(montoDeCentavos(-123456)).toBe('-1234.56');
  });

  it('hace ida y vuelta entre cadena y centavos', () => {
    for (const valor of ['0.00', '5.00', '-5.00', '380.00', '-1234.56']) {
      expect(montoDeCentavos(centavosDeMonto(valor) ?? 0)).toBe(valor);
    }
  });

  it('suma importes con signos mixtos ignorando los ausentes', () => {
    expect(sumarMontos(['100.00', '-30.50', null])).toBe('69.50');
    expect(sumarMontos(['-380.00', '120.00', undefined])).toBe('-260.00');
    expect(sumarMontos([])).toBe('0.00');
    expect(sumarMontos([null, undefined])).toBe('0.00');
  });

  it('invalida la suma si algún importe presente no es parseable', () => {
    expect(sumarMontos(['100.00', 'no-numero', null])).toBeNull();
  });

  it('detecta importes negativos sin aritmética de coma flotante', () => {
    expect(montoEsNegativo('-0.01')).toBe(true);
    expect(montoEsNegativo('-5.00')).toBe(true);
    expect(montoEsNegativo('0.00')).toBe(false);
    expect(montoEsNegativo('5.00')).toBe(false);
    expect(montoEsNegativo('no-numero')).toBe(false);
  });

  it('convierte unidades menores de Stripe a cadena decimal', () => {
    expect(montoDesdeUnidadesMenores(1010, 'BOB')).toBe('10.10');
    expect(montoDesdeUnidadesMenores(0, 'BOB')).toBe('0.00');
    expect(montoDesdeUnidadesMenores(-1010, 'BOB')).toBe('-10.10');
  });
});

describe('CU36 — elegibilidad observable', () => {
  it('permite anular sólo los pagos que aún no están cerrados', () => {
    expect(puedeAnularPago(pago({ estado: 'PENDIENTE' }))).toBe(true);
    expect(puedeAnularPago(pago({ estado: 'RECHAZADO' }))).toBe(true);
    expect(puedeAnularPago(pago({ estado: 'APROBADO' }))).toBe(true);
    expect(puedeAnularPago(pago({ estado: 'ANULADO' }))).toBe(false);
    expect(puedeAnularPago(pago({ estado: 'REEMBOLSADO' }))).toBe(false);
  });

  it('deja de ofrecer la anulación cuando ya hay devoluciones confirmadas', () => {
    expect(puedeAnularPago(pago({ estado: 'APROBADO', monto: '380.00', importe_vigente: '280.00' }))).toBe(
      false,
    );
    expect(puedeAnularPago(pago({ estado: 'APROBADO', monto: '380.00', importe_vigente: '380.00' }))).toBe(
      true,
    );
    expect(puedeAnularPago(pago({ estado: 'APROBADO', importe_vigente: null }))).toBe(true);
  });

  it('permite corregir sólo pagos aprobados sin ajustes abiertos', () => {
    expect(puedeCorregirPago(pago())).toBe(true);
    expect(puedeCorregirPago(pago({ estado: 'PENDIENTE' }))).toBe(false);
    expect(puedeCorregirPago(pago({ estado: 'ANULADO' }))).toBe(false);
    expect(puedeCorregirPago(pago({ ajustes_pendientes: true }))).toBe(false);
    expect(puedeCorregirPago(pago({ ajustes_pendientes: null }))).toBe(true);
  });

  it('permite reembolsar sólo pagos aprobados con importe vigente positivo', () => {
    expect(puedeReembolsarPago(pago())).toBe(true);
    expect(puedeReembolsarPago(pago({ estado: 'PENDIENTE' }))).toBe(false);
    expect(puedeReembolsarPago(pago({ estado: 'REEMBOLSADO' }))).toBe(false);
    expect(puedeReembolsarPago(pago({ ajustes_pendientes: true }))).toBe(false);
    expect(puedeReembolsarPago(pago({ importe_vigente: '0.00' }))).toBe(false);
    expect(puedeReembolsarPago(pago({ importe_vigente: '-1.00' }))).toBe(false);
    expect(puedeReembolsarPago(pago({ importe_vigente: null }))).toBe(false);
  });

  it('exige evidencia al anular un pago aprobado, sin importar el método', () => {
    expect(requiereEvidenciaParaAnular(pago({ estado: 'APROBADO' }))).toBe(true);
    expect(requiereEvidenciaParaAnular(pago({ estado: 'APROBADO', metodo_pago: 'EFECTIVO' }))).toBe(
      true,
    );
    expect(requiereEvidenciaParaAnular(pago({ estado: 'PENDIENTE' }))).toBe(false);
    expect(requiereEvidenciaParaAnular(pago({ estado: 'RECHAZADO' }))).toBe(false);
    expect(requiereEvidenciaParaAnular(pago({ estado: 'ANULADO' }))).toBe(false);
  });

  it('exige evidencia en las correcciones al alza', () => {
    expect(requiereEvidenciaParaCorreccionAlAlza('120.00')).toBe(true);
    expect(requiereEvidenciaParaCorreccionAlAlza('0.01')).toBe(true);
    expect(requiereEvidenciaParaCorreccionAlAlza('0.00')).toBe(false);
    expect(requiereEvidenciaParaCorreccionAlAlza('-120.00')).toBe(false);
    expect(requiereEvidenciaParaCorreccionAlAlza('no-numero')).toBe(false);
    // El backend admite más de dos decimales y luego cuantiza sin cambiar el signo.
    expect(requiereEvidenciaParaCorreccionAlAlza('10.005')).toBe(true);
    expect(requiereEvidenciaParaCorreccionAlAlza('-0.004')).toBe(false);
  });

  it('sólo acepta monedas de tres letras mayúsculas', () => {
    expect(monedaValida('BOB')).toBe(true);
    expect(monedaValida('bob')).toBe(false);
    expect(monedaValida('BO')).toBe(false);
    expect(monedaValida('BOBS')).toBe(false);
    expect(monedaValida(null)).toBe(false);
    expect(monedaValida(undefined)).toBe(false);
  });

  it('sólo concilia los estados que el backend acepta', () => {
    expect(ESTADOS_CONCILIABLES).toEqual(['PENDIENTE_PROVEEDOR', 'DESCONOCIDO', 'FALLIDO']);
    expect(puedeConciliarAjuste(ajuste({ estado: 'PENDIENTE_PROVEEDOR' }))).toBe(true);
    expect(puedeConciliarAjuste(ajuste({ estado: 'DESCONOCIDO' }))).toBe(true);
    expect(puedeConciliarAjuste(ajuste({ estado: 'FALLIDO' }))).toBe(true);
    expect(puedeConciliarAjuste(ajuste({ estado: 'CONFIRMADO' }))).toBe(false);
    expect(puedeConciliarAjuste(ajuste({ estado: 'CANCELADO' }))).toBe(false);
  });

  it('sólo atribuye reembolsos huérfanos pendientes', () => {
    expect(puedeAtribuirHuerfano(huerfano())).toBe(true);
    expect(puedeAtribuirHuerfano(huerfano({ estado: 'ATRIBUIDO' }))).toBe(false);
    expect(puedeAtribuirHuerfano(huerfano({ estado: 'DESCARTADO' }))).toBe(false);
  });
});

describe('CU36 — etiquetas y descripciones', () => {
  it('etiqueta todos los tipos de ajuste', () => {
    for (const tipo of TIPOS_AJUSTE) {
      expect(etiquetaTipoAjuste(tipo).length).toBeGreaterThan(0);
    }
    expect(etiquetaTipoAjuste('ANULACION')).toBe('Anulación');
    expect(etiquetaTipoAjuste('RECONCILIACION')).toBe('Conciliación');
  });

  it('etiqueta todas las naturalezas de ajuste', () => {
    for (const naturaleza of NATURALEZAS_AJUSTE) {
      expect(etiquetaNaturalezaAjuste(naturaleza).length).toBeGreaterThan(0);
    }
    expect(NATURALEZAS_AJUSTE).toHaveLength(7);
    expect(etiquetaNaturalezaAjuste('PAGO_DUPLICADO')).toBe('Pago duplicado');
  });

  it('etiqueta todos los estados de ajuste', () => {
    for (const estado of ESTADOS_AJUSTE) {
      expect(etiquetaEstadoAjuste(estado).length).toBeGreaterThan(0);
      expect(descripcionEstadoAjuste(estado).length).toBeGreaterThan(0);
    }
    expect(ESTADOS_AJUSTE).toHaveLength(5);
    expect(etiquetaEstadoAjuste('DESCONOCIDO')).toBe('Estado desconocido');
  });

  it('deja claro que pendiente y desconocido no son un éxito', () => {
    expect(descripcionEstadoAjuste('PENDIENTE_PROVEEDOR')).toContain('todavía no confirma');
    expect(descripcionEstadoAjuste('PENDIENTE_PROVEEDOR')).not.toContain('confirmad');
    expect(descripcionEstadoAjuste('DESCONOCIDO')).toContain('desconocido');
    expect(descripcionEstadoAjuste('DESCONOCIDO')).toContain('conciliación');
    expect(descripcionEstadoAjuste('CONFIRMADO')).toContain('confirmada');
  });

  it('etiqueta los efectos de caja, los resultados y los huérfanos', () => {
    for (const efecto of ['SIN_EFECTO', 'DEVOLUCION_MANUAL', 'DEVOLUCION_STRIPE'] as const) {
      expect(etiquetaEfectoCaja(efecto).length).toBeGreaterThan(0);
    }
    for (const resultado of RESULTADOS_CONCILIACION) {
      expect(etiquetaResultadoConciliacion(resultado).length).toBeGreaterThan(0);
    }
    for (const estado of ESTADOS_REEMBOLSO_HUERFANO) {
      expect(etiquetaEstadoReembolsoHuerfano(estado).length).toBeGreaterThan(0);
    }
    expect(etiquetaEfectoCaja('DEVOLUCION_STRIPE')).toContain('proveedor');
    expect(etiquetaEstadoReembolsoHuerfano('PENDIENTE')).toContain('Pendiente');
  });
});

describe('CU36 — idempotencia y errores', () => {
  it('genera claves válidas para el header del backend', () => {
    const primera = generarClaveIdempotenciaAjuste('anulacion');
    const segunda = generarClaveIdempotenciaAjuste('anulacion');
    const correccion = generarClaveIdempotenciaAjuste('correccion');

    expect(primera).toMatch(/^[A-Za-z0-9._:/-]{8,100}$/);
    expect(segunda).toMatch(/^[A-Za-z0-9._:/-]{8,100}$/);
    expect(correccion).toMatch(/^[A-Za-z0-9._:/-]{8,100}$/);
    expect(primera).toContain('ajuste-anulacion-');
    expect(correccion).toContain('ajuste-correccion-');
    expect(primera).not.toBe(segunda);
  });

  it('traduce el 403 al detalle del backend y sólo usa el fallback de administrador', () => {
    const conDetalle = new HttpErrorResponse({
      status: 403,
      error: { detail: 'No tiene permiso de ESCRITURA para Gestionar pagos' },
    });
    expect(mensajeErrorAjuste(conDetalle, 'anular el pago')).toBe(
      'No tiene permiso de ESCRITURA para Gestionar pagos',
    );

    const sinDetalle = new HttpErrorResponse({ status: 403 });
    expect(mensajeErrorAjuste(sinDetalle, 'anular el pago')).toContain('administrador');
  });

  it('propaga el detail del backend en los conflictos', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { detail: 'La clave idempotente ya fue usada con otros datos' },
    });
    expect(mensajeErrorAjuste(error, 'anular el pago')).toBe(
      'La clave idempotente ya fue usada con otros datos',
    );
  });

  it('conserva el mapa genérico del CU31 para el resto de fallos', () => {
    expect(mensajeErrorAjuste(new HttpErrorResponse({ status: 0 }), 'x')).toContain('conectar');
    expect(mensajeErrorAjuste(new HttpErrorResponse({ status: 401 }), 'x')).toContain('sesión');
    expect(mensajeErrorAjuste(new HttpErrorResponse({ status: 500 }), 'x')).toContain('servidor');
    expect(mensajeErrorAjuste('fallo', 'anular el pago')).toBe('anular el pago');
  });
});
