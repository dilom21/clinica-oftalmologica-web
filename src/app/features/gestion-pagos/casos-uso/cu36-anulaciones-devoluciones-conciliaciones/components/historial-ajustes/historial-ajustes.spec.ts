import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HttpErrorResponse } from '@angular/common/http';

import { HistorialAjustes as HistorialAjustesRespuesta, PagoAjuste } from '../../models/ajustes-pagos.models';
import { AjustesPagosService } from '../../services/ajustes-pagos.service';
import { ajustePago, historialAjustes } from '../../testing/ajustes-pagos.fixture';
import { HistorialAjustes } from './historial-ajustes';

interface VistaLibro {
  historial(): HistorialAjustesRespuesta | null;
  cargando(): boolean;
  error(): string | null;
  ajustes(): PagoAjuste[];
  ajusteSeleccionadoId(): number | null;
  detalleAjuste(): PagoAjuste | null;
  recargar(): void;
}

describe('CU36 — libro de ajustes', () => {
  let fixture: ComponentFixture<HistorialAjustes>;
  let vista: VistaLibro;
  let api: {
    consultarHistorialAjustes: ReturnType<typeof vi.fn>;
    consultarAjuste: ReturnType<typeof vi.fn>;
  };
  let conciliados: PagoAjuste[];

  async function configurar(opciones: {
    pagoId?: number;
    puedeConciliar?: boolean;
    respuesta?: Observable<HistorialAjustesRespuesta>;
  } = {}): Promise<void> {
    TestBed.resetTestingModule();
    api = {
      consultarHistorialAjustes: vi.fn(() => opciones.respuesta ?? of(historialAjustes())),
      consultarAjuste: vi.fn(() => of(ajustePago())),
    };
    await TestBed.configureTestingModule({
      imports: [HistorialAjustes],
      providers: [{ provide: AjustesPagosService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialAjustes);
    conciliados = [];
    fixture.componentInstance.conciliar.subscribe((ajuste) => conciliados.push(ajuste));
    fixture.componentRef.setInput('pagoId', opciones.pagoId ?? 1024);
    fixture.componentRef.setInput('puedeConciliar', opciones.puedeConciliar ?? true);
    vista = fixture.componentInstance as unknown as VistaLibro;
    fixture.detectChanges();
  }

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texto(): string {
    return elemento().textContent ?? '';
  }

  /** El marcado parte los textos en varias líneas; se comparan sin ese ruido. */
  function textoPlano(): string {
    return texto().replace(/\s+/g, ' ');
  }

  function filas(): HTMLElement[] {
    return Array.from(elemento().querySelectorAll('tbody > tr:not(.ajustes__fila-detalle)'));
  }

  function botonDetalle(indice = 0): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll<HTMLButtonElement>('.ajustes__btn-detalle'))[
      indice
    ];
  }

  it('consulta el libro del pago y muestra los agregados del servidor', async () => {
    await configurar({
      respuesta: of(
        historialAjustes({
          importe_base: '380.00',
          importe_vigente: '340.00',
          importe_reembolsado: '40.00',
        }),
      ),
    });

    expect(api.consultarHistorialAjustes).toHaveBeenCalledWith(1024);
    expect(texto()).toContain('Bs 380,00');
    expect(texto()).toContain('Bs 340,00');
    expect(texto()).toContain('Bs 40,00');
  });

  it('anuncia el ajuste abierto como bloqueo de nuevas operaciones', async () => {
    await configurar({ respuesta: of(historialAjustes({ ajuste_abierto: true })) });

    const aviso = elemento().querySelector('.ajustes__bloqueo');

    expect(aviso?.textContent).toContain('ajuste abierto');
    expect(aviso?.textContent).toContain('bloquea nuevas operaciones');
  });

  it('lista los ajustes del más reciente al más antiguo con sus etiquetas', async () => {
    await configurar({
      respuesta: of(
        historialAjustes({
          ajustes: [
            ajustePago({
              id: 55,
              tipo: 'DEVOLUCION',
              naturaleza: 'SERVICIO_CANCELADO',
              estado: 'CONFIRMADO',
              fecha_creacion: '2026-10-18T10:00:00Z',
            }),
            ajustePago({
              id: 56,
              tipo: 'CORRECCION',
              naturaleza: 'ERROR_DE_REGISTRO',
              estado: 'PENDIENTE_PROVEEDOR',
              fecha_creacion: '2026-10-19T10:00:00Z',
            }),
          ],
        }),
      ),
    });

    const listado = filas();

    expect(listado).toHaveLength(2);
    expect(listado[0].textContent).toContain('Corrección');
    expect(listado[0].textContent).toContain('Error de registro');
    expect(listado[0].textContent).toContain('Pendiente del proveedor');
    expect(listado[0].textContent).toContain('Ajuste #56');
    expect(listado[1].textContent).toContain('Devolución');
    expect(listado[1].textContent).toContain('Confirmado');
    expect(textoPlano()).not.toContain('Servicio #11 — Bs -40,00');
  });

  it('consulta el detalle seleccionado y anuncia su carga localmente', async () => {
    const pendiente = new Subject<PagoAjuste>();
    await configurar({
      respuesta: of(historialAjustes({ ajustes: [ajustePago({ id: 55 })] })),
    });
    api.consultarAjuste.mockReturnValue(pendiente.asObservable());

    botonDetalle().click();
    fixture.detectChanges();

    expect(api.consultarAjuste).toHaveBeenCalledWith(55);
    expect(botonDetalle().getAttribute('aria-expanded')).toBe('true');
    expect(elemento().querySelector('.ajustes__detalle [role="status"]')?.textContent).toContain(
      'Consultando el detalle',
    );
  });

  it('renderiza el detalle devuelto por el endpoint y lo prefiere al conciliar', async () => {
    const resumen = ajustePago({
      id: 55,
      motivo: 'Motivo resumido del libro',
      referencia_externa: 'resumen-55',
    });
    const detalle = ajustePago({
      id: 55,
      motivo: 'Motivo completo devuelto por consultarAjuste',
      referencia_externa: 'detalle-endpoint-55',
      evidencia: 'Acta firmada del endpoint',
    });
    await configurar({ respuesta: of(historialAjustes({ ajustes: [resumen] })) });
    api.consultarAjuste.mockReturnValue(of(detalle));

    expect(texto()).not.toContain('detalle-endpoint-55');
    botonDetalle().click();
    fixture.detectChanges();

    expect(texto()).toContain('Motivo completo devuelto por consultarAjuste');
    expect(texto()).toContain('detalle-endpoint-55');
    expect(texto()).toContain('Acta firmada del endpoint');

    (elemento().querySelector('.ajustes__btn-accion') as HTMLButtonElement).click();
    expect(conciliados).toEqual([detalle]);
  });

  it('permite reintentar un error ordinario al consultar el detalle', async () => {
    await configurar({
      respuesta: of(historialAjustes({ ajustes: [ajustePago({ id: 55 })] })),
    });
    api.consultarAjuste.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    botonDetalle().click();
    fixture.detectChanges();

    expect(elemento().querySelector('.ajustes__detalle [role="alert"]')?.textContent).toContain(
      'servidor',
    );

    api.consultarAjuste.mockReturnValue(
      of(ajustePago({ id: 55, motivo: 'Detalle recuperado después del reintento' })),
    );
    (elemento().querySelector('.ajustes__detalle .ajustes__enlace') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.consultarAjuste).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Detalle recuperado después del reintento');
  });

  it('distingue el acceso denegado y conserva el detalle backend o el fallback administrador', async () => {
    await configurar({
      respuesta: of(
        historialAjustes({
          ajustes: [ajustePago({ id: 55 }), ajustePago({ id: 56 })],
        }),
      ),
    });
    api.consultarAjuste.mockImplementation((id: number) =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: id === 55 ? { detail: 'No puede ver este ajuste de otra clínica.' } : {},
          }),
      ),
    );

    botonDetalle(1).click();
    fixture.detectChanges();
    expect(texto()).toContain('Acceso denegado.');
    expect(texto()).toContain('No puede ver este ajuste de otra clínica.');
    expect(elemento().querySelector('.ajustes__detalle .ajustes__enlace')).toBeNull();

    botonDetalle(0).click();
    fixture.detectChanges();
    expect(texto()).toContain('Acceso denegado.');
    expect(texto().toLowerCase()).toContain('administrador');
  });

  it('impide que la respuesta tardía de A reemplace el detalle seleccionado B', async () => {
    const respuestaA = new Subject<PagoAjuste>();
    const respuestaB = new Subject<PagoAjuste>();
    await configurar({
      respuesta: of(
        historialAjustes({
          ajustes: [ajustePago({ id: 55 }), ajustePago({ id: 56 })],
        }),
      ),
    });
    api.consultarAjuste.mockImplementation((id: number) =>
      id === 55 ? respuestaA.asObservable() : respuestaB.asObservable(),
    );

    botonDetalle(1).click();
    fixture.detectChanges();
    botonDetalle(0).click();
    fixture.detectChanges();

    respuestaB.next(ajustePago({ id: 56, motivo: 'Detalle vigente B' }));
    respuestaB.complete();
    fixture.detectChanges();
    respuestaA.next(ajustePago({ id: 55, motivo: 'Detalle tardío A' }));
    respuestaA.complete();
    fixture.detectChanges();

    expect(vista.ajusteSeleccionadoId()).toBe(56);
    expect(vista.detalleAjuste()?.id).toBe(56);
    expect(texto()).toContain('Detalle vigente B');
    expect(texto()).not.toContain('Detalle tardío A');
  });

  it('limpia el detalle seleccionado cuando cambia el pago', async () => {
    await configurar({
      respuesta: of(historialAjustes({ ajustes: [ajustePago({ id: 55 })] })),
    });
    botonDetalle().click();
    fixture.detectChanges();
    expect(vista.detalleAjuste()?.id).toBe(55);

    api.consultarHistorialAjustes.mockReturnValue(
      of(historialAjustes({ pago_id: 2048, ajustes: [] })),
    );
    fixture.componentRef.setInput('pagoId', 2048);
    fixture.detectChanges();

    expect(vista.ajusteSeleccionadoId()).toBeNull();
    expect(vista.detalleAjuste()).toBeNull();
    expect(elemento().querySelector('.ajustes__detalle')).toBeNull();
  });

  it('distingue el ajuste confirmado del que todavía no lo está', async () => {
    await configurar({
      respuesta: of(
        historialAjustes({
          ajustes: [
            ajustePago({ id: 55, estado: 'CONFIRMADO' }),
            ajustePago({ id: 56, estado: 'PENDIENTE_PROVEEDOR' }),
            ajustePago({ id: 57, estado: 'DESCONOCIDO' }),
            ajustePago({ id: 58, estado: 'FALLIDO' }),
            ajustePago({ id: 59, estado: 'CANCELADO' }),
          ],
        }),
      ),
    });

    const badges = Array.from(elemento().querySelectorAll('.ajustes__badge')).map(
      (badge) => badge.className,
    );

    expect(badges.some((clase) => clase.includes('ajustes__badge--confirmado'))).toBe(true);
    expect(badges.some((clase) => clase.includes('ajustes__badge--pendiente'))).toBe(true);
    expect(badges.some((clase) => clase.includes('ajustes__badge--desconocido'))).toBe(true);
    expect(badges.some((clase) => clase.includes('ajustes__badge--fallido'))).toBe(true);
    expect(badges.some((clase) => clase.includes('ajustes__badge--cancelado'))).toBe(true);

    const pendientes = Array.from(elemento().querySelectorAll('.ajustes__badge--pendiente'))
      .concat(Array.from(elemento().querySelectorAll('.ajustes__badge--desconocido')))
      .map((badge) => badge.className);
    expect(pendientes.every((clase) => !clase.includes('confirmado'))).toBe(true);
  });

  it('emite el ajuste elegido para conciliar y nombra cada botón', async () => {
    await configurar({
      respuesta: of(historialAjustes({ ajustes: [ajustePago({ id: 55 })] })),
    });

    const boton = elemento().querySelector('.ajustes__btn-accion') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Conciliar el ajuste #55');
    expect(boton.disabled).toBe(false);

    boton.click();

    expect(conciliados.map((ajuste) => ajuste.id)).toEqual([55]);
  });

  it('no ofrece conciliar sin la función de escritura', async () => {
    await configurar({
      puedeConciliar: false,
      respuesta: of(historialAjustes({ ajustes: [ajustePago({ id: 55 })] })),
    });

    expect(elemento().querySelector('.ajustes__btn-accion')).toBeNull();
    expect(texto()).not.toContain('Conciliar');
  });

  it('no ofrece conciliar un ajuste ya resuelto', async () => {
    await configurar({
      respuesta: of(historialAjustes({ ajustes: [ajustePago({ id: 55, estado: 'CONFIRMADO' })] })),
    });

    expect(elemento().querySelector('.ajustes__btn-accion')).toBeNull();
  });

  it('muestra un estado vacío cuando el pago no tiene ajustes', async () => {
    await configurar({ respuesta: of(historialAjustes({ ajustes: [] })) });

    expect(texto()).toContain('Todavía no hay ajustes registrados');
  });

  it('anuncia la carga con role="status"', async () => {
    const pendiente = new Subject<HistorialAjustesRespuesta>();
    await configurar({ respuesta: pendiente.asObservable() });

    const estado = elemento().querySelector('[role="status"]');
    expect(estado?.textContent).toContain('Consultando el libro de ajustes');

    pendiente.next(historialAjustes());
    pendiente.complete();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="status"]')).toBeNull();
  });

  it('muestra el error en una alerta y permite reintentar', async () => {
    await configurar({
      respuesta: throwError(
        () => new HttpErrorResponse({ status: 500, error: { detail: 'Fallo del servidor' } }),
      ),
    });

    const alerta = elemento().querySelector('.ajustes__alerta[role="alert"]');
    expect(alerta?.textContent).toContain('El servidor no pudo completar la operación');

    api.consultarHistorialAjustes.mockReturnValue(of(historialAjustes()));
    (elemento().querySelector('.ajustes__enlace') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.consultarHistorialAjustes).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Bs 340,00');
  });

  it('descarta una respuesta tardía de un pago anterior', async () => {
    const primera = new Subject<HistorialAjustesRespuesta>();
    const segunda = new Subject<HistorialAjustesRespuesta>();
    await configurar({ pagoId: 1024, respuesta: primera.asObservable() });

    // La segunda consulta se prepara antes de cambiar el pago y resuelve primero.
    api.consultarHistorialAjustes.mockReturnValue(segunda.asObservable());
    fixture.componentRef.setInput('pagoId', 2048);
    fixture.detectChanges();

    segunda.next(historialAjustes({ pago_id: 2048, importe_vigente: '100.00' }));
    segunda.complete();
    fixture.detectChanges();

    primera.next(historialAjustes({ pago_id: 1024, importe_vigente: '999.00' }));
    primera.complete();
    fixture.detectChanges();

    expect(vista.historial()?.pago_id).toBe(2048);
    expect(texto()).toContain('Bs 100,00');
    expect(texto()).not.toContain('Bs 999,00');
  });

  it('encola una sola recarga solicitada mientras hay una consulta en curso', async () => {
    const primera = new Subject<HistorialAjustesRespuesta>();
    const segunda = new Subject<HistorialAjustesRespuesta>();
    await configurar({ respuesta: primera.asObservable() });
    api.consultarHistorialAjustes.mockReturnValue(segunda.asObservable());

    vista.recargar();
    vista.recargar();
    expect(api.consultarHistorialAjustes).toHaveBeenCalledTimes(1);

    primera.next(historialAjustes({ importe_vigente: '300.00' }));
    primera.complete();
    fixture.detectChanges();
    expect(api.consultarHistorialAjustes).toHaveBeenCalledTimes(2);

    segunda.next(historialAjustes({ importe_vigente: '125.00' }));
    segunda.complete();
    fixture.detectChanges();

    expect(vista.historial()?.importe_vigente).toBe('125.00');
    expect(texto()).toContain('Bs 125,00');
    expect(texto()).not.toContain('Bs 300,00');
  });
});
