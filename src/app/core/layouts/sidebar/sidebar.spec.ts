import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import {
  AuthService,
  EmpresaSesion,
  EstadoEmpresaSesion,
} from '../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { EstadoMenu, MenuService } from '../../services/menu.service';
import { Sidebar } from './sidebar';

@Component({ template: '' })
class PaginaVacia {}

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

  it('shows the company from the shared session context and logs out before switching', async () => {
    localStorage.setItem('access_token', 'tenant-A');
    localStorage.setItem('saas_access_token', 'saas');
    const menu = menuStub();
    const empresa = signal<EmpresaSesion | null>(null);
    const estadoEmpresa = signal<EstadoEmpresaSesion>('verificando');
    const inicializar = vi.fn();
    const logout = vi.fn(() => localStorage.removeItem('access_token'));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: menu.provider },
        {
          provide: AuthService,
          useValue: {
            obtenerPerfilActual: () => null,
            empresa: empresa.asReadonly(),
            estadoEmpresa: estadoEmpresa.asReadonly(),
            inicializarContextoEmpresa: inicializar,
            reintentarContextoEmpresa: vi.fn(),
            logout,
          },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    // Mientras el contexto se resuelve no se declara "no verificada".
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain(
      'Verificando empresa',
    );
    expect(inicializar).toHaveBeenCalledOnce();

    empresa.set({ codigo: 'A', nombre: 'Empresa A', tenantId: 3 });
    estadoEmpresa.set('listo');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain(
      'Empresa A',
    );
    expect(fixture.nativeElement.querySelector('.sidebar__mobile-company').textContent).toContain(
      'Empresa A',
    );
    // La marca del sidebar también usa la empresa real: nunca otra clínica.
    expect(fixture.nativeElement.querySelector('.sidebar__brand').textContent).toContain(
      'Empresa A',
    );
    expect(fixture.nativeElement.querySelector('.sidebar__brand').textContent).not.toContain(
      'Visión Clara',
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
            empresa: signal<EmpresaSesion | null>(null).asReadonly(),
            estadoEmpresa: signal<EstadoEmpresaSesion>('sin-tenant').asReadonly(),
            inicializarContextoEmpresa: vi.fn(),
            reintentarContextoEmpresa: vi.fn(),
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

  it('muestra la empresa resuelta aunque el menú siga cargando', async () => {
    const menu = menuStub();
    const empresa = signal<EmpresaSesion | null>({
      codigo: 'MEDICO-OCULAR',
      nombre: 'Centro Médico Ocular',
      tenantId: 9,
    });
    const estadoEmpresa = signal<EstadoEmpresaSesion>('listo');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MenuService, useValue: menu.provider },
        {
          provide: AuthService,
          useValue: {
            obtenerPerfilActual: () => null,
            empresa: empresa.asReadonly(),
            estadoEmpresa: estadoEmpresa.asReadonly(),
            inicializarContextoEmpresa: vi.fn(),
            reintentarContextoEmpresa: vi.fn(),
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
      'Centro Médico Ocular',
    );
    expect(menu.state()).toBe('inicial');
  });

  it('resalta la función de pagos al navegar a una subruta del módulo', async () => {
    const modulos = signal([
      {
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
      },
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'pagos',
            children: [
              { path: '', component: PaginaVacia },
              { path: 'historial', component: PaginaVacia },
              { path: 'confirmaciones', component: PaginaVacia },
            ],
          },
        ]),
        {
          provide: MenuService,
          useValue: {
            modulos: modulos.asReadonly(),
            estado: signal('listo').asReadonly(),
            cargando: computed(() => false),
            error: computed(() => false),
            cargar: vi.fn(),
            reintentar: vi.fn(),
            limpiar: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            obtenerPerfilActual: () => null,
            empresa: signal(null).asReadonly(),
            estadoEmpresa: signal('sin-tenant').asReadonly(),
            inicializarContextoEmpresa: vi.fn(),
            reintentarContextoEmpresa: vi.fn(),
            logout: vi.fn(),
          },
        },
      ],
    });

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const vista = fixture.componentInstance as unknown as {
      selectedModuleId(): number | null;
      selectedFuncionId(): number | null;
    };

    await router.navigateByUrl('/pagos/historial');
    expect(vista.selectedModuleId()).toBe(8);
    expect(vista.selectedFuncionId()).toBe(31);

    await router.navigateByUrl('/pagos/confirmaciones');
    expect(vista.selectedFuncionId()).toBe(32);
  });
});

/**
 * Regresión CU: cada página monta su propio `app-sidebar`, pero la identidad de
 * la empresa se resuelve una sola vez por sesión en `AuthService`; una
 * navegación no debe repetir `GET /seguridad/tenant/empresas` ni perder el
 * nombre de la empresa.
 */
describe('Sidebar — catálogo de empresas una sola vez por sesión', () => {
  const empresasUrl = `${environment.apiUrl}/seguridad/tenant/empresas`;
  const menuUrl = `${environment.apiUrl}/seguridad/menu`;

  /** JWT de prueba: solo importa el payload (la firma la valida el backend). */
  function tokenTenant(codigo: string, tenantId: number): string {
    const segmento = (valor: unknown): string =>
      btoa(JSON.stringify(valor)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payload = {
      token_type: 'tenant',
      empresa_codigo: codigo,
      tenant_id: tenantId,
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 7,
      rol_id: 1,
    };
    return `${segmento({ alg: 'HS256', typ: 'JWT' })}.${segmento(payload)}.firma`;
  }

  function nombreEmpresa(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.querySelector('.sidebar__company')?.textContent ?? '';
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('mantiene la empresa al navegar entre módulos sin repetir el catálogo', () => {
    localStorage.setItem('access_token', tokenTenant('MEDICO-OCULAR', 9));
    const http = TestBed.inject(HttpTestingController);

    const primerModulo = TestBed.createComponent(Sidebar);
    primerModulo.detectChanges();
    http.expectOne(empresasUrl).flush([
      { codigo: 'VISION-CLARA', nombre: 'Centro Oftalmológico Visión Clara' },
      { codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' },
    ]);
    http.expectOne(menuUrl).flush([]);
    primerModulo.detectChanges();
    expect(nombreEmpresa(primerModulo)).toContain('Centro Médico Ocular');
    expect(nombreEmpresa(primerModulo)).not.toContain('Visión Clara');
    primerModulo.destroy();

    // Cambio de módulo: otra página, otra instancia del sidebar.
    const segundoModulo = TestBed.createComponent(Sidebar);
    segundoModulo.detectChanges();
    http.expectNone(empresasUrl);
    http.expectNone(menuUrl);
    expect(nombreEmpresa(segundoModulo)).toContain('Centro Médico Ocular');
    segundoModulo.destroy();
  });

  it('restaura la empresa tras F5 sin volver a consultar el catálogo', () => {
    localStorage.setItem('access_token', tokenTenant('MEDICO-OCULAR', 9));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular', tenantId: 9 }),
    );
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    http.expectNone(empresasUrl);
    fixture.detectChanges();
    expect(nombreEmpresa(fixture)).toContain('Centro Médico Ocular');
  });

  it('descarta la empresa guardada que no corresponde al JWT vigente', () => {
    localStorage.setItem('access_token', tokenTenant('MEDICO-OCULAR', 9));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'VISION-CLARA', nombre: 'Visión Clara', tenantId: 5 }),
    );
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    http
      .expectOne(empresasUrl)
      .flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);
    fixture.detectChanges();
    expect(nombreEmpresa(fixture)).toContain('Centro Médico Ocular');
    expect(nombreEmpresa(fixture)).not.toContain('Visión Clara');
  });

  it('no deja identidad de la empresa anterior al cerrar sesión', () => {
    localStorage.setItem('access_token', tokenTenant('MEDICO-OCULAR', 9));
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    http.expectOne(empresasUrl).flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);
    fixture.detectChanges();
    expect(sessionStorage.getItem('sesion_empresa')).toContain('MEDICO-OCULAR');

    (fixture.nativeElement.querySelector('.sidebar__switch') as HTMLButtonElement).click();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('sesion_empresa')).toBeNull();
    fixture.detectChanges();
    expect(nombreEmpresa(fixture)).not.toContain('Centro Médico Ocular');
  });
});
