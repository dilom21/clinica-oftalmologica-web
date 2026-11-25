import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PagoAdministrativo, PermisosPagos } from '../../models/pagos-administrativos.models';
import { ComprobantePagoService } from '../../services/comprobante-pago.service';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';
import {
  AnularPagoSolicitud,
  PagoAjuste,
} from '../../../cu36-anulaciones-devoluciones-conciliaciones/models/ajustes-pagos.models';
import { AjustesPagosService } from '../../../cu36-anulaciones-devoluciones-conciliaciones/services/ajustes-pagos.service';
import {
  ajustePago,
  historialAjustes,
} from '../../../cu36-anulaciones-devoluciones-conciliaciones/testing/ajustes-pagos.fixture';
import { DetallePago } from './detalle-pago';

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
    estado: 'PENDIENTE',
    referencia_bancaria: 'TRX-9911',
    observaciones: null,
    servicio_realizado_ids: [11, 12],
    notificacion: null,
    ...overrides,
  };
}

interface VistaDetalle {
  puedeConfirmar(): boolean;
  abrirConfirmacion(): void;
  dialogoAbierto(): boolean;
  confirmarPago(): void;
  procesando(): boolean;
  errorConfirmacion(): string | null;
  exito(): string | null;
  descargarComprobante(): void;
  soloLectura(): boolean;
  descargando(): boolean;
  dialogoAnular(): boolean;
  dialogoConciliar(): boolean;
  procesandoAjuste(): boolean;
  errorOperacion(): string | null;
  ajusteSeleccionado(): PagoAjuste | null;
  mensajeResultado(): string | null;
  claseResultado(): string;
  claseEstado(): string;
  abrirAnulacion(): void;
  abrirConciliacion(ajuste: PagoAjuste): void;
  cerrarAnulacion(): void;
  anularPago(solicitud: AnularPagoSolicitud): void;
}

interface ApiPagos {
  confirmarPago: ReturnType<typeof vi.fn>;
  consultarNotificacion: ReturnType<typeof vi.fn>;
  reintentarNotificacion: ReturnType<typeof vi.fn>;
}

interface ApiAjustes {
  consultarHistorialAjustes: ReturnType<typeof vi.fn>;
  anularPago: ReturnType<typeof vi.fn>;
  corregirPago: ReturnType<typeof vi.fn>;
  reembolsarPago: ReturnType<typeof vi.fn>;
  conciliarAjuste: ReturnType<typeof vi.fn>;
}

const PERMISOS: PermisosPagos = { ver: true, registrar: true, confirmar: true };

describe('CU34 — variante consultiva compacta del detalle reutilizado', () => {
  it('conserva la presentación operativa de CU31 por defecto', () => {
    TestBed.configureTestingModule({
      imports: [DetallePago],
      providers: [
        { provide: PagosAdministrativosService, useValue: { confirmarPago: vi.fn() } },
        { provide: ComprobantePagoService, useValue: { descargar: vi.fn() } },
        {
          provide: AjustesPagosService,
          useValue: { consultarHistorialAjustes: vi.fn(() => of(historialAjustes())) },
        },
      ],
    });
    const fixture = TestBed.createComponent(DetallePago);
    fixture.componentRef.setInput('pago', pago());
    fixture.componentRef.setInput('permisos', PERMISOS);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detalle--compacto')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Confirmar pago');
    expect(fixture.nativeElement.textContent).toContain('Paciente');
    expect(fixture.nativeElement.textContent).toContain('Servicios cobrados');
  });

  it('renderiza la variante compacta en solo lectura y no permite confirmar desde el código ni la interfaz', () => {
    const confirmarPago = vi.fn();
    TestBed.configureTestingModule({
      imports: [DetallePago],
      providers: [
        { provide: PagosAdministrativosService, useValue: { confirmarPago } },
        { provide: ComprobantePagoService, useValue: { descargar: vi.fn() } },
        { provide: AjustesPagosService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(DetallePago);
    fixture.componentRef.setInput('pago', pago());
    fixture.componentRef.setInput('permisos', PERMISOS);
    fixture.componentRef.setInput('soloLectura', true);
    fixture.componentRef.setInput('compacto', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detalle--compacto')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Fecha de registro');
    expect(fixture.nativeElement.textContent).not.toContain('Confirmar pago');
    expect(fixture.nativeElement.textContent).not.toContain('Descargar comprobante');
    (fixture.componentInstance as unknown as VistaDetalle).confirmarPago();
    expect(confirmarPago).not.toHaveBeenCalled();
  });
});

const ANULACION: AnularPagoSolicitud = {
  motivo: 'Cobro registrado dos veces para la misma consulta',
  naturaleza: 'PAGO_DUPLICADO',
  evidencia: 'Extracto bancario verificado',
};

describe('CU31 — detalle, confirmación y comprobante', () => {
  let fixture: ComponentFixture<DetallePago>;
  let vista: VistaDetalle;
  let api: ApiPagos;
  let ajustesApi: ApiAjustes;
  let comprobantes: { descargar: ReturnType<typeof vi.fn> };

  function respuestasPorDefecto(): void {
    api = {
      confirmarPago: vi.fn(() => of(pago({ estado: 'APROBADO' }))),
      consultarNotificacion: vi.fn(() =>
        of({
          estado: 'ENTREGADO',
          intentos: 1,
          proveedor_mensaje_id: null,
          fecha_aceptado: null,
          fecha_entregado: null,
          ultimo_error: null,
        }),
      ),
      reintentarNotificacion: vi.fn(() => of(null)),
    };
    comprobantes = { descargar: vi.fn(() => of(undefined)) };
    ajustesApi = {
      consultarHistorialAjustes: vi.fn(() => of(historialAjustes())),
      anularPago: vi.fn(() => of(ajustePago({ estado: 'CONFIRMADO' }))),
      corregirPago: vi.fn(() => of(ajustePago({ estado: 'CONFIRMADO' }))),
      reembolsarPago: vi.fn(() => of(ajustePago({ estado: 'PENDIENTE_PROVEEDOR' }))),
      conciliarAjuste: vi.fn(() => of(ajustePago({ estado: 'CONFIRMADO' }))),
    };
  }

  /** Vista sin plantilla: aisla la lógica del componente. */
  async function configurar(
    datos: PagoAdministrativo,
    permisos: PermisosPagos = PERMISOS,
    soloLectura = false,
  ): Promise<void> {
    TestBed.resetTestingModule();
    respuestasPorDefecto();

    TestBed.configureTestingModule({
      imports: [DetallePago],
      providers: [
        { provide: PagosAdministrativosService, useValue: api },
        { provide: ComprobantePagoService, useValue: comprobantes },
        { provide: AjustesPagosService, useValue: ajustesApi },
      ],
    });
    TestBed.overrideComponent(DetallePago, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(DetallePago);
    fixture.componentRef.setInput('pago', datos);
    fixture.componentRef.setInput('nombrePaciente', 'Ana Quispe');
    fixture.componentRef.setInput('permisos', permisos);
    fixture.componentRef.setInput('soloLectura', soloLectura);
    vista = fixture.componentInstance as unknown as VistaDetalle;
    fixture.detectChanges();
  }

  /** Plantilla real: comprueba gates de permiso y el libro de ajustes montado. */
  async function configurarRender(
    datos: PagoAdministrativo,
    permisos: PermisosPagos = PERMISOS,
  ): Promise<void> {
    TestBed.resetTestingModule();
    respuestasPorDefecto();

    TestBed.configureTestingModule({
      imports: [DetallePago],
      providers: [
        { provide: PagosAdministrativosService, useValue: api },
        { provide: ComprobantePagoService, useValue: comprobantes },
        { provide: AjustesPagosService, useValue: ajustesApi },
      ],
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(DetallePago);
    fixture.componentRef.setInput('pago', datos);
    fixture.componentRef.setInput('nombrePaciente', 'Ana Quispe');
    fixture.componentRef.setInput('permisos', permisos);
    vista = fixture.componentInstance as unknown as VistaDetalle;
    fixture.detectChanges();
  }

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function botonesOperacion(): string[] {
    return Array.from(elemento().querySelectorAll('.detalle__operaciones button')).map((boton) =>
      (boton.textContent ?? '').trim(),
    );
  }

  it('sólo permite confirmar transferencias o QR pendientes y con la función de confirmación', async () => {
    await configurar(pago());
    expect(vista.puedeConfirmar()).toBe(true);

    await configurar(pago({ metodo_pago: 'EFECTIVO' }));
    expect(vista.puedeConfirmar()).toBe(false);

    await configurar(pago(), { ver: true, registrar: true, confirmar: false });
    expect(vista.puedeConfirmar()).toBe(false);
  });

  it('confirma contra el backend y propaga el pago actualizado', async () => {
    await configurar(pago());
    const actualizaciones: PagoAdministrativo[] = [];
    fixture.componentInstance.pagoActualizado.subscribe((item) => actualizaciones.push(item));

    vista.abrirConfirmacion();
    expect(vista.dialogoAbierto()).toBe(true);

    vista.confirmarPago();

    expect(api.confirmarPago).toHaveBeenCalledWith(1024);
    expect(vista.dialogoAbierto()).toBe(false);
    expect(actualizaciones[0]?.estado).toBe('APROBADO');
    expect(vista.exito()).toContain('confirmado');
  });

  it('ante un conflicto muestra el mensaje del backend y solicita recargar el estado', async () => {
    await configurar(pago());
    api.confirmarPago.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'No se puede confirmar un pago ANULADO' },
          }),
      ),
    );
    let recargas = 0;
    fixture.componentInstance.recargar.subscribe(() => (recargas += 1));

    vista.abrirConfirmacion();
    vista.confirmarPago();

    expect(recargas).toBe(1);
    expect(vista.errorConfirmacion()).toBe('No se puede confirmar un pago ANULADO');
    expect(vista.dialogoAbierto()).toBe(false);
    expect(vista.procesando()).toBe(false);
  });

  it('sólo descarga el comprobante de pagos aprobados', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    vista.descargarComprobante();
    expect(comprobantes.descargar).toHaveBeenCalledWith(1024);

    await configurar(pago({ estado: 'PENDIENTE' }));
    vista.descargarComprobante();
    expect(comprobantes.descargar).not.toHaveBeenCalled();
  });

  it('la modalidad de solo lectura bloquea confirmación y conserva la descarga permitida', async () => {
    await configurar(pago(), PERMISOS, true);
    expect(vista.soloLectura()).toBe(true);
    expect(vista.puedeConfirmar()).toBe(false);
    vista.abrirConfirmacion();
    vista.confirmarPago();
    expect(vista.dialogoAbierto()).toBe(false);
    expect(api.confirmarPago).not.toHaveBeenCalled();

    await configurar(pago({ estado: 'APROBADO' }), PERMISOS, true);
    vista.descargarComprobante();
    expect(comprobantes.descargar).toHaveBeenCalledWith(1024);
    expect(api.confirmarPago).not.toHaveBeenCalled();
  });

  it('la modalidad de solo lectura bloquea también las escrituras CU36 desde el código', async () => {
    await configurar(pago({ estado: 'APROBADO' }), PERMISOS, true);

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);

    expect(vista.dialogoAnular()).toBe(false);
    expect(ajustesApi.anularPago).not.toHaveBeenCalled();
  });

  // --- CU36 ---------------------------------------------------------------

  it('no muestra las acciones del CU36 ni el libro sin permiso de lectura', async () => {
    await configurarRender(pago({ estado: 'APROBADO' }), {
      ver: false,
      registrar: true,
      confirmar: true,
    });

    expect(botonesOperacion()).toEqual([]);
    expect(elemento().textContent).not.toContain('Anular pago');
    expect(elemento().querySelector('app-historial-ajustes')).toBeNull();
    expect(ajustesApi.consultarHistorialAjustes).not.toHaveBeenCalled();
  });

  it('no muestra las acciones del CU36 sin permiso de escritura', async () => {
    await configurarRender(pago({ estado: 'APROBADO' }), {
      ver: true,
      registrar: false,
      confirmar: true,
    });

    expect(botonesOperacion()).toEqual([]);
    expect(elemento().querySelector('app-historial-ajustes')).not.toBeNull();
  });

  it('muestra cada acción sólo cuando su predicado se cumple', async () => {
    await configurarRender(pago({ estado: 'APROBADO', importe_vigente: '380.00' }));
    expect(botonesOperacion()).toEqual(['Anular pago', 'Corregir importe', 'Registrar devolución']);

    await configurarRender(
      pago({ estado: 'APROBADO', importe_vigente: '380.00', ajustes_pendientes: true }),
    );
    expect(botonesOperacion()).toEqual(['Anular pago']);

    await configurarRender(pago({ estado: 'APROBADO', importe_vigente: '0.00' }));
    expect(botonesOperacion()).toEqual(['Corregir importe']);
  });

  it('reutiliza la clave tras un fallo incierto y la renueva después del éxito o al cambiar el cuerpo', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    ajustesApi.anularPago
      .mockReturnValueOnce(throwError(() => new Error('conexión interrumpida')))
      .mockReturnValue(of(ajustePago({ estado: 'CONFIRMADO' })));

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);
    vista.anularPago(ANULACION);
    vista.abrirAnulacion();
    vista.anularPago(ANULACION);
    vista.anularPago({ ...ANULACION, motivo: 'Otro motivo distinto para el mismo pago' });

    const claves = ajustesApi.anularPago.mock.calls.map((llamada) => llamada[2] as string);
    expect(claves).toHaveLength(4);
    expect(claves[0]).toBe(claves[1]);
    expect(claves[2]).not.toBe(claves[1]);
    expect(claves[3]).not.toBe(claves[2]);
    expect(claves[0]).toMatch(/^ajuste-anulacion-/);
  });

  it('no presenta un estado pendiente del proveedor como éxito', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    ajustesApi.anularPago.mockReturnValue(
      of(ajustePago({ estado: 'PENDIENTE_PROVEEDOR', importe: '-380.00' })),
    );

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);

    expect(vista.mensajeResultado()).toContain('no se contabiliza todavía');
    expect(vista.mensajeResultado()).not.toContain('Ajuste confirmado');
    expect(vista.claseResultado()).toBe('detalle__resultado--aviso');
  });

  it('presenta el estado desconocido como pendiente de conciliar', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    ajustesApi.anularPago.mockReturnValue(of(ajustePago({ estado: 'DESCONOCIDO' })));

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);

    expect(vista.mensajeResultado()).toContain('Conciliar con el proveedor');
    expect(vista.claseResultado()).toBe('detalle__resultado--aviso');
  });

  it('no presenta el saldo previo como importe vigente actual al confirmar', async () => {
    await configurar(pago({ estado: 'APROBADO', importe_vigente: '380.00' }));

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);
    expect(vista.mensajeResultado()).toContain('Ajuste confirmado');
    expect(vista.mensajeResultado()).toContain('datos actualizados del servidor');
    expect(vista.mensajeResultado()).not.toContain(
      'importe vigente del pago, según el servidor, es Bs 380,00',
    );
    expect(vista.claseResultado()).toBe('detalle__resultado--exito');
  });

  it('mantiene el diálogo abierto ante un 409 y muestra el detalle del backend', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    ajustesApi.anularPago.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'La clave idempotente ya fue usada con otros datos' },
          }),
      ),
    );
    let recargas = 0;
    fixture.componentInstance.recargar.subscribe(() => (recargas += 1));

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);

    expect(vista.dialogoAnular()).toBe(true);
    expect(vista.errorOperacion()).toBe('La clave idempotente ya fue usada con otros datos');
    expect(vista.procesandoAjuste()).toBe(false);
    expect(recargas).toBe(0);
  });

  it('cierra el diálogo ante un 404 y pide recargar', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    ajustesApi.anularPago.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { detail: 'Pago no encontrado' } }),
      ),
    );
    let recargas = 0;
    fixture.componentInstance.recargar.subscribe(() => (recargas += 1));

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);

    expect(vista.dialogoAnular()).toBe(false);
    expect(recargas).toBe(1);
    expect(vista.errorOperacion()).toBe('Pago no encontrado');
  });

  it('refresca el libro de ajustes después de una escritura', async () => {
    await configurarRender(pago({ estado: 'APROBADO' }));
    let recargas = 0;
    fixture.componentInstance.recargar.subscribe(() => (recargas += 1));

    expect(ajustesApi.consultarHistorialAjustes).toHaveBeenCalledTimes(1);

    vista.abrirAnulacion();
    vista.anularPago(ANULACION);
    fixture.detectChanges();

    expect(recargas).toBe(1);
    expect(ajustesApi.consultarHistorialAjustes).toHaveBeenCalledTimes(2);
  });

  it('abre la conciliación con el ajuste emitido por el libro', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    const ajuste = ajustePago({ id: 88, estado: 'DESCONOCIDO' });

    vista.abrirConciliacion(ajuste);

    expect(vista.dialogoConciliar()).toBe(true);
    expect(vista.ajusteSeleccionado()?.id).toBe(88);
  });

  it('mapea REEMBOLSADO a su propio modificador de estado', async () => {
    await configurar(pago({ estado: 'REEMBOLSADO' }));
    expect(vista.claseEstado()).toBe('detalle__badge--reembolsado');
  });
});
