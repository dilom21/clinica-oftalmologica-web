import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { EstadoMenu, MenuService } from '../../services/menu.service';
import { Sidebar } from './sidebar';

function menuStub(initialState: EstadoMenu = 'inicial') {
  const modules = signal<never[]>([]);
  const state = signal<EstadoMenu>(initialState);
  return {
    modules,
    state,
    provider: {
      modulos: modules.asReadonly(),
      estado: state.asReadonly(),
      cargando: computed(() => state() === 'inicial' || state() === 'cargando'),
      error: computed(() => state() === 'error'),
      cargar: vi.fn(),
      reintentar: vi.fn(),
      limpiar: vi.fn(),
    },
  };
}

describe('Sidebar — function route mapping', () => {
  let sidebar: Sidebar;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    sidebar = TestBed.runInInjectionContext(() => new Sidebar());
  });

  it('maps "Registrar consulta clínica" to /registrar-consulta-clinica', () => {
    expect(sidebar.rutaDeFuncion('Registrar consulta clínica')).toBe(
      '/registrar-consulta-clinica',
    );
  });

  it('maps accented and unaccented diagnosis names', () => {
    expect(sidebar.rutaDeFuncion('Registrar diagnóstico')).toBe('/registrar-diagnostico');
    expect(sidebar.rutaDeFuncion('REGISTRAR DIAGNOSTICO')).toBe('/registrar-diagnostico');
  });

  it('keeps existing route mappings', () => {
    expect(sidebar.rutaDeFuncion('Gestionar pacientes')).toBe('/pacientes');
    expect(sidebar.rutaDeFuncion('Consultar historial clínico')).toBe('/historial-clinico');
    expect(sidebar.rutaDeFuncion('Gestionar citas médicas')).toBe('/gestionar-citas');
    expect(sidebar.rutaDeFuncion('Consultar bitácora')).toBe('/bitacora');
    expect(sidebar.rutaDeFuncion('Consultar agenda y disponibilidad médica')).toBe(
      '/agenda-disponibilidad',
    );
    expect(sidebar.rutaDeFuncion('Generar reportes')).toBe('/reportes');
  });

  it('returns null for an unknown function', () => {
    expect(sidebar.rutaDeFuncion('Función inexistente')).toBeNull();
  });

  it('maps CU17 functions to /tratamientos-recetas', () => {
    expect(sidebar.rutaDeFuncion('Tratamientos, indicaciones y recetas')).toBe(
      '/tratamientos-recetas',
    );
    expect(sidebar.rutaDeFuncion('Tratamientos y recetas')).toBe('/tratamientos-recetas');
    expect(sidebar.rutaDeFuncion('Registrar receta')).toBe('/tratamientos-recetas');
    expect(sidebar.rutaDeFuncion('REGISTRAR INDICACIONES')).toBe('/tratamientos-recetas');
    expect(sidebar.rutaDeFuncion('registrar tratamiento')).toBe('/tratamientos-recetas');
  });

  it('maps CU21 and CU22 exclusively through the shared navigation service', () => {
    expect(sidebar.rutaDeFuncion('Gestionar servicios oftalmológicos')).toBe(
      '/gestion-servicios',
    );
    expect(sidebar.rutaDeFuncion('GESTIONAR SERVICIOS OFTALMOLOGICOS')).toBe(
      '/gestion-servicios',
    );
    expect(sidebar.rutaDeFuncion('Registrar servicios realizados')).toBe(
      '/registrar-servicios-realizados',
    );
  });
});

describe('Sidebar company context', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows a matching company only after menu validation and logs out before switching', async () => {
    localStorage.setItem('access_token', 'tenant-A');
    localStorage.setItem('saas_access_token', 'saas');
    const menu = menuStub();
    const companies = new Subject<{ codigo: string; nombre: string }[]>();
    const logout = vi.fn(() => localStorage.removeItem('access_token'));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: menu.provider },
        {
          provide: AuthService,
          useValue: {
            obtenerPerfilActual: () => null,
            tenantCode: () => 'A',
            hasFreshTenantToken: () => false,
            companies: () => companies,
            logout,
          },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    companies.next([
      { codigo: 'B', nombre: 'Empresa B' },
      { codigo: 'A', nombre: 'Empresa A' },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Empresa A');

    menu.state.set('listo');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain(
      'Empresa A',
    );
    expect(fixture.nativeElement.querySelector('.sidebar__mobile-company').textContent).toContain(
      'Empresa A',
    );

    (fixture.nativeElement.querySelector('.sidebar__switch') as HTMLButtonElement).click();
    expect(logout).toHaveBeenCalledOnce();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('saas_access_token')).toBe('saas');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not label a legacy JWT as a tenant company', async () => {
    const menu = menuStub('listo');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: menu.provider },
        {
          provide: AuthService,
          useValue: {
            obtenerPerfilActual: () => null,
            tenantCode: () => null,
            logout: vi.fn(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain(
      'Acceso anterior',
    );
  });

  it('shows a freshly issued tenant identity before the legacy menu resolves', async () => {
    localStorage.setItem('access_token', 'tenant-A');
    const menu = menuStub();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: menu.provider },
        {
          provide: AuthService,
          useValue: {
            obtenerPerfilActual: () => null,
            tenantCode: () => 'A',
            hasFreshTenantToken: (token: string) => token === 'tenant-A',
            companies: () => of([{ codigo: 'A', nombre: 'Empresa A' }]),
            logout: vi.fn(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain(
      'Empresa A',
    );
  });
});
