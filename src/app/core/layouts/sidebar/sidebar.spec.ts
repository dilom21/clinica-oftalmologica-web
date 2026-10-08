import { TestBed } from '@angular/core/testing';
import { MenuService } from '../../services/menu.service';
import { Sidebar } from './sidebar';
import { AuthService } from '../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { provideRouter, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

describe('Sidebar — mapeo de funciones a rutas', () => {
  let sidebar: Sidebar;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { tenantCode: () => null, logout: () => {} } }] });
    sidebar = TestBed.runInInjectionContext(
      () => new Sidebar({} as unknown as MenuService, TestBed.inject(AuthService), TestBed.inject(Router)),
    );
  });

  it('mapea "Registrar consulta clínica" a /registrar-consulta-clinica', () => {
    expect(sidebar.rutaDeFuncion('Registrar consulta clínica')).toBe(
      '/registrar-consulta-clinica',
    );
  });

  it('mapea "Registrar diagnóstico" a /registrar-diagnostico', () => {
    expect(sidebar.rutaDeFuncion('Registrar diagnóstico')).toBe(
      '/registrar-diagnostico',
    );
    // Tolerancia a variantes sin acento / con mayúsculas.
    expect(sidebar.rutaDeFuncion('REGISTRAR DIAGNOSTICO')).toBe(
      '/registrar-diagnostico',
    );
  });

  it('mantiene los mapeos existentes (sin regresión)', () => {
    expect(sidebar.rutaDeFuncion('Gestionar pacientes')).toBe('/pacientes');
    expect(sidebar.rutaDeFuncion('Consultar historial clínico')).toBe(
      '/historial-clinico',
    );
    expect(sidebar.rutaDeFuncion('Gestionar citas médicas')).toBe(
      '/gestionar-citas',
    );
    expect(sidebar.rutaDeFuncion('Consultar bitácora')).toBe('/bitacora');
    expect(sidebar.rutaDeFuncion('Consultar agenda y disponibilidad médica')).toBe(
      '/agenda-disponibilidad',
    );
  });

  it('devuelve null para funciones sin ruta conocida', () => {
    expect(sidebar.rutaDeFuncion('Función inexistente')).toBeNull();
  });
});

describe('Sidebar company context', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows a company name only after the authenticated menu and matching public list resolve; switch clears tenant only', async () => {
    localStorage.setItem('access_token', 'tenant-A'); localStorage.setItem('saas_access_token', 'saas');
    const menu = new Subject<never[]>(); const companies = new Subject<{ codigo: string; nombre: string }[]>();
    const logout = vi.fn(() => localStorage.removeItem('access_token'));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: MenuService, useValue: { obtenerMenu: () => menu } },
      { provide: AuthService, useValue: { tenantCode: () => 'A', hasFreshTenantToken: () => false, companies: () => companies, logout } },
    ] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Sidebar); fixture.detectChanges();
    companies.next([{ codigo: 'B', nombre: 'Empresa B' }, { codigo: 'A', nombre: 'Empresa A' }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Empresa A');
    menu.next([]); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain('Empresa A');
    expect(fixture.nativeElement.querySelector('.sidebar__mobile-company').textContent).toContain('Empresa A');
    (fixture.nativeElement.querySelector('.sidebar__switch') as HTMLButtonElement).click();
    expect(logout).toHaveBeenCalledOnce(); expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('saas_access_token')).toBe('saas');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not label legacy JWT as a tenant company', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: MenuService, useValue: { obtenerMenu: () => of([]) } },
      { provide: AuthService, useValue: { tenantCode: () => null } },
    ] });
    const fixture = TestBed.createComponent(Sidebar); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain('Acceso anterior');
  });

  it('shows a freshly issued tenant identity even if the legacy menu has no matching user', async () => {
    localStorage.setItem('access_token', 'tenant-A');
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: MenuService, useValue: { obtenerMenu: () => new Subject() } },
      { provide: AuthService, useValue: { tenantCode: () => 'A', hasFreshTenantToken: (token: string) => token === 'tenant-A', companies: () => of([{ codigo: 'A', nombre: 'Empresa A' }]) } },
    ] });
    const fixture = TestBed.createComponent(Sidebar); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.sidebar__company').textContent).toContain('Empresa A');
  });
});
