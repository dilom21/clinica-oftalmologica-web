import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { EstadoCuentaService } from '../../services/estado-cuenta.service';
import { PagosAdministrativosService } from '../../../cu31-registrar-pago-comprobante/services/pagos-administrativos.service';
import { ConsultarEstadoCuenta } from './consultar-estado-cuenta';
import { EstadoCuentaRespuesta } from '../../models/estado-cuenta.models';
import { ComprobantePagoService } from '../../../cu31-registrar-pago-comprobante/services/comprobante-pago.service';

const MODULO = {
  id: 2,
  nombre: 'Pagos',
  funciones: [
    { id: 31, nombre: 'Gestionar pagos', accion_id: 1, accion_nombre: 'LECTURA' },
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 1, accion_nombre: 'LECTURA' },
    { id: 41, nombre: 'Gestionar cuotas', accion_id: 1, accion_nombre: 'LECTURA' },
  ],
};
const paciente = {
  id: 19,
  nombres: 'Rosa',
  apellidos: 'Mamani',
  ci: null as string | null,
  telefono: null as string | null,
  estado: true,
};
const cuenta = {
  paciente: { id: 19, nombres: 'Rosa', apellidos: 'Mamani', ci: null, telefono: null },
  resumen: {
    moneda: 'BOB',
    importe_total_servicios: '0.00',
    total_pagos_aprobados_aplicados: '0.00',
    saldo_total_pendiente: '0.00',
    saldo_servicios_no_financiados: '0.00',
    saldo_planes_pago: '0.00',
    importe_cuotas_vencidas: '0.00',
    cantidad_planes_activos: 0,
    cantidad_cuotas_pendientes: 0,
    cantidad_cuotas_pagadas: 0,
    cantidad_cuotas_vencidas: 0,
  },
  servicios: [],
  planes_pago: [],
  pagos_pendientes_confirmacion: [],
};
const cuentaConServicios: EstadoCuentaRespuesta = {
  ...cuenta,
  servicios: [
    {
      servicio_realizado_id: 1,
      consulta_clinica_id: null,
      servicio: 'Servicio antiguo',
      fecha_realizacion: '2026-01-01',
      precio_aplicado: '50.00',
      monto_pagado_aplicado: '0.00',
      saldo_pendiente: '50.00',
      financiado: false,
      plan_pago_id: null,
    },
    {
      servicio_realizado_id: 2,
      consulta_clinica_id: null,
      servicio: 'Servicio reciente',
      fecha_realizacion: '2026-11-01',
      precio_aplicado: '100.00',
      monto_pagado_aplicado: '25.00',
      saldo_pendiente: '75.00',
      financiado: true,
      plan_pago_id: 77,
    },
    {
      servicio_realizado_id: 3,
      consulta_clinica_id: null,
      servicio: 'Servicio pagado',
      fecha_realizacion: '2026-06-01',
      precio_aplicado: '10.00',
      monto_pagado_aplicado: '10.00',
      saldo_pendiente: '0.00',
      financiado: false,
      plan_pago_id: null,
    },
    {
      servicio_realizado_id: 4,
      consulta_clinica_id: null,
      servicio: 'Servicio sin fecha',
      fecha_realizacion: null,
      precio_aplicado: '10.00',
      monto_pagado_aplicado: '10.00',
      saldo_pendiente: '0.00',
      financiado: false,
      plan_pago_id: null,
    },
  ],
  planes_pago: [
    {
      id: 77,
      monto_total: '100.00',
      saldo_pendiente: '75.00',
      moneda: 'BOB',
      estado: 'ACTIVO',
      cuotas: [
        {
          id: 1,
          numero_cuota: 1,
          monto_programado: '25.00',
          fecha_vencimiento: '2026-11-01',
          estado: 'PAGADA',
        },
        {
          id: 2,
          numero_cuota: 2,
          monto_programado: '75.00',
          fecha_vencimiento: '2026-12-01',
          estado: 'PENDIENTE',
        },
      ],
    },
  ],
};
interface Vista {
  seleccionar(p: typeof paciente): void;
  cambiarPaciente(): void;
  cargarCuenta(): void;
  aplicarFiltrosHistorial(): void;
  limpiarFiltrosHistorial(): void;
  cambiarPagina(delta: number): void;
  actualizarFiltro(event: Event, field: 'desde' | 'hasta' | 'metodo' | 'estado'): void;
  buscar(value: string): void;
  sugerencias(): (typeof paciente)[];
  permiso(): string;
  cuenta(): unknown;
  pacientes(): unknown[];
  pagos(): unknown[];
  error(): string | null;
  seleccionarPestana(id: 'resumen' | 'servicios' | 'planes' | 'historial' | 'pendientes'): void;
  alternarServicio(id: number): void;
  verPlan(id: number): void;
  servicioSeleccionado(): number | null;
  planSeleccionadoId(): number | null;
  pagoSeleccionado(): unknown;
  pestana(): string;
}

describe('CU34 — consulta estado cuenta y aislamiento de historial', () => {
  let fixture: ComponentFixture<ConsultarEstadoCuenta>;
  let view: Vista;
  let menu: any;
  let pacienteApi: any;
  let cuentaApi: any;
  let pagosApi: any;
  let revision: ReturnType<typeof signal<number>>;
  let tenantActivo: ReturnType<typeof signal<string | null>>;
  let descargar: ReturnType<typeof vi.fn>;

  async function iniciar(
    funciones = MODULO.funciones,
    tenant: string | null = 'CLINICA_A',
    estadoInicial: 'listo' | 'cargando' = 'listo',
    listadoPacientes = [paciente],
  ) {
    TestBed.resetTestingModule();
    const estado = signal<'listo' | 'cargando'>(estadoInicial);
    const modulos = signal([{ ...MODULO, funciones }]);
    menu = {
      estado,
      modulos,
      cargar: vi.fn(),
      reintentar: vi.fn(),
      sincronizarSesion: vi.fn(),
      cargando: computed(() => estado() === 'cargando'),
      error: computed(() => false),
    };
    revision = signal(1);
    tenantActivo = signal(tenant);
    const revisionPerfil = signal(1);
    const empresa = signal(null);
    const estadoEmpresa = signal<'listo'>('listo');
    pacienteApi = { listarPacientes: vi.fn(() => of(listadoPacientes)) };
    cuentaApi = { consultar: vi.fn(() => of(cuenta)) };
    pagosApi = {
      listarPagos: vi.fn(() => of({ items: [], total: 0, total_pages: 0, page: 1, page_size: 5 })),
      consultarNotificacion: vi.fn(() =>
        of({
          estado: 'ACEPTADO_POR_PROVEEDOR',
          intentos: 1,
          fecha_aceptado: null,
          fecha_entregado: null,
          ultimo_error: null,
          proveedor_mensaje_id: null,
        }),
      ),
      confirmarPago: vi.fn(),
      reintentarNotificacion: vi.fn(),
    };
    descargar = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [ConsultarEstadoCuenta],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuService, useValue: menu },
        {
          provide: AuthService,
          useValue: {
            revisionSesion: revision.asReadonly(),
            revisionPerfil: revisionPerfil.asReadonly(),
            empresa: empresa.asReadonly(),
            estadoEmpresa: estadoEmpresa.asReadonly(),
            tenantCode: () => tenantActivo(),
            obtenerPerfilActual: () => null,
            inicializarContextoEmpresa: vi.fn(),
            reintentarContextoEmpresa: vi.fn(),
            logout: vi.fn(),
          },
        },
        { provide: PacientesService, useValue: pacienteApi },
        { provide: EstadoCuentaService, useValue: cuentaApi },
        { provide: PagosAdministrativosService, useValue: pagosApi },
        { provide: ComprobantePagoService, useValue: { descargar } },
      ],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(ConsultarEstadoCuenta);
    fixture.detectChanges();
    view = fixture.componentInstance as unknown as Vista;
  }

  it('no pide pacientes ni datos financieros mientras los permisos no están resueltos', async () => {
    await iniciar(MODULO.funciones, 'CLINICA_A', 'cargando');
    expect(pacienteApi.listarPacientes).not.toHaveBeenCalled();
    expect(cuentaApi.consultar).not.toHaveBeenCalled();
    expect(pagosApi.listarPagos).not.toHaveBeenCalled();
  });

  it.each(['Gestionar pagos', 'Gestionar planes de pago', 'Gestionar cuotas'])(
    'deniega si falta el permiso requerido %s',
    async (nombre) => {
      await iniciar(MODULO.funciones.filter((f) => f.nombre !== nombre));
      expect(view.permiso()).toBe('denegado');
      expect(pacienteApi.listarPacientes).not.toHaveBeenCalled();
      expect(cuentaApi.consultar).not.toHaveBeenCalled();
    },
  );

  it('exige tenant y las tres acciones de lectura, acepta AMBAS y sólo consulta al seleccionar', async () => {
    await iniciar(MODULO.funciones.map((f) => ({ ...f, accion_nombre: 'AMBAS' })));
    expect(view.permiso()).toBe('autorizado');
    expect(pacienteApi.listarPacientes).toHaveBeenCalledTimes(1);
    expect(cuentaApi.consultar).not.toHaveBeenCalled();
    view.seleccionar(paciente);
    expect(cuentaApi.consultar).toHaveBeenCalledWith(19);
    expect(pagosApi.listarPagos).toHaveBeenCalledWith(
      expect.objectContaining({ paciente_id: 19, page: 1 }),
    );
    expect(view.cuenta()).toEqual(cuenta);
  });

  it('renderiza identidad con campos nulos, saldo cero y estados vacíos sin inventar deuda', async () => {
    await iniciar();
    view.seleccionar(paciente);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Consultar pagos y saldos');
    expect(text).toContain('Rosa Mamani');
    expect(text).toContain('CI: No registrado');
    expect(text).toContain('Teléfono: No registrado');
    expect(text).toContain('Saldo pendiente');
    expect(text).toContain('Bs 0,00');
    expect(text).toContain('No hay servicios registrados');
    view.seleccionarPestana('planes');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay planes de pago asociados');
    view.seleccionarPestana('historial');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No hay pagos registrados para este paciente',
    );
  });

  it('presenta los estados reales de servicios, planes, cuotas y reconciliación', async () => {
    const completa = {
      ...cuenta,
      servicios: [
        {
          servicio_realizado_id: 5,
          consulta_clinica_id: null,
          servicio: 'Consulta ocular',
          fecha_realizacion: '2026-07-03',
          precio_aplicado: '125.75',
          monto_pagado_aplicado: '25.25',
          saldo_pendiente: '100.50',
          financiado: true,
          plan_pago_id: 77,
        },
        {
          servicio_realizado_id: 6,
          consulta_clinica_id: null,
          servicio: 'Control',
          fecha_realizacion: null,
          precio_aplicado: '20.00',
          monto_pagado_aplicado: '20.00',
          saldo_pendiente: '0.00',
          financiado: false,
          plan_pago_id: null,
        },
      ],
      planes_pago: (['ACTIVO', 'COMPLETADO', 'CANCELADO'] as const).map((estado, index) => ({
        id: 77 + index,
        monto_total: '100.50',
        moneda: 'BOB',
        estado,
        saldo_pendiente: '100.50',
        cuotas: (['PENDIENTE', 'VENCIDA', 'PAGADA', 'CANCELADA'] as const).map(
          (estadoCuota, i) => ({
            id: 90 + i,
            numero_cuota: i + 1,
            monto_programado: '25.125',
            fecha_vencimiento: '2026-07-03',
            estado: estadoCuota,
          }),
        ),
      })),
      pagos_pendientes_confirmacion: [
        {
          pago_id: 301,
          monto: '8.50',
          moneda: 'BOB',
          estado: 'PENDIENTE' as const,
          pasarela: null,
          aplicado_a_obligacion: false,
          requiere_reconciliacion: false,
        },
        {
          pago_id: 302,
          monto: '9.50',
          moneda: 'BOB',
          estado: 'APROBADO' as const,
          pasarela: 'QR',
          aplicado_a_obligacion: false,
          requiere_reconciliacion: true,
        },
      ],
    };
    await iniciar();
    cuentaApi.consultar.mockReturnValue(of(completa));
    view.seleccionar(paciente);
    fixture.detectChanges();
    let text = fixture.nativeElement.textContent as string;
    view.verPlan(77);
    fixture.detectChanges();
    text += fixture.nativeElement.textContent;
    view.seleccionarPestana('pendientes');
    fixture.detectChanges();
    text += fixture.nativeElement.textContent;
    for (const estado of [
      'Financiado',
      'No financiado',
      'ACTIVO',
      'COMPLETADO',
      'CANCELADO',
      'PENDIENTE',
      'VENCIDA',
      'PAGADA',
      'CANCELADA',
      'Pendiente de confirmación',
      'Aprobado · requiere reconciliación',
    ])
      expect(text).toContain(estado);
    expect(text).toContain('Bs 125,75');
    expect(text).toContain('no se descontó de la obligación');
    expect(text).toContain('requiere reconciliación antes de aplicarse');
  });

  it('muestra sólo la pestaña activa y conserva paciente y datos sin nuevas consultas al navegar', async () => {
    await iniciar();
    view.seleccionar(paciente);
    fixture.detectChanges();
    expect(view.pestana()).toBe('resumen');
    const tabs = fixture.nativeElement.querySelectorAll(
      '[role="tab"]',
    ) as NodeListOf<HTMLButtonElement>;
    expect(tabs.length).toBe(5);
    for (const [i, id] of ['resumen', 'servicios', 'planes', 'historial', 'pendientes'].entries()) {
      tabs[i].click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('[role="tabpanel"]').length).toBe(1);
      expect(fixture.nativeElement.querySelector('[role="tabpanel"]').id).toBe(`panel-${id}`);
      expect(tabs[i].getAttribute('aria-selected')).toBe('true');
      expect(fixture.nativeElement.textContent).toContain('Rosa Mamani');
      expect(fixture.nativeElement.querySelectorAll('.history-filters').length).toBe(
        id === 'historial' ? 1 : 0,
      );
      expect(fixture.nativeElement.querySelectorAll('app-composicion-saldo').length).toBe(
        id === 'resumen' ? 1 : 0,
      );
    }
    expect(cuentaApi.consultar).toHaveBeenCalledTimes(1);
    expect(pagosApi.listarPagos).toHaveBeenCalledTimes(1);
  });

  it('permite navegar las pestañas con flechas y Home/End', async () => {
    await iniciar();
    view.seleccionar(paciente);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll(
      '[role="tab"]',
    ) as NodeListOf<HTMLButtonElement>;
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(view.pestana()).toBe('servicios');
    expect(document.activeElement).toBe(tabs[1]);
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(view.pestana()).toBe('pendientes');
    tabs[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(view.pestana()).toBe('resumen');
  });

  it('limpia las selecciones y controles de detalle al cambiar paciente', async () => {
    await iniciar();
    view.seleccionar(paciente);
    view.alternarServicio(12);
    view.verPlan(77);
    view.cambiarPaciente();
    fixture.detectChanges();
    expect(view.servicioSeleccionado()).toBeNull();
    expect(view.planSeleccionadoId()).toBeNull();
    expect(view.pagoSeleccionado()).toBeNull();
    expect(view.pestana()).toBe('resumen');
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]')).toBeNull();
  });

  it('limita la vista previa a tres servicios recientes y Ver todos abre el listado completo', async () => {
    await iniciar();
    cuentaApi.consultar.mockReturnValue(of(cuentaConServicios));
    view.seleccionar(paciente);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll(
      '.services-preview tbody tr',
    ) as NodeListOf<HTMLElement>;
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Servicio reciente');
    expect(rows[2].textContent).toContain('Servicio antiguo');
    expect(fixture.nativeElement.querySelector('.services-preview').textContent).not.toContain(
      'Servicio sin fecha',
    );
    (fixture.nativeElement.querySelector('.services-preview button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(view.pestana()).toBe('servicios');
    expect(fixture.nativeElement.querySelectorAll('.services-table tbody tr').length).toBe(4);
  });

  it('filtra y ordena servicios localmente; expande sólo uno y abre su plan consultivo', async () => {
    await iniciar();
    cuentaApi.consultar.mockReturnValue(of(cuentaConServicios));
    view.seleccionar(paciente);
    view.seleccionarPestana('servicios');
    fixture.detectChanges();
    const filtrar = fixture.nativeElement.querySelector(
      '[aria-label="Filtrar servicios"]',
    ) as HTMLSelectElement;
    filtrar.value = 'financiados';
    filtrar.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.services-table tbody tr').length).toBe(1);
    (
      fixture.nativeElement.querySelector('.services-table .row-select') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(view.servicioSeleccionado()).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.service-detail').length).toBe(1);
    const plan = fixture.nativeElement.querySelector(
      '.service-detail dl button',
    ) as HTMLButtonElement;
    plan.click();
    fixture.detectChanges();
    expect(view.pestana()).toBe('planes');
    expect(fixture.nativeElement.textContent).toContain('Cuotas del Plan #77');
    expect(fixture.nativeElement.querySelectorAll('.plan-detail tbody tr').length).toBe(2);
    expect(fixture.nativeElement.querySelector('progress').value).toBe(1);
    expect(fixture.nativeElement.querySelector('progress').max).toBe(2);
    expect(cuentaApi.consultar).toHaveBeenCalledTimes(1);
    view.seleccionarPestana('servicios');
    fixture.detectChanges();
    filtrar.value = 'todos';
    const nuevoFiltro = fixture.nativeElement.querySelector(
      '[aria-label="Filtrar servicios"]',
    ) as HTMLSelectElement;
    nuevoFiltro.value = 'todos';
    nuevoFiltro.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const ordenar = fixture.nativeElement.querySelector(
      '[aria-label="Ordenar servicios"]',
    ) as HTMLSelectElement;
    ordenar.value = 'antigua';
    ordenar.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.services-table tbody tr').textContent).toContain(
      'Servicio antiguo',
    );
    view.alternarServicio(1);
    fixture.detectChanges();
    view.alternarServicio(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.service-detail').length).toBe(1);
    view.alternarServicio(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.service-detail').length).toBe(0);
  });

  it.each([
    ['no-financiados', 3],
    ['con-saldo', 2],
    ['sin-saldo', 2],
  ])('filtra %s sin peticiones HTTP', async (filtro, cantidad) => {
    await iniciar();
    cuentaApi.consultar.mockReturnValue(of(cuentaConServicios));
    view.seleccionar(paciente);
    view.seleccionarPestana('servicios');
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector(
      '[aria-label="Filtrar servicios"]',
    ) as HTMLSelectElement;
    select.value = filtro;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.services-table tbody tr').length).toBe(
      cantidad,
    );
    expect(cuentaApi.consultar).toHaveBeenCalledTimes(1);
    expect(pagosApi.listarPagos).toHaveBeenCalledTimes(1);
  });

  it('selecciona pagos en el panel lateral, permite descargar y nunca ofrece acciones operativas', async () => {
    await iniciar();
    const pago = {
      id: 1024,
      paciente_id: 19,
      consulta_clinica_id: 4,
      fecha_creacion: '2026-11-01T10:00:00Z',
      fecha_hora_pago: null,
      monto: '10.00',
      moneda: 'BOB',
      metodo_pago: 'TRANSFERENCIA',
      estado: 'APROBADO',
      referencia_bancaria: 'REF-PRUEBA',
      servicio_realizado_ids: [3],
      observaciones: null,
      notificacion: null,
    };
    pagosApi.listarPagos.mockReturnValue(
      of({
        items: [pago, { ...pago, id: 1025, monto: '25.00' }],
        total: 2,
        total_pages: 1,
        page: 1,
        page_size: 5,
      }),
    );
    view.seleccionar(paciente);
    view.seleccionarPestana('historial');
    fixture.detectChanges();
    const botones = fixture.nativeElement.querySelectorAll(
      '.history-list .row-select',
    ) as NodeListOf<HTMLButtonElement>;
    botones[1].click();
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.payment-panel') as HTMLElement;
    expect(panel.textContent).toContain('#PAG-01025');
    expect(panel.textContent).toContain('Bs 25,00');
    expect(panel.querySelector('.detalle--compacto')).not.toBeNull();
    const descarga = Array.from(panel.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Descargar comprobante'),
    );
    expect(descarga).toBeDefined();
    descarga!.click();
    fixture.detectChanges();
    expect(descargar).toHaveBeenCalledWith(1025);
    expect(pagosApi.confirmarPago).not.toHaveBeenCalled();
    expect(pagosApi.reintentarNotificacion).not.toHaveBeenCalled();
    expect(panel.textContent).not.toContain('Confirmar pago');
    expect(panel.textContent).not.toContain('Reintentar envío');
    expect(panel.textContent).toContain('La entrega final todavía no está confirmada');
  });

  it('muestra vista previa de pendientes y Ver todos abre su detalle sin descontarlos del saldo', async () => {
    await iniciar();
    cuentaApi.consultar.mockReturnValue(
      of({
        ...cuenta,
        pagos_pendientes_confirmacion: [
          {
            pago_id: 2,
            monto: '100.00',
            moneda: 'BOB',
            estado: 'PENDIENTE',
            pasarela: 'QR',
            aplicado_a_obligacion: false,
            requiere_reconciliacion: false,
          },
        ],
      }),
    );
    view.seleccionar(paciente);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('.pending-preview .text-button') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(view.pestana()).toBe('pendientes');
    expect(fixture.nativeElement.textContent).toContain('no se descontó de la obligación');
    expect(fixture.nativeElement.textContent).toContain('QR');
    expect((view.cuenta() as EstadoCuentaRespuesta).resumen.saldo_total_pendiente).toBe('0.00');
  });

  it('filtra localmente por nombres, apellidos y CI sin nuevas solicitudes por carácter', async () => {
    await iniciar(MODULO.funciones, 'CLINICA_A', 'listo', [
      paciente,
      { ...paciente, id: 20, nombres: 'Lucía', apellidos: 'Vega', ci: '1234567', telefono: null },
    ]);
    // El listado está cargado una vez al resolver los permisos.
    view.buscar('mamani');
    expect(view.sugerencias().map((p) => p.id)).toEqual([19]);
    view.buscar('1234567');
    expect(view.sugerencias().map((p) => p.id)).toEqual([20]);
    view.buscar('no-match');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se encontraron pacientes coincidentes');
    expect(pacienteApi.listarPacientes).toHaveBeenCalledTimes(1);
    expect(cuentaApi.consultar).not.toHaveBeenCalled();
  });

  it('deniega sesión sin tenant aunque el menú tenga lectura', async () => {
    await iniciar(MODULO.funciones, null);
    expect(view.permiso()).toBe('denegado');
    expect(pacienteApi.listarPacientes).not.toHaveBeenCalled();
  });

  it('obliga paciente_id en filtros, aplica los filtros y reinicia al limpiar', async () => {
    await iniciar();
    view.seleccionar(paciente);
    const input = (value: string) => ({ target: { value } }) as unknown as Event;
    view.actualizarFiltro(input('2026-06-01'), 'desde');
    view.actualizarFiltro(input('2026-06-30'), 'hasta');
    view.actualizarFiltro(input('QR'), 'metodo');
    view.actualizarFiltro(input('APROBADO'), 'estado');
    view.aplicarFiltrosHistorial();
    expect(pagosApi.listarPagos).toHaveBeenLastCalledWith(
      expect.objectContaining({
        paciente_id: 19,
        desde: expect.any(String),
        hasta: expect.any(String),
        metodo_pago: 'QR',
        estado: 'APROBADO',
        page: 1,
      }),
    );
    view.limpiarFiltrosHistorial();
    expect(pagosApi.listarPagos).toHaveBeenLastCalledWith(
      expect.objectContaining({
        paciente_id: 19,
        desde: null,
        hasta: null,
        metodo_pago: null,
        estado: null,
        page: 1,
      }),
    );
  });

  it('solicita las páginas siguientes al backend conservando el paciente seleccionado', async () => {
    await iniciar();
    pagosApi.listarPagos.mockReturnValue(
      of({ items: [], total: 22, total_pages: 5, page: 1, page_size: 5 }),
    );
    view.seleccionar(paciente);
    expect(pagosApi.listarPagos).toHaveBeenLastCalledWith(
      expect.objectContaining({ paciente_id: 19, page: 1, page_size: 5 }),
    );
    view.cambiarPagina(1);
    expect(pagosApi.listarPagos).toHaveBeenLastCalledWith(
      expect.objectContaining({ paciente_id: 19, page: 2, page_size: 5 }),
    );
  });

  it('rechaza intervalo invertido sin petición, y error 409 no se convierte en saldo cero', async () => {
    await iniciar();
    view.seleccionar(paciente);
    const iniciales = pagosApi.listarPagos.mock.calls.length;
    const input = (value: string) => ({ target: { value } }) as unknown as Event;
    view.actualizarFiltro(input('2026-07-31'), 'desde');
    view.actualizarFiltro(input('2026-07-01'), 'hasta');
    view.aplicarFiltrosHistorial();
    expect(pagosApi.listarPagos).toHaveBeenCalledTimes(iniciales);
    cuentaApi.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    view.cargarCuenta();
    expect(view.cuenta()).toBeNull();
    expect(view.error()).toContain('inconsistencia financiera');
  });

  it.each([0, 401, 403, 404, 409, 422, 500])(
    'maneja HTTP %s sin inventar saldos',
    async (status) => {
      await iniciar();
      view.seleccionar(paciente);
      cuentaApi.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      view.cargarCuenta();
      expect(view.cuenta()).toBeNull();
      expect(view.error()).toBeTruthy();
      if (status === 401) expect(view.permiso()).toBe('error');
      if (status === 403) expect(view.permiso()).toBe('denegado');
    },
  );

  it('descarta la respuesta financiera tardía cuando se cambia de paciente', async () => {
    await iniciar();
    const late = new Subject<typeof cuenta>();
    cuentaApi.consultar.mockReturnValue(late);
    view.seleccionar(paciente);
    view.cambiarPaciente();
    late.next(cuenta);
    late.complete();
    expect(view.cuenta()).toBeNull();
    expect(view.pagos()).toEqual([]);
  });

  it('limpia los datos financieros y los pacientes al perder lectura', async () => {
    await iniciar();
    view.seleccionar(paciente);
    menu.modulos.set([{ ...MODULO, funciones: [] }]);
    revision.update((v) => v + 1);
    fixture.detectChanges();
    expect(view.permiso()).toBe('denegado');
    expect(view.cuenta()).toBeNull();
    expect(view.pacientes()).toEqual([]);
  });

  it('invalida la sesión y limpia datos si cambia el tenant con el mismo paciente seleccionado', async () => {
    await iniciar();
    view.seleccionar(paciente);
    tenantActivo.set('CLINICA_B');
    menu.estado.set('cargando');
    revision.update((v) => v + 1);
    fixture.detectChanges();
    expect(view.cuenta()).toBeNull();
    expect(view.pagos()).toEqual([]);
    expect(view.pacientes()).toEqual([]);
    expect(cuentaApi.consultar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('cu34_estado_cuenta')).toBeNull();
  });

  it('limpia servicio, plan y pago al cambiar de tenant aun con permisos ya resueltos', async () => {
    await iniciar();
    cuentaApi.consultar.mockReturnValue(of(cuentaConServicios));
    view.seleccionar(paciente);
    view.alternarServicio(2);
    view.verPlan(77);
    tenantActivo.set('CLINICA_B');
    revision.update((v) => v + 1);
    fixture.detectChanges();
    expect(view.cuenta()).toBeNull();
    expect(view.servicioSeleccionado()).toBeNull();
    expect(view.planSeleccionadoId()).toBeNull();
    expect(view.pagoSeleccionado()).toBeNull();
    expect(view.pestana()).toBe('resumen');
  });

  it('rechaza respuestas pendientes de cuenta e historial al cerrar sesión antes del siguiente render', async () => {
    await iniciar();
    const respuestaCuenta = new Subject<typeof cuenta>();
    const respuestaHistorial = new Subject<unknown>();
    cuentaApi.consultar.mockReturnValue(respuestaCuenta);
    pagosApi.listarPagos.mockReturnValue(respuestaHistorial);
    view.seleccionar(paciente);
    tenantActivo.set(null);
    revision.update((v) => v + 1);
    respuestaCuenta.next(cuenta);
    respuestaHistorial.next({ items: [{ id: 1 }], total: 1, total_pages: 1, page: 1 });
    expect(view.cuenta()).toBeNull();
    expect(view.pagos()).toEqual([]);
    fixture.detectChanges();
    expect(view.pacientes()).toEqual([]);
    expect(view.planSeleccionadoId()).toBeNull();
    expect(view.servicioSeleccionado()).toBeNull();
  });

  it('cambia el tamaño de página en backend sin modificar los indicadores del paciente', async () => {
    await iniciar();
    view.seleccionar(paciente);
    view.seleccionarPestana('historial');
    fixture.detectChanges();
    const resumenAntes = (view.cuenta() as EstadoCuentaRespuesta).resumen;
    const select = fixture.nativeElement.querySelector(
      '[aria-label="Pagos por página"]',
    ) as HTMLSelectElement;
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(pagosApi.listarPagos).toHaveBeenLastCalledWith(
      expect.objectContaining({ paciente_id: 19, page: 1, page_size: 20 }),
    );
    expect((view.cuenta() as EstadoCuentaRespuesta).resumen).toBe(resumenAntes);
    expect(cuentaApi.consultar).toHaveBeenCalledTimes(1);
  });
});
