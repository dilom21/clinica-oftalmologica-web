import { HttpErrorResponse } from '@angular/common/http';

import {
  MARCA_EMAIL_PRUEBAS,
  MAX_REINTENTOS_UI,
  errorNotificacionVisible,
  fechaFinIso,
  fechaInicioIso,
  formatearMonto,
  generarClaveIdempotencia,
  mensajeErrorPago,
  nombreArchivoComprobante,
  notificacionEnSeguimiento,
  notificacionReintentable,
  permisosPagos,
  puedeDescargarComprobante,
  referenciaPago,
  requiereConfirmacion,
} from './pagos-administrativos.models';

function pago(overrides: Record<string, unknown> = {}) {
  return {
    id: 1024,
    paciente_id: 7,
    consulta_clinica_id: 142,
    fecha_creacion: '2026-10-19T15:42:00Z',
    fecha_hora_pago: null,
    monto: '380.00',
    moneda: 'BOB',
    metodo_pago: 'TRANSFERENCIA' as const,
    estado: 'PENDIENTE' as const,
    referencia_bancaria: 'TRX-9911',
    observaciones: null,
    servicio_realizado_ids: [11, 12],
    notificacion: null,
    ...overrides,
  };
}

describe('CU31 — permisos derivados del menú', () => {
  it('falla cerrado sin funciones', () => {
    expect(permisosPagos([])).toEqual({ ver: false, registrar: false, confirmar: false });
    expect(permisosPagos(null)).toEqual({ ver: false, registrar: false, confirmar: false });
  });

  it('LECTURA habilita sólo consultas', () => {
    const permisos = permisosPagos([
      { id: 1, nombre: 'Gestionar pagos', accion_id: 1, accion_nombre: 'LECTURA' },
    ]);
    expect(permisos).toEqual({ ver: true, registrar: false, confirmar: false });
  });

  it('ESCRITURA habilita el registro pero no las consultas del listado', () => {
    const permisos = permisosPagos([
      { id: 1, nombre: 'Gestionar pagos', accion_id: 2, accion_nombre: 'ESCRITURA' },
    ]);
    expect(permisos).toEqual({ ver: false, registrar: true, confirmar: false });
  });

  it('AMBAS habilita consulta y registro', () => {
    const permisos = permisosPagos([
      { id: 1, nombre: 'GESTIONAR PAGOS', accion_id: 3, accion_nombre: 'ambas' },
    ]);
    expect(permisos).toEqual({ ver: true, registrar: true, confirmar: false });
  });

  it('la confirmación depende de su propia función y acción de escritura', () => {
    const lectura = permisosPagos([
      { id: 2, nombre: 'Confirmar pagos bancarios', accion_id: 1, accion_nombre: 'LECTURA' },
    ]);
    expect(lectura.confirmar).toBe(false);

    const escritura = permisosPagos([
      { id: 2, nombre: 'Confirmar pagos bancarios', accion_id: 2, accion_nombre: 'ESCRITURA' },
    ]);
    expect(escritura).toEqual({ ver: false, registrar: false, confirmar: true });
  });

  it('no asume permisos por funciones parecidas', () => {
    const permisos = permisosPagos([
      { id: 3, nombre: 'Gestionar pagos generales', accion_id: 3, accion_nombre: 'AMBAS' },
    ]);
    expect(permisos).toEqual({ ver: false, registrar: false, confirmar: false });
  });
});

describe('CU31 — reglas de presentación', () => {
  it('sólo transferencia y QR pendientes requieren confirmación', () => {
    expect(requiereConfirmacion(pago())).toBe(true);
    expect(requiereConfirmacion(pago({ metodo_pago: 'QR' }))).toBe(true);
    expect(requiereConfirmacion(pago({ metodo_pago: 'EFECTIVO' }))).toBe(false);
    expect(requiereConfirmacion(pago({ estado: 'APROBADO' }))).toBe(false);
  });

  it('el comprobante sólo se ofrece para pagos aprobados', () => {
    expect(puedeDescargarComprobante(pago({ estado: 'APROBADO' }))).toBe(true);
    expect(puedeDescargarComprobante(pago({ estado: 'PENDIENTE' }))).toBe(false);
    expect(puedeDescargarComprobante(pago({ estado: 'ANULADO' }))).toBe(false);
  });

  it('el reintento se limita por estado y por el tope de la interfaz', () => {
    const base = {
      estado: 'PENDIENTE' as const,
      intentos: 0,
      proveedor_mensaje_id: null,
      fecha_aceptado: null,
      fecha_entregado: null,
      ultimo_error: null,
    };
    expect(notificacionReintentable(base)).toBe(true);
    expect(notificacionReintentable({ ...base, estado: 'FALLIDO', intentos: 2 })).toBe(true);
    expect(
      notificacionReintentable({ ...base, estado: 'FALLIDO', intentos: MAX_REINTENTOS_UI }),
    ).toBe(false);
    expect(notificacionReintentable({ ...base, estado: 'ENTREGADO' })).toBe(false);
    expect(notificacionReintentable({ ...base, estado: 'PROCESANDO' })).toBe(false);
    expect(notificacionReintentable(null)).toBe(false);
  });

  describe('CU31 — seguimiento y errores de la notificación', () => {
    it('sólo considera en seguimiento los estados no terminales', () => {
      expect(notificacionEnSeguimiento('PENDIENTE')).toBe(true);
      expect(notificacionEnSeguimiento('PROCESANDO')).toBe(true);
      expect(notificacionEnSeguimiento('ACEPTADO_POR_PROVEEDOR')).toBe(false);
      expect(notificacionEnSeguimiento('ENTREGADO')).toBe(false);
      expect(notificacionEnSeguimiento('FALLIDO')).toBe(false);
    });

    it('oculta la marca informativa del modo de pruebas de correo', () => {
      expect(errorNotificacionVisible(MARCA_EMAIL_PRUEBAS)).toBeNull();
      expect(errorNotificacionVisible(` ${MARCA_EMAIL_PRUEBAS} `)).toBeNull();
      expect(errorNotificacionVisible(MARCA_EMAIL_PRUEBAS.toLowerCase())).toBeNull();
      expect(errorNotificacionVisible(null)).toBeNull();
      expect(errorNotificacionVisible('')).toBeNull();
    });

    it('conserva los errores reales del proveedor', () => {
      expect(errorNotificacionVisible('ENTREGA_FALLIDA')).toBe('ENTREGA_FALLIDA');
      expect(errorNotificacionVisible('DESTINATARIO_NO_DISPONIBLE')).toBe(
        'DESTINATARIO_NO_DISPONIBLE',
      );
    });
  });

describe('CU31 — formatos y utilidades', () => {
  it('formatea montos en bolivianos y evita valores inválidos', () => {
    expect(formatearMonto('380.00')).toBe('Bs 380,00');
    expect(formatearMonto(1250.5)).toBe('Bs 1.250,50');
    expect(formatearMonto('no-numero')).toBe('—');
  });

  it('genera referencias visibles a partir del identificador real', () => {
    expect(referenciaPago(1024)).toBe('#PAG-01024');
  });

  it('construye fechas ISO con el desfase de Bolivia (UTC-4)', () => {
    expect(fechaInicioIso('2026-10-19')).toBe('2026-10-19T04:00:00.000Z');
    expect(fechaFinIso('2026-10-19')).toBe('2026-10-20T03:59:59.999Z');
    expect(fechaInicioIso('19/10/2026')).toBeNull();
  });

  it('genera claves de idempotencia válidas para el header del backend', () => {
    const primera = generarClaveIdempotencia();
    const segunda = generarClaveIdempotencia();
    expect(primera).toMatch(/^[A-Za-z0-9._:/-]{8,100}$/);
    expect(segunda).toMatch(/^[A-Za-z0-9._:/-]{8,100}$/);
    expect(primera).not.toBe(segunda);
  });

  it('sanea el nombre del comprobante y evita rutas del servidor', () => {
    expect(
      nombreArchivoComprobante('attachment; filename="comprobante_pago_7.pdf"', 7),
    ).toBe('comprobante_pago_7.pdf');
    const ruta = nombreArchivoComprobante(
      'attachment; filename="../../etc/passwd.pdf"',
      7,
    );
    expect(ruta).not.toContain('/');
    expect(ruta).not.toContain('..');
    expect(ruta.endsWith('.pdf')).toBe(true);
    expect(nombreArchivoComprobante(null, 7)).toBe('comprobante_pago_7.pdf');
  });
});

describe('CU31 — mensajes de error del backend', () => {
  function error(status: number, body: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: body });
  }

  it('usa el detail de texto de FastAPI', () => {
    expect(
      mensajeErrorPago(
        error(409, { detail: 'Uno o mas servicios ya estan reservados o pagados' }),
        'x',
      ),
    ).toBe('Uno o mas servicios ya estan reservados o pagados');
  });

  it('resume la lista de errores de validación (422)', () => {
    const mensaje = mensajeErrorPago(
      error(422, {
        detail: [
          { loc: ['body', 'metodo_pago'], msg: 'Input should be EFECTIVO, TRANSFERENCIA or QR' },
        ],
      }),
      'x',
    );
    expect(mensaje).toContain('Input should be');
  });

  it('traduce conectividad, sesión y errores del servidor', () => {
    expect(mensajeErrorPago(error(0, null), 'x')).toContain('conectar');
    expect(mensajeErrorPago(error(401, null), 'x')).toContain('sesión');
    expect(mensajeErrorPago(error(500, null), 'x')).toContain('servidor');
    expect(mensajeErrorPago(error(403, null), 'x')).toContain('permisos');
  });
});

});
