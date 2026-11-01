import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { environment } from '../../../../../../../environments/environment';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  CuotaRespuesta,
  PagoCuotaResumen,
  PermisosPlanesCuotas,
  PlanPagoRespuesta,
} from '../../models/planes-cuotas.models';
import { PlanesPagoService } from '../../services/planes-pago.service';
import { PlanPagoDetalle } from './plan-pago-detalle';

interface VistaPagina {
  estadoPermiso(): string;
  motivoSinAcceso(): string | null;
  tituloSinAcceso(): string;
  detalleSinAcceso(): string;
  permisos(): PermisosPlanesCuotas;
  plan(): PlanPagoRespuesta | null;
  proximaCuota(): CuotaRespuesta | null;
  intentosPendientes(): Array<{ cuota: CuotaRespuesta; pago: PagoCuotaResumen }>;
  cuotaCobro(): CuotaRespuesta | null;
  errorCobro(): string | null;
  errorIntentos(): string | null;
  errorCancelacion(): string | null;
  intentos(): PagoCuotaResumen[];
  errorComprobante(): string | null;
  descargandoComprobante(): number | null;
  puedeGestionarCuota(cuota: CuotaRespuesta): boolean;
  puedeDescargarComprobante(pago: PagoCuotaResumen): boolean;
  descargarComprobante(pago: PagoCuotaResumen): void;
  abrirCobro(cuota: CuotaRespuesta): void;
  cambiarMetodo(valor: string): void;
  escribirReferencia(valor: string): void;
  registrarCobro(): void;
  verIntentos(cuota: CuotaRespuesta): void;
  confirmarIntento(pago: PagoCuotaResumen): void;
  abrirRechazo(pago: PagoCuotaResumen): void;
  escribirMotivoRechazo(valor: string): void;
  rechazarIntento(): void;
  abrirCancelacion(): void;
  escribirMotivoCancelacion(valor: string): void;
  cancelarPlan(): void;
  confirmarCancelacion(): boolean;
  cancelacionBloqueada(): boolean;
  puedeCancelarPlan(): boolean;
  motivoCancelacionBloqueada: string;
}

const MODULO_CUOTAS: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 1, accion_nombre: 'LECTURA' },
    { id: 41, nombre: 'Gestionar cuotas', accion_id: 3, accion_nombre: 'AMBAS' },
  ],
};

const MODULO_PLANES_ESCRITURA: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 3, accion_nombre: 'AMBAS' },
    { id: 41, nombre: 'Gestionar cuotas', accion_id: 3, accion_nombre: 'AMBAS' },
  ],
};

const PAGO_PENDIENTE: PagoCuotaResumen = {
  pago_id: 77,
  metodo_pago: 'QR',
  estado: 'PENDIENTE',
  monto: '100.00',
  fecha_creacion: '2026-10-20T12:00:00.000Z',
  aplicado_a_cuota: false,
};

const PAGO_APROBADO: PagoCuotaResumen = {
  ...PAGO_PENDIENTE,
  pago_id: 70,
  estado: 'APROBADO',
  aplicado_a_cuota: true,
};

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

function planMock(): PlanPagoRespuesta {
  return {
    id: 9,
    paciente_id: 7,
    consulta_clinica_id: 142,
    monto_total: '300.00',
    moneda: 'BOB',
    cantidad_cuotas: 3,
    fecha_creacion: '2026-09-01T12:00:00.000Z',
    estado: 'ACTIVO',
    observaciones: null,
    creado_por: 4,
    saldo_pendiente: '200.00',
    monto_pagado: '100.00',
    servicios: [],
    cuotas: [
      cuota(31, 1, 'PAGADA', '2026-09-15', [
        { ...PAGO_PENDIENTE, pago_id: 70, estado: 'APROBADO', aplicado_a_cuota: true },
      ]),
      cuota(32, 2, 'PENDIENTE', '2026-10-15', [PAGO_PENDIENTE]),
      cuota(33, 3, 'PENDIENTE', '2026-11-15'),
    ],
  };
}

/** Plan activo sin cobros aprobados: único caso cancelable según CU32. */
function planSinCobros(): PlanPagoRespuesta {
  return {
    ...planMock(),
    saldo_pendiente: '300.00',
    monto_pagado: '0.00',
    cuotas: [
      cuota(31, 1, 'PENDIENTE', '2026-09-15'),
      cuota(32, 2, 'PENDIENTE', '2026-10-15'),
      cuota(33, 3, 'PENDIENTE', '2026-11-15'),
    ],
  };
}

describe('CU33 — detalle del plan de pago', () => {
  let fixture: ComponentFixture<PlanPagoDetalle>;
  let vista: VistaPagina;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let http: HttpTestingController;
  let click: ReturnType<typeof vi.spyOn>;
  let obtenerPlan: ReturnType<typeof vi.fn>;
  let registrarPagoCuota: ReturnType<typeof vi.fn>;
  let confirmarPagoCuota: ReturnType<typeof vi.fn>;
  let rechazarPagoCuota: ReturnType<typeof vi.fn>;
  let cancelarPlan: ReturnType<typeof vi.fn>;
  let listarIntentosCuota: ReturnType<typeof vi.fn>;

  async function configurar(
    modulos: MenuModulo[] = [MODULO_CUOTAS],
    idRuta: string | null = '9',
    plan: PlanPagoRespuesta = planMock(),
  ): Promise<void> {
    const estado = signal('listo');
    const menu = signal(modulos);
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    obtenerPlan = vi.fn(() => of(plan));
    registrarPagoCuota = vi.fn(() => of({ pago_id: 88, cuota_id: 32 }));
    confirmarPagoCuota = vi.fn(() => of({ pago_id: 77, cuota_id: 32 }));
    rechazarPagoCuota = vi.fn(() => of({ pago_id: 77, cuota_id: 32 }));
    cancelarPlan = vi.fn(() => of({ ...planMock(), estado: 'CANCELADO' }));
    listarIntentosCuota = vi.fn(() =>
      of({ cuota_id: 32, estado_cuota: 'PENDIENTE', intentos: [PAGO_PENDIENTE] }),
    );

    TestBed.configureTestingModule({
      imports: [PlanPagoDetalle],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MenuService,
          useValue: {
            estado: estado.asReadonly(),
            modulos: menu.asReadonly(),
            cargar: vi.fn(),
            reintentar: vi.fn(),
          },
        },
        { provide: PacientesService, useValue: { listarPacientes: vi.fn(() => of([])) } },
        {
          provide: PlanesPagoService,
          useValue: {
            obtenerPlan,
            registrarPagoCuota,
            confirmarPagoCuota,
            rechazarPagoCuota,
            cancelarPlan,
            listarIntentosCuota,
          },
        },
        { provide: AuthService, useValue: { tenantCode: () => 'clinica_demo' } },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (clave: string) => (clave === 'id' ? idRuta : null) },
            },
          },
        },
      ],
    });
    TestBed.overrideComponent(PlanPagoDetalle, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(PlanPagoDetalle);
    vista = fixture.componentInstance as unknown as VistaPagina;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:comprobante'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
    click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    click.mockRestore();
    http?.verify();
  });

  it('no consulta el plan sin permisos de planes ni cuotas', async () => {
    await configurar([]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-modulo');
    expect(obtenerPlan).not.toHaveBeenCalled();
  });

  it('rechaza una ruta sin identificador numérico de plan', async () => {
    await configurar([MODULO_CUOTAS], 'abc');

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('plan-invalido');
    expect(vista.tituloSinAcceso()).toContain('identificador del plan no es válido');
    expect(obtenerPlan).not.toHaveBeenCalled();
  });

  it('carga el plan con permiso sobre cuotas y deriva el resumen', async () => {
    await configurar();

    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(obtenerPlan).toHaveBeenCalledWith(9);
    expect(vista.plan()?.id).toBe(9);
    expect(vista.proximaCuota()?.id).toBe(32);
    expect(vista.intentosPendientes().map((item) => item.pago.pago_id)).toEqual([77]);
    expect(vista.permisos().escribirCuotas).toBe(true);
  });

  it('solo permite cobrar cuotas exigibles de un plan activo', async () => {
    await configurar();

    const plan = vista.plan()!;
    expect(vista.puedeGestionarCuota(plan.cuotas[0])).toBe(false);
    expect(vista.puedeGestionarCuota(plan.cuotas[1])).toBe(true);

    vista.abrirCobro(plan.cuotas[0]);
    expect(vista.cuotaCobro()).toBeNull();

    vista.abrirCobro(plan.cuotas[1]);
    expect(vista.cuotaCobro()?.id).toBe(32);
  });

  it('exige la referencia bancaria antes de registrar el cobro', async () => {
    await configurar();
    vista.abrirCobro(vista.plan()!.cuotas[1]);

    vista.cambiarMetodo('TRANSFERENCIA');
    vista.registrarCobro();

    expect(vista.errorCobro()).toContain('referencia bancaria');
    expect(registrarPagoCuota).not.toHaveBeenCalled();
  });

  it('registra el cobro con Idempotency-Key y refresca el plan', async () => {
    await configurar();
    vista.abrirCobro(vista.plan()!.cuotas[1]);
    vista.cambiarMetodo('TRANSFERENCIA');
    vista.escribirReferencia('  TRX-9901  ');

    vista.registrarCobro();

    expect(registrarPagoCuota).toHaveBeenCalledTimes(1);
    const [cuotaId, datos, clave] = registrarPagoCuota.mock.calls[0] as [
      number,
      { metodo_pago: string; referencia_bancaria: string | null; observaciones: string | null },
      string,
    ];
    expect(cuotaId).toBe(32);
    expect(datos).toEqual({
      metodo_pago: 'TRANSFERENCIA',
      referencia_bancaria: 'TRX-9901',
      observaciones: null,
    });
    expect(clave).toMatch(/^cuota-/);
    expect(vista.cuotaCobro()).toBeNull();
    expect(obtenerPlan).toHaveBeenCalledTimes(2);
  });

  it('confirma un intento pendiente desde el modal de intentos', async () => {
    await configurar();
    vista.verIntentos(vista.plan()!.cuotas[1]);

    expect(listarIntentosCuota).toHaveBeenCalledWith(32);
    expect(vista.intentos().map((intento) => intento.pago_id)).toEqual([77]);

    vista.confirmarIntento(PAGO_PENDIENTE);

    expect(confirmarPagoCuota).toHaveBeenCalledWith(32, 77);
    expect(obtenerPlan).toHaveBeenCalledTimes(2);
  });

  it('pide un motivo de al menos cinco caracteres para rechazar', async () => {
    await configurar();
    vista.verIntentos(vista.plan()!.cuotas[1]);
    vista.abrirRechazo(PAGO_PENDIENTE);
    vista.escribirMotivoRechazo('mal');

    vista.rechazarIntento();

    expect(vista.errorIntentos()).toContain('mínimo 5 caracteres');
    expect(rechazarPagoCuota).not.toHaveBeenCalled();

    vista.escribirMotivoRechazo('Comprobante ilegible');
    vista.rechazarIntento();

    expect(rechazarPagoCuota).toHaveBeenCalledWith(32, 77, 'Comprobante ilegible');
  });

  it('cancela el plan solo con motivo suficiente y permiso de escritura', async () => {
    await configurar([MODULO_PLANES_ESCRITURA], '9', planSinCobros());
    vista.abrirCancelacion();
    vista.escribirMotivoCancelacion('x');

    vista.cancelarPlan();
    expect(vista.errorCancelacion()).toContain('mínimo 5 caracteres');
    expect(cancelarPlan).not.toHaveBeenCalled();

    vista.escribirMotivoCancelacion('Paciente desistió del tratamiento');
    vista.cancelarPlan();

    expect(cancelarPlan).toHaveBeenCalledWith(9, 'Paciente desistió del tratamiento');
    expect(vista.plan()?.estado).toBe('CANCELADO');
  });

  it('deshabilita la cancelación cuando el plan ya tiene cobros aprobados', async () => {
    await configurar([MODULO_PLANES_ESCRITURA]);

    expect(vista.cancelacionBloqueada()).toBe(true);
    expect(vista.puedeCancelarPlan()).toBe(false);
    expect(vista.motivoCancelacionBloqueada).toContain('cobros aprobados');

    vista.abrirCancelacion();
    expect(vista.confirmarCancelacion()).toBe(false);

    vista.escribirMotivoCancelacion('Paciente desistió del tratamiento');
    vista.cancelarPlan();

    expect(cancelarPlan).not.toHaveBeenCalled();
  });

  it('mantiene la cancelación disponible en un plan activo sin cobros', async () => {
    await configurar([MODULO_PLANES_ESCRITURA], '9', planSinCobros());

    expect(vista.cancelacionBloqueada()).toBe(false);
    expect(vista.puedeCancelarPlan()).toBe(true);

    vista.abrirCancelacion();
    expect(vista.confirmarCancelacion()).toBe(true);
  });

  it('exige permiso de escritura para habilitar la cancelación', async () => {
    await configurar([MODULO_CUOTAS], '9', planSinCobros());

    expect(vista.cancelacionBloqueada()).toBe(false);
    expect(vista.puedeCancelarPlan()).toBe(false);

    vista.abrirCancelacion();
    expect(vista.confirmarCancelacion()).toBe(false);
  });

  it('muestra el rechazo del backend si el plan cambió antes de cancelar', async () => {
    await configurar([MODULO_PLANES_ESCRITURA], '9', planSinCobros());
    cancelarPlan.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'El plan tiene cobros aprobados y no puede cancelarse' },
          }),
      ),
    );

    vista.abrirCancelacion();
    vista.escribirMotivoCancelacion('Paciente desistió del tratamiento');
    vista.cancelarPlan();

    expect(cancelarPlan).toHaveBeenCalledTimes(1);
    expect(vista.errorCancelacion()).toBe(
      'El plan tiene cobros aprobados y no puede cancelarse',
    );
    expect(vista.plan()?.estado).toBe('ACTIVO');
  });

  it('solo ofrece el comprobante de pagos aprobados y con lectura de cuotas', async () => {
    await configurar();

    expect(vista.puedeDescargarComprobante(PAGO_APROBADO)).toBe(true);
    expect(vista.puedeDescargarComprobante(PAGO_PENDIENTE)).toBe(false);
    expect(
      vista.puedeDescargarComprobante({ ...PAGO_APROBADO, estado: 'RECHAZADO' }),
    ).toBe(false);
  });

  it('no pide el comprobante sin permiso de lectura de cuotas', async () => {
    await configurar([
      {
        id: 8,
        nombre: 'Pagos',
        funciones: [
          { id: 40, nombre: 'Gestionar planes de pago', accion_id: 1, accion_nombre: 'LECTURA' },
        ],
      },
    ]);

    expect(vista.puedeDescargarComprobante(PAGO_APROBADO)).toBe(false);
    vista.descargarComprobante(PAGO_APROBADO);

    http.expectNone(`${environment.apiUrl}/pagos/administrativos/70/comprobante`);
    expect(click).not.toHaveBeenCalled();
    expect(vista.errorComprobante()).toBeNull();
  });

  it('no pide el comprobante de un pago que no está aprobado', async () => {
    await configurar();

    vista.descargarComprobante(PAGO_PENDIENTE);

    http.expectNone(`${environment.apiUrl}/pagos/administrativos/77/comprobante`);
    expect(click).not.toHaveBeenCalled();
    expect(vista.descargandoComprobante()).toBeNull();
  });

  it('descarga el PDF real del pago aprobado con su nombre de archivo', async () => {
    await configurar();

    vista.descargarComprobante(PAGO_APROBADO);
    expect(vista.descargandoComprobante()).toBe(70);

    const peticion = http.expectOne(`${environment.apiUrl}/pagos/administrativos/70/comprobante`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF-1.4 comprobante'], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="comprobante_pago_70.pdf"',
      },
    });

    expect(click).toHaveBeenCalledTimes(1);
    const enlace = click.mock.instances[0] as HTMLAnchorElement;
    expect(enlace.download).toBe('comprobante_pago_70.pdf');
    expect(enlace.href).toBe('blob:comprobante');
    expect(vista.descargandoComprobante()).toBeNull();
    expect(vista.errorComprobante()).toBeNull();
  });

  it('informa el error del backend cuando el comprobante no está autorizado', async () => {
    await configurar();

    vista.descargarComprobante(PAGO_APROBADO);
    http
      .expectOne(`${environment.apiUrl}/pagos/administrativos/70/comprobante`)
      .flush(new Blob(['{"detail":"Comprobante no disponible"}'], { type: 'application/json' }), {
        status: 403,
        statusText: 'Forbidden',
      });

    expect(vista.errorComprobante()).toContain('permisos');
    expect(vista.descargandoComprobante()).toBeNull();
    expect(click).not.toHaveBeenCalled();
  });

  it('informa cuando el servidor devuelve un PDF vacío', async () => {
    await configurar();

    vista.descargarComprobante(PAGO_APROBADO);
    http
      .expectOne(`${environment.apiUrl}/pagos/administrativos/70/comprobante`)
      .flush(new Blob([], { type: 'application/pdf' }), {
        headers: { 'Content-Type': 'application/pdf' },
      });

    expect(vista.errorComprobante()).toContain('no devolvió');
    expect(vista.descargandoComprobante()).toBeNull();
    expect(click).not.toHaveBeenCalled();
  });
});