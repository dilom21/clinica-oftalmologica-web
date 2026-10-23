import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { PermisosPagos } from '../../models/pagos-administrativos.models';
import { GestionPagos, MotivoSinAcceso, VistaPagos } from './gestion-pagos';

interface VistaPagina {
  vista(): VistaPagos;
  estadoPermiso(): string;
  motivoSinAcceso(): MotivoSinAcceso | null;
  tituloSinAcceso(): string;
  detalleSinAcceso(): string;
  permisos(): PermisosPagos;
  puedeVerVista(vista: VistaPagos): boolean;
  seleccionarVista(vista: VistaPagos): void;
  pacientes(): unknown[];
}

const MODULO_PAGOS: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 31, nombre: 'Gestionar pagos', accion_id: 3, accion_nombre: 'AMBAS' },
    {
      id: 32,
      nombre: 'Confirmar pagos bancarios',
      accion_id: 2,
      accion_nombre: 'ESCRITURA',
    },
  ],
};

describe('CU31 — página de gestión de pagos', () => {
  let fixture: ComponentFixture<GestionPagos>;
  let vista: VistaPagina;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let listarPacientes: ReturnType<typeof vi.fn>;

  async function configurar(
    modulos: MenuModulo[] = [MODULO_PAGOS],
    estadoMenu: 'listo' | 'error' = 'listo',
    vistaInicial: VistaPagos = 'registro',
    empresaCodigo: string | null = 'clinica_demo',
  ): Promise<void> {
    const estado = signal(estadoMenu);
    const menu = signal(modulos);
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    listarPacientes = vi.fn(() => of([]));

    TestBed.configureTestingModule({
      imports: [GestionPagos],
      providers: [
        {
          provide: MenuService,
          useValue: {
            estado: estado.asReadonly(),
            modulos: menu.asReadonly(),
            cargar: vi.fn(),
            reintentar: vi.fn(),
          },
        },
        { provide: PacientesService, useValue: { listarPacientes } },
        { provide: AuthService, useValue: { tenantCode: () => empresaCodigo } },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { vista: vistaInicial } } },
        },
      ],
    });
    TestBed.overrideComponent(GestionPagos, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(GestionPagos);
    vista = fixture.componentInstance as unknown as VistaPagina;
    fixture.detectChanges();
  }

  it('deniega el acceso y no consulta pacientes sin funciones de pago', async () => {
    await configurar([]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-modulo');
    expect(vista.permisos()).toEqual({ ver: false, registrar: false, confirmar: false });
    expect(listarPacientes).not.toHaveBeenCalled();
  });

  it('explica que el módulo Pagos falta en el menú de la empresa', async () => {
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
    expect(vista.detalleSinAcceso()).not.toContain('tenant');
  });

  it('distingue el módulo Pagos sin funciones del módulo ausente', async () => {
    await configurar([{ id: 8, nombre: 'Pagos', funciones: [] }]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-funciones');
    expect(vista.detalleSinAcceso()).toContain('sin funciones asociadas');
  });

  it('avisa del contexto tenant ausente en lugar de dejar la vista vacía', async () => {
    await configurar([], 'listo', 'registro', null);

    expect(vista.motivoSinAcceso()).toBe('sin-modulo');
    expect(vista.detalleSinAcceso()).toContain('empresa (tenant)');
    expect(listarPacientes).not.toHaveBeenCalled();
  });

  it('distingue funciones presentes sin acciones de lectura ni escritura', async () => {
    await configurar([
      {
        id: 8,
        nombre: 'Pagos',
        funciones: [{ id: 33, nombre: 'Gestionar pagos', accion_id: 9, accion_nombre: 'NINGUNA' }],
      },
    ]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-acciones');
    expect(vista.detalleSinAcceso()).toContain('roles de tu usuario');
  });

  it('no rompe el render si el menú llega con un formato inesperado', async () => {
    await configurar(null as unknown as MenuModulo[]);

    expect(vista.estadoPermiso()).toBe('error');
    expect(vista.motivoSinAcceso()).toBe('menu-invalido');
    expect(vista.tituloSinAcceso()).toContain('formato no válido');
    expect(listarPacientes).not.toHaveBeenCalled();
  });

  it('autoriza la lectura con Gestionar pagos y carga pacientes una sola vez', async () => {
    await configurar();
    fixture.detectChanges();

    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(vista.permisos()).toEqual({ ver: true, registrar: true, confirmar: true });
    expect(listarPacientes).toHaveBeenCalledTimes(1);
  });

  it('muestra el error del menú sin ejecutar consultas administrativas', async () => {
    await configurar([], 'error');

    expect(vista.estadoPermiso()).toBe('error');
    expect(listarPacientes).not.toHaveBeenCalled();
  });

  it('navega entre las vistas internas autorizadas', async () => {
    await configurar();

    vista.seleccionarVista('historial');
    expect(router.navigate).toHaveBeenCalledWith(['/pagos/historial']);

    vista.seleccionarVista('confirmaciones');
    expect(router.navigate).toHaveBeenCalledWith(['/pagos/confirmaciones']);
  });

  it('lleva a confirmaciones a un usuario que sólo puede confirmar', async () => {
    await configurar(
      [
        {
          id: 8,
          nombre: 'Pagos',
          funciones: [
            {
              id: 32,
              nombre: 'Confirmar pagos bancarios',
              accion_id: 2,
              accion_nombre: 'ESCRITURA',
            },
          ],
        },
      ],
      'listo',
      'registro',
    );

    expect(vista.permisos()).toEqual({ ver: false, registrar: false, confirmar: true });
    expect(vista.puedeVerVista('registro')).toBe(false);
    expect(vista.puedeVerVista('confirmaciones')).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/pagos/confirmaciones']);
  });
});
