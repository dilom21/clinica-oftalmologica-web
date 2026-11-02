import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  PermisosPlanesCuotas,
  PlanPagoListadoItem,
  PlanPagoRespuesta,
  PlanesPagoPagina,
} from '../../models/planes-cuotas.models';
import { PlanesPagoService } from '../../services/planes-pago.service';
import { MotivoSinAccesoPlanes, PlanesPago } from './planes-pago';

interface VistaPagina {
  estadoPermiso(): string;
  motivoSinAcceso(): MotivoSinAccesoPlanes | null;
  tituloSinAcceso(): string;
  detalleSinAcceso(): string;
  permisos(): PermisosPlanesCuotas;
  planes(): PlanPagoListadoItem[];
  planSeleccionado(): PlanPagoRespuesta | null;
  pagina(): PlanesPagoPagina | null;
  error(): string | null;
  irANuevoPlan(): void;
  abrirPlan(planId: number): void;
  reintentarMenu(): void;
}

const MODULO_PAGOS: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 1, accion_nombre: 'LECTURA' },
    { id: 41, nombre: 'Gestionar cuotas', accion_id: 1, accion_nombre: 'LECTURA' },
  ],
};

const PLAN_LISTADO: PlanPagoListadoItem = {
  id: 9,
  paciente_id: 7,
  consulta_clinica_id: 142,
  monto_total: '300.00',
  monto_pagado: '100.00',
  saldo_pendiente: '200.00',
  moneda: 'BOB',
  cantidad_cuotas: 3,
  cuotas_pagadas: 1,
  fecha_creacion: '2026-10-01T12:00:00.000Z',
  estado: 'ACTIVO',
  tiene_cuotas_vencidas: false,
};

const PLAN_DETALLE: PlanPagoRespuesta = {
  ...PLAN_LISTADO,
  observaciones: null,
  creado_por: 4,
  servicios: [],
  cuotas: [
    {
      id: 31,
      numero_cuota: 1,
      monto_programado: '100.00',
      fecha_vencimiento: '2026-11-15',
      estado: 'PENDIENTE',
      pagos: [],
    },
  ],
};

describe('CU32 — listado de planes de pago', () => {
  let fixture: ComponentFixture<PlanesPago>;
  let vista: VistaPagina;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let listarPlanes: ReturnType<typeof vi.fn>;
  let obtenerPlan: ReturnType<typeof vi.fn>;
  let listarPacientes: ReturnType<typeof vi.fn>;
  let reintentarMenu: ReturnType<typeof vi.fn>;

  async function configurar(
    modulos: MenuModulo[] = [MODULO_PAGOS],
    estadoMenu: 'listo' | 'error' = 'listo',
    respuestaListado: PlanesPagoPagina | 'error' = {
      items: [PLAN_LISTADO],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    },
  ): Promise<void> {
    const estado = signal(estadoMenu);
    const menu = signal(modulos);
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    listarPlanes = vi.fn(() =>
      respuestaListado === 'error'
        ? throwError(
            () => new HttpErrorResponse({ status: 500, statusText: 'Server Error' }),
          )
        : of(respuestaListado),
    );
    obtenerPlan = vi.fn(() => of(PLAN_DETALLE));
    listarPacientes = vi.fn(() => of([]));
    reintentarMenu = vi.fn();

    TestBed.configureTestingModule({
      imports: [PlanesPago],
      providers: [
        {
          provide: MenuService,
          useValue: {
            estado: estado.asReadonly(),
            modulos: menu.asReadonly(),
            cargar: vi.fn(),
            reintentar: reintentarMenu,
          },
        },
        { provide: PacientesService, useValue: { listarPacientes } },
        { provide: PlanesPagoService, useValue: { listarPlanes, obtenerPlan } },
        { provide: AuthService, useValue: { tenantCode: () => 'clinica_demo' } },
        { provide: Router, useValue: router },
      ],
    });
    TestBed.overrideComponent(PlanesPago, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(PlanesPago);
    vista = fixture.componentInstance as unknown as VistaPagina;
    fixture.detectChanges();
  }

  it('deniega el acceso sin funciones de pago y no consulta planes', async () => {
    await configurar([]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-modulo');
    expect(vista.permisos()).toEqual({
      verPlanes: false,
      escribirPlanes: false,
      verCuotas: false,
      escribirCuotas: false,
    });
    expect(listarPlanes).not.toHaveBeenCalled();
    expect(listarPacientes).not.toHaveBeenCalled();
  });

  it('explica que el módulo Pagos no está sincronizado en la empresa', async () => {
    await configurar([
      {
        id: 1,
        nombre: 'Autenticación y Seguridad',
        funciones: [
          { id: 10, nombre: 'Gestionar usuarios', accion_id: 1, accion_nombre: 'LECTURA' },
        ],
      },
    ]);

    expect(vista.tituloSinAcceso()).toContain('«Pagos»');
    expect(vista.detalleSinAcceso()).toContain('aún no están sincronizadas');
  });

  it('distingue el módulo Pagos sin funciones del módulo ausente', async () => {
    await configurar([{ id: 8, nombre: 'Pagos', funciones: [] }]);

    expect(vista.motivoSinAcceso()).toBe('sin-funciones');
    expect(vista.detalleSinAcceso()).toContain('sin funciones asociadas');
  });

  it('bloquea a quien solo puede gestionar cuotas sin lectura de planes', async () => {
    await configurar([
      {
        id: 8,
        nombre: 'Pagos',
        funciones: [
          { id: 41, nombre: 'Gestionar cuotas', accion_id: 3, accion_nombre: 'AMBAS' },
        ],
      },
    ]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-acciones');
    expect(vista.tituloSinAcceso()).toContain('no tiene acceso a los planes');
    expect(listarPlanes).not.toHaveBeenCalled();
  });

  it('carga el listado y la vista rápida del primer plan con permiso de lectura', async () => {
    await configurar();

    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(vista.permisos()).toEqual({
      verPlanes: true,
      escribirPlanes: false,
      verCuotas: true,
      escribirCuotas: false,
    });
    expect(listarPacientes).toHaveBeenCalledTimes(1);
    expect(listarPlanes).toHaveBeenCalledWith({
      paciente_id: null,
      estado: null,
      page: 1,
      page_size: 10,
    });
    expect(vista.planes()).toEqual([PLAN_LISTADO]);
    expect(vista.pagina()?.total).toBe(1);
    expect(obtenerPlan).toHaveBeenCalledWith(9);
    expect(vista.planSeleccionado()?.id).toBe(9);
  });

  it('no permite crear planes con permiso de solo lectura', async () => {
    await configurar();

    vista.irANuevoPlan();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navega al formulario y al detalle según el permiso y el plan elegido', async () => {
    await configurar([
      {
        id: 8,
        nombre: 'Pagos',
        funciones: [
          { id: 40, nombre: 'Gestionar planes de pago', accion_id: 3, accion_nombre: 'AMBAS' },
        ],
      },
    ]);

    vista.irANuevoPlan();
    expect(router.navigate).toHaveBeenCalledWith(['/pagos/planes/nuevo']);

    vista.abrirPlan(9);
    expect(router.navigate).toHaveBeenCalledWith(['/pagos/planes', 9]);
  });

  it('muestra el error del listado y deja las tablas vacías', async () => {
    await configurar([MODULO_PAGOS], 'listo', 'error');

    expect(vista.planes()).toEqual([]);
    expect(vista.pagina()).toBeNull();
    expect(vista.error()).toContain('No se pudo cargar los planes de pago');
  });

  it('bloquea con aviso de servicio cuando el menú falla y permite reintentar', async () => {
    await configurar([MODULO_PAGOS], 'error');

    expect(vista.estadoPermiso()).toBe('error');
    expect(vista.motivoSinAcceso()).toBe('menu-error');
    expect(listarPlanes).not.toHaveBeenCalled();

    vista.reintentarMenu();
    expect(reintentarMenu).toHaveBeenCalledTimes(1);
  });
});

