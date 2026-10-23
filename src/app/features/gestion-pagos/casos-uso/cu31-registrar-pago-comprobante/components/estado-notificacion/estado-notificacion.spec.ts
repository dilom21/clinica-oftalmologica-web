import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  MARCA_EMAIL_PRUEBAS,
  NotificacionPago,
} from '../../models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';
import {
  EstadoNotificacion,
  INTERVALO_SEGUIMIENTO_MS,
  MAX_CONSULTAS_SEGUIMIENTO,
} from './estado-notificacion';

function notificacion(overrides: Partial<NotificacionPago> = {}): NotificacionPago {
  return {
    estado: 'PENDIENTE',
    intentos: 0,
    proveedor_mensaje_id: null,
    fecha_aceptado: null,
    fecha_entregado: null,
    ultimo_error: null,
    ...overrides,
  };
}

interface VistaEstado {
  notificacion(): NotificacionPago | null;
  cargando(): boolean;
  error(): string | null;
  errorSeguimiento(): string | null;
  errorVisible(): string | null;
  sinNotificacion(): boolean;
  mensaje(): string | null;
  seguimiento(): boolean;
  seguimientoAgotado(): boolean;
  consultasSeguimiento(): number;
  enSeguimiento(): boolean;
  reintentar(): void;
  consultar(): void;
  puedeReintentarAhora(valor: NotificacionPago): boolean;
}

describe('CU31 — estado del comprobante por correo', () => {
  let fixture: ComponentFixture<EstadoNotificacion>;
  let vista: VistaEstado;
  let api: {
    consultarNotificacion: ReturnType<typeof vi.fn>;
    reintentarNotificacion: ReturnType<typeof vi.fn>;
  };

  async function configurar(
    opciones: {
      estadoPago?: 'APROBADO' | 'PENDIENTE';
      inicial?: NotificacionPago | null;
      puedeReintentar?: boolean;
    } = {},
  ): Promise<void> {
    api = {
      consultarNotificacion: vi.fn(() => of(notificacion())),
      reintentarNotificacion: vi.fn(() => of(notificacion({ estado: 'PENDIENTE' }))),
    };

    TestBed.configureTestingModule({
      imports: [EstadoNotificacion],
      providers: [{ provide: PagosAdministrativosService, useValue: api }],
    });
    TestBed.overrideComponent(EstadoNotificacion, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(EstadoNotificacion);
    fixture.componentRef.setInput('pagoId', 1024);
    fixture.componentRef.setInput('estadoPago', opciones.estadoPago ?? 'APROBADO');
    fixture.componentRef.setInput('notificacionInicial', opciones.inicial ?? null);
    fixture.componentRef.setInput('puedeReintentar', opciones.puedeReintentar ?? true);
    vista = fixture.componentInstance as unknown as VistaEstado;
    fixture.detectChanges();
  }

  it('consulta el endpoint dedicado y representa el estado devuelto', async () => {
    await configurar();
    api.consultarNotificacion.mockReturnValue(
      of(
        notificacion({
          estado: 'ACEPTADO_POR_PROVEEDOR',
          intentos: 1,
          fecha_aceptado: '2026-10-19T16:00:00Z',
        }),
      ),
    );
    vista.consultar();
    fixture.detectChanges();

    expect(api.consultarNotificacion).toHaveBeenCalledWith(1024);
    expect(vista.notificacion()?.estado).toBe('ACEPTADO_POR_PROVEEDOR');
    expect(vista.notificacion()?.intentos).toBe(1);
  });

  it('interpreta el 404 del backend como «sin notificación registrada»', async () => {
    await configurar();
    api.consultarNotificacion.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    vista.consultar();
    fixture.detectChanges();

    expect(vista.sinNotificacion()).toBe(true);
    expect(vista.notificacion()).toBeNull();
    expect(vista.error()).toBeNull();
  });

  it('sólo ofrece reintento cuando el estado y el permiso lo permiten', async () => {
    await configurar({ inicial: notificacion({ estado: 'FALLIDO', intentos: 1 }) });

    expect(vista.puedeReintentarAhora(notificacion({ estado: 'FALLIDO', intentos: 1 }))).toBe(true);
    expect(
      vista.puedeReintentarAhora(notificacion({ estado: 'PENDIENTE', intentos: 3 })),
    ).toBe(false);
    expect(
      vista.puedeReintentarAhora(notificacion({ estado: 'ENTREGADO', intentos: 1 })),
    ).toBe(false);
  });

  it('no ofrece reintento si el usuario no tiene permiso de escritura', async () => {
    await configurar({
      inicial: notificacion({ estado: 'FALLIDO', intentos: 1 }),
      puedeReintentar: false,
    });

    expect(vista.puedeReintentarAhora(notificacion({ estado: 'FALLIDO', intentos: 1 }))).toBe(false);
  });

  it('solicita el reintento y refleja el estado del servidor sin afirmar entrega', async () => {
    await configurar({ inicial: notificacion({ estado: 'FALLIDO', intentos: 1 }) });
    api.reintentarNotificacion.mockReturnValue(
      of(notificacion({ estado: 'PENDIENTE', intentos: 1 })),
    );

    vista.reintentar();
    fixture.detectChanges();

    expect(api.reintentarNotificacion).toHaveBeenCalledWith(1024);
    expect(vista.notificacion()?.estado).toBe('PENDIENTE');
    expect(vista.mensaje()).toContain('cola');
    expect(vista.mensaje()).not.toContain('entregado');
  });

  it('no consulta la notificación de un pago no aprobado', async () => {
    await configurar({ estadoPago: 'PENDIENTE' });

    expect(api.consultarNotificacion).not.toHaveBeenCalled();
  });

  it('actualiza automáticamente PENDIENTE → PROCESANDO → ACEPTADO_POR_PROVEEDOR', async () => {
    vi.useFakeTimers();
    try {
      await configurar({ inicial: notificacion({ estado: 'PENDIENTE' }) });
      api.consultarNotificacion.mockReturnValueOnce(
        of(notificacion({ estado: 'PROCESANDO', intentos: 1 })),
      );
      api.consultarNotificacion.mockReturnValueOnce(
        of(
          notificacion({
            estado: 'ACEPTADO_POR_PROVEEDOR',
            intentos: 1,
            fecha_aceptado: '2026-10-19T16:00:00Z',
          }),
        ),
      );

      expect(api.consultarNotificacion).toHaveBeenCalledTimes(1);
      expect(api.consultarNotificacion).toHaveBeenCalledWith(1024);

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS);
      fixture.detectChanges();
      expect(vista.notificacion()?.estado).toBe('PROCESANDO');

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS);
      fixture.detectChanges();
      expect(vista.notificacion()?.estado).toBe('ACEPTADO_POR_PROVEEDOR');
      expect(vista.seguimiento()).toBe(false);

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS * 4);
      expect(api.consultarNotificacion).toHaveBeenCalledTimes(3);
      expect(api.reintentarNotificacion).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('detiene el sondeo cuando el envío falla', async () => {
    vi.useFakeTimers();
    try {
      await configurar({ inicial: notificacion({ estado: 'PENDIENTE' }) });
      api.consultarNotificacion.mockReturnValueOnce(
        of(
          notificacion({
            estado: 'FALLIDO',
            intentos: 1,
            ultimo_error: 'ENTREGA_FALLIDA',
          }),
        ),
      );

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS);
      fixture.detectChanges();

      expect(vista.notificacion()?.estado).toBe('FALLIDO');
      expect(vista.seguimiento()).toBe(false);
      expect(vista.errorVisible()).toBe('ENTREGA_FALLIDA');

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS * 4);
      expect(api.consultarNotificacion).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no presenta la marca informativa de EMAIL_TEST como error', async () => {
    await configurar();
    api.consultarNotificacion.mockReturnValue(
      of(
        notificacion({
          estado: 'ACEPTADO_POR_PROVEEDOR',
          intentos: 1,
          ultimo_error: MARCA_EMAIL_PRUEBAS,
        }),
      ),
    );

    vista.consultar();
    fixture.detectChanges();

    expect(vista.errorVisible()).toBeNull();
    expect(vista.notificacion()?.ultimo_error).toBe(MARCA_EMAIL_PRUEBAS);
  });

  it('conserva los errores reales del proveedor', async () => {
    await configurar();
    api.consultarNotificacion.mockReturnValue(
      of(
        notificacion({
          estado: 'FALLIDO',
          intentos: 1,
          ultimo_error: 'DESTINATARIO_NO_DISPONIBLE',
        }),
      ),
    );

    vista.consultar();
    fixture.detectChanges();

    expect(vista.errorVisible()).toBe('DESTINATARIO_NO_DISPONIBLE');
  });

  it('detiene el seguimiento al cambiar de pago', async () => {
    vi.useFakeTimers();
    try {
      await configurar({ inicial: notificacion({ estado: 'PENDIENTE' }) });
      expect(api.consultarNotificacion).toHaveBeenCalledTimes(1);

      fixture.componentRef.setInput('pagoId', 2048);
      fixture.detectChanges();

      expect(api.consultarNotificacion).toHaveBeenCalledTimes(2);
      expect(api.consultarNotificacion).toHaveBeenLastCalledWith(2048);

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS);
      fixture.detectChanges();

      expect(api.consultarNotificacion).toHaveBeenCalledTimes(3);
      expect(api.consultarNotificacion).toHaveBeenLastCalledWith(2048);
    } finally {
      vi.useRealTimers();
    }
  });

  it('detiene el seguimiento al destruir el componente', async () => {
    vi.useFakeTimers();
    try {
      await configurar({ inicial: notificacion({ estado: 'PENDIENTE' }) });
      const llamadas = api.consultarNotificacion.mock.calls.length;

      fixture.destroy();
      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS * 3);

      expect(api.consultarNotificacion.mock.calls.length).toBe(llamadas);
    } finally {
      vi.useRealTimers();
    }
  });

  it('se detiene tras el máximo de consultas y permite actualizar manualmente', async () => {
    vi.useFakeTimers();
    try {
      await configurar({ inicial: notificacion({ estado: 'PENDIENTE' }) });

      for (let consulta = 0; consulta < MAX_CONSULTAS_SEGUIMIENTO; consulta += 1) {
        await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS);
      }
      fixture.detectChanges();

      expect(vista.seguimientoAgotado()).toBe(true);
      expect(vista.seguimiento()).toBe(false);
      const totales = api.consultarNotificacion.mock.calls.length;
      expect(totales).toBe(1 + MAX_CONSULTAS_SEGUIMIENTO);

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS * 3);
      expect(api.consultarNotificacion.mock.calls.length).toBe(totales);

      vista.consultar();
      expect(api.consultarNotificacion.mock.calls.length).toBe(totales + 1);
      expect(api.reintentarNotificacion).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('conserva el último estado si una consulta automática falla', async () => {
    vi.useFakeTimers();
    try {
      await configurar({ inicial: notificacion({ estado: 'PENDIENTE' }) });
      api.consultarNotificacion.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS);
      fixture.detectChanges();

      expect(vista.notificacion()?.estado).toBe('PENDIENTE');
      expect(vista.errorSeguimiento()).toContain('servidor');
      expect(vista.seguimientoAgotado()).toBe(true);

      await vi.advanceTimersByTimeAsync(INTERVALO_SEGUIMIENTO_MS * 3);
      expect(api.consultarNotificacion).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
