import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService tenant separation', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); });
  it('requests only the public minimal selector contract and tenant login payload', () => {
    const auth = TestBed.inject(AuthService); const http = TestBed.inject(HttpTestingController);
    auth.companies().subscribe((companies) => expect(companies).toEqual([{ codigo: 'B', nombre: 'B' }]));
    http.expectOne(`${environment.apiUrl}/seguridad/tenant/empresas`).flush([{ codigo: 'B', nombre: 'B' }]);
    auth.tenantLogin({ empresa_codigo: 'B', correo: 'u@example.com', password: 'p' }).subscribe();
    expect(http.expectOne(`${environment.apiUrl}/seguridad/tenant/login`).request.body).toEqual({ empresa_codigo: 'B', correo: 'u@example.com', password: 'p' });
  });
  it('only accepts an unexpired tenant response matching the selected company; logout retains SaaS', () => {
    const auth = TestBed.inject(AuthService);
    const jwt = (code: string, type: string, exp: number) => `a.${btoa(JSON.stringify({ empresa_codigo: code, token_type: type, tenant_id: 3, exp }))}.c`;
    const future = Math.floor(Date.now() / 1000) + 300;
    localStorage.setItem('saas_access_token', 'saas');
    expect(auth.acceptTenantToken(jwt('A', 'tenant', future), 'B')).toBe(false);
    expect(auth.acceptTenantToken(jwt('B', 'saas_admin', future), 'B')).toBe(false);
    expect(auth.acceptTenantToken(jwt('B', 'tenant', 1), 'B')).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(auth.acceptTenantToken(jwt('B', 'tenant', future), 'B')).toBe(true);
    expect(auth.hasFreshTenantToken(jwt('B', 'tenant', future))).toBe(true);
    auth.logout();
    expect(auth.hasFreshTenantToken(jwt('B', 'tenant', future))).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('saas_access_token')).toBe('saas');
  });
  it('retains the legacy endpoint contract', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ correo: 'u@example.com', password: 'p' }).subscribe();
    expect(TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/seguridad/login`).request.body).toEqual({ correo: 'u@example.com', password: 'p' });
  });
});
