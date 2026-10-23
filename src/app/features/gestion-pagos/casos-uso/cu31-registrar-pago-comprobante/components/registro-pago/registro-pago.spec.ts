import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import {
  MetodoPago,
  NotificacionPago,
  PagoAdministrativo,
  PagoAdministrativoCrear,
  PermisosPagos,
  ServicioPendienteAdministrativo,
} from '../../models/pagos-administrativos.models';
import { ComprobantePagoService } from '../../services/comprobante-pago.service';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';
import { RegistroPago } from './registro-pago';

const PACIENTE: Paciente = {
  id: 7,
  usuario_id: 70,
  nombres: 'Ana',
  apellidos: 'Quispe',
  ci: '9001001',
  fecha_nacimiento: '1990-01-01',
  sexo: 'F',
  telefono: '70000000',
  contacto_emergencia: '70000001',
  fecha_registro: '2026-01-01T00:00:00Z',
  direccion: 'La Paz',
  estado: true,
};

const PERMISOS: PermisosPagos = { ver: true, registrar: true, confirmar: true };

function servicio(
  id: number,
  precio: string,
  consulta = 142,
): ServicioPendienteAdministrativo {
  return {
    servicio_realizado_id: id,
    paciente_id: PACIENTE.id,
    consulta_clinica_id: consulta,
    nombre_servicio: `Servicio ${id}`,
    fecha_realizacion: '2026-10-19T12:00:00Z',
    precio_aplicado: precio,
    cobrable: true,
    conflicto_pago: null,
  };
}

function pago(overrides: Partial<PagoAdministrativo> = {}): PagoAdministrativo {
  return {
    id: 1024,
    paciente_id: PACIENTE.id,
    consulta_clinica_id: 142,
    fecha_creacion: '2026-10-19T15:42:00Z',
    fecha_hora_pago: '2026-10-19T15:42:00Z',
    monto: '380.00',
    moneda: 'BOB',
    metodo_pago: 'EFECTIVO',
    estado: 'APROBADO',
    referencia_bancaria: null,
    observaciones: null,
    servicio_realizado_ids: [11, 12],
    notificacion: null,
    ...overrides,
  };
}

function notificacionPago(): NotificacionPago {
  return {
    estado: 'PENDIENTE',
    intentos: 0,
    proveedor_mensaje_id: null,
    fecha_aceptado: null,
    fecha_entregado: null,
    ultimo_error: null,
  };
}

interface VistaRegistro {
  seleccionarPaciente(paciente: Paciente): void;
  alternarServicio(item: ServicioPendienteAdministrativo): void;
  seleccionarMetodo(metodo: MetodoPago): void;
  actualizarReferencia(valor: string): void;
  registrar(): void;
  reintentarMismoIntento(): void;
  reconciliar(): void;
  enviando(): boolean;
  incierto(): { clave: string; monto: number } | null;
  resultado(): PagoAdministrativo | null;
  seleccionados(): number[];
  total(): number;
  errorRegistro(): string | null;
  avisoSeleccion(): string | null;
  puedeRegistrar(): boolean;
}

describe('CU31 — registro de pagos', () => {
  let fixture: ComponentFixture<RegistroPago>;
  let vista: VistaRegistro;
  let api: {
    listarServiciosPendientes: ReturnType<typeof vi.fn>;
    registrarPago: ReturnType<typeof vi.fn>;
    listarPagos: ReturnType<typeof vi.fn>;
    consultarNotificacion: ReturnType<typeof vi.fn>;
    reintentarNotificacion: ReturnType<typeof vi.fn>;
  };
  let comprobantes: { descargar: ReturnType<typeof vi.fn> };

  async function configurar(
    servicios: ServicioPendienteAdministrativo[] = [servicio(11, '200.00'), servicio(12, '180.00')],
    permisos: PermisosPagos = PERMISOS,
  ): Promise<void> {
    api = {
      listarServiciosPendientes: vi.fn(() =>
        of({
          paciente_id: PACIENTE.id,
          consulta_clinica_id: null,
          servicios,
          total: '380.00',
        }),
      ),
      registrarPago: vi.fn(() => of(pago())),
      listarPagos: vi.fn(() =>
        of({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
      ),
      consultarNotificacion: vi.fn(() => of(notificacionPago())),
      reintentarNotificacion: vi.fn(() => of(notificacionPago())),
    };
    comprobantes = { descargar: vi.fn(() => of(undefined)) };

    TestBed.configureTestingModule({
      imports: [RegistroPago],
      providers: [
        { provide: PagosAdministrativosService, useValue: api },
        { provide: ComprobantePagoService, useValue: comprobantes },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(RegistroPago, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(RegistroPago);
    fixture.componentRef.setInput('pacientes', [PACIENTE]);
    fixture.componentRef.setInput('permisos', permisos);
    vista = fixture.componentInstance as unknown as VistaRegistro;
    fixture.detectChanges();
  }

  it('registra en efectivo con el endpoint, el importe del backend y una clave de idempotencia', async () => {
    await configurar();
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));
    vista.alternarServicio(servicio(12, '180.00'));

    expect(vista.total()).toBe(380);
    expect(vista.puedeRegistrar()).toBe(true);

    vista.registrar();

    expect(api.registrarPago).toHaveBeenCalledTimes(1);
    const [payload, clave] = api.registrarPago.mock.calls[0] as [
      PagoAdministrativoCrear,
      string,
    ];
    expect(payload).toEqual({
      paciente_id: PACIENTE.id,
      servicio_realizado_ids: [11, 12],
      metodo_pago: 'EFECTIVO',
      referencia_bancaria: null,
      observaciones: null,
    });
    expect(clave).toMatch(/^[A-Za-z0-9._:/-]{8,100}$/);
    expect(vista.resultado()?.estado).toBe('APROBADO');
    expect(vista.seleccionados()).toEqual([]);
  });

  it('exige referencia bancaria en transferencia y conserva el estado PENDIENTE', async () => {
    await configurar();
    api.registrarPago.mockReturnValue(
      of(pago({ estado: 'PENDIENTE', metodo_pago: 'TRANSFERENCIA', fecha_hora_pago: null })),
    );
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));
    vista.seleccionarMetodo('TRANSFERENCIA');

    vista.registrar();
    expect(api.registrarPago).not.toHaveBeenCalled();
    expect(vista.errorRegistro()).toContain('referencia bancaria');

    vista.actualizarReferencia('TRX-9001');
    vista.registrar();

    const [payload] = api.registrarPago.mock.calls[0] as [PagoAdministrativoCrear];
    expect(payload.metodo_pago).toBe('TRANSFERENCIA');
    expect(payload.referencia_bancaria).toBe('TRX-9001');
    expect(vista.resultado()?.estado).toBe('PENDIENTE');
  });

  it('no registra sin servicios seleccionados', async () => {
    await configurar([]);
    vista.seleccionarPaciente(PACIENTE);

    vista.registrar();

    expect(api.registrarPago).not.toHaveBeenCalled();
    expect(vista.errorRegistro()).toContain('al menos un servicio');
  });

  it('bloquea envíos simultáneos mientras una solicitud está en curso', async () => {
    await configurar();
    const pendiente = new Subject<PagoAdministrativo>();
    api.registrarPago.mockReturnValue(pendiente.asObservable());
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();
    vista.registrar();

    expect(api.registrarPago).toHaveBeenCalledTimes(1);
    expect(vista.enviando()).toBe(true);
    pendiente.complete();
  });

  it('no permite mezclar servicios de consultas distintas en un mismo pago', async () => {
    await configurar([servicio(11, '200.00', 142), servicio(21, '180.00', 143)]);
    vista.seleccionarPaciente(PACIENTE);

    vista.alternarServicio(servicio(11, '200.00', 142));
    vista.alternarServicio(servicio(21, '180.00', 143));

    expect(vista.seleccionados()).toEqual([11]);
    expect(vista.avisoSeleccion()).toContain('misma consulta');
  });

  it('ante un resultado incierto reutiliza la misma clave y no duplica el cobro', async () => {
    await configurar();
    api.registrarPago.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();
    const intento = vista.incierto();
    expect(intento).not.toBeNull();
    expect(vista.resultado()).toBeNull();

    const primeraClave = (api.registrarPago.mock.calls[0] as [unknown, string])[1];
    expect(intento?.clave).toBe(primeraClave);

    api.registrarPago.mockReturnValue(of(pago({ monto: '200.00', servicio_realizado_ids: [11] })));
    vista.reintentarMismoIntento();

    expect(api.registrarPago).toHaveBeenCalledTimes(2);
    const segundaClave = (api.registrarPago.mock.calls[1] as [unknown, string])[1];
    expect(segundaClave).toBe(primeraClave);
    expect(vista.resultado()?.id).toBe(1024);
  });

  it('reconcilia un resultado incierto consultando los pagos del paciente', async () => {
    await configurar();
    api.registrarPago.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));
    vista.alternarServicio(servicio(12, '180.00'));
    vista.registrar();

    api.listarPagos.mockReturnValue(
      of({
        items: [pago({ monto: '380.00', servicio_realizado_ids: [11, 12] })],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      }),
    );
    vista.reconciliar();

    expect(api.listarPagos).toHaveBeenCalledWith({
      paciente_id: PACIENTE.id,
      page: 1,
      page_size: 20,
    });
    expect(vista.resultado()?.id).toBe(1024);
    expect(vista.incierto()).toBeNull();
  });

  it('un usuario sin permiso de escritura no puede seleccionar servicios ni registrar', async () => {
    await configurar(undefined, { ver: true, registrar: false, confirmar: false });
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();

    expect(vista.seleccionados()).toEqual([]);
    expect(api.registrarPago).not.toHaveBeenCalled();
    expect(vista.errorRegistro()).toContain('no habilita');
  });

  it('activa la animación al enviar y la detiene al recibir la respuesta', async () => {
    await configurar();
    const pendiente = new Subject<PagoAdministrativo>();
    api.registrarPago.mockReturnValue(pendiente.asObservable());
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();
    expect(vista.enviando()).toBe(true);

    pendiente.next(pago({ monto: '200.00', servicio_realizado_ids: [11] }));
    pendiente.complete();

    expect(vista.enviando()).toBe(false);
    expect(vista.resultado()?.estado).toBe('APROBADO');
    expect(vista.incierto()).toBeNull();
  });

  it('detiene la animación si la petición termina sin respuesta concluyente', async () => {
    await configurar();
    const pendiente = new Subject<PagoAdministrativo>();
    api.registrarPago.mockReturnValue(pendiente.asObservable());
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();
    expect(vista.enviando()).toBe(true);

    pendiente.complete();

    expect(vista.enviando()).toBe(false);
    expect(vista.resultado()).toBeNull();
    expect(vista.incierto()).toBeNull();
  });

  it('detiene la animación ante un error HTTP concluyente y muestra el mensaje', async () => {
    await configurar();
    api.registrarPago.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { detail: 'Método de pago inválido' },
          }),
      ),
    );
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();

    expect(vista.enviando()).toBe(false);
    expect(vista.incierto()).toBeNull();
    expect(vista.resultado()).toBeNull();
    expect(vista.errorRegistro()).toContain('Método de pago inválido');
  });

  it('detiene la animación ante un resultado incierto conservando la clave', async () => {
    await configurar();
    api.registrarPago.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));

    vista.registrar();

    expect(vista.enviando()).toBe(false);
    expect(vista.incierto()).not.toBeNull();
    const claveEnviada = (api.registrarPago.mock.calls[0] as [unknown, string])[1];
    expect(vista.incierto()?.clave).toBe(claveEnviada);
  });
});

describe('CU31 — overlay de carga en la plantilla del registro', () => {
  let fixture: ComponentFixture<RegistroPago>;
  let vista: VistaRegistro;
  let api: {
    listarServiciosPendientes: ReturnType<typeof vi.fn>;
    registrarPago: ReturnType<typeof vi.fn>;
    listarPagos: ReturnType<typeof vi.fn>;
    consultarNotificacion: ReturnType<typeof vi.fn>;
    reintentarNotificacion: ReturnType<typeof vi.fn>;
  };

  async function configurar(): Promise<void> {
    api = {
      listarServiciosPendientes: vi.fn(() =>
        of({
          paciente_id: PACIENTE.id,
          consulta_clinica_id: null,
          servicios: [servicio(11, '200.00')],
          total: '200.00',
        }),
      ),
      registrarPago: vi.fn(() => of(pago())),
      listarPagos: vi.fn(() =>
        of({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
      ),
      consultarNotificacion: vi.fn(() => of(notificacionPago())),
      reintentarNotificacion: vi.fn(() => of(notificacionPago())),
    };

    TestBed.configureTestingModule({
      imports: [RegistroPago],
      providers: [
        { provide: PagosAdministrativosService, useValue: api },
        {
          provide: ComprobantePagoService,
          useValue: { descargar: vi.fn(() => of(undefined)) },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(RegistroPago);
    fixture.componentRef.setInput('pacientes', [PACIENTE]);
    fixture.componentRef.setInput('permisos', PERMISOS);
    vista = fixture.componentInstance as unknown as VistaRegistro;
    fixture.detectChanges();
  }

  it('cubre el panel del cobro mientras la petición está pendiente y libera el botón al terminar', async () => {
    await configurar();
    vista.seleccionarPaciente(PACIENTE);
    vista.alternarServicio(servicio(11, '200.00'));
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector(
      '.registro__panel--cobro',
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-busy')).toBe('false');
    expect(panel.querySelector('app-spinner-pago')).toBeNull();

    const pendiente = new Subject<PagoAdministrativo>();
    api.registrarPago.mockReturnValue(pendiente.asObservable());
    vista.registrar();
    fixture.detectChanges();

    const overlay = panel.querySelector('app-spinner-pago');
    expect(overlay).not.toBeNull();
    expect(panel.getAttribute('aria-busy')).toBe('true');
    expect(overlay?.querySelector('[role="status"]')?.textContent).toContain(
      'Registrando pago',
    );

    const boton = panel.querySelector(
      '.registro__btn--primario',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    pendiente.complete();
    fixture.detectChanges();

    expect(panel.querySelector('app-spinner-pago')).toBeNull();
    expect(panel.getAttribute('aria-busy')).toBe('false');
    fixture.destroy();
  });
});
