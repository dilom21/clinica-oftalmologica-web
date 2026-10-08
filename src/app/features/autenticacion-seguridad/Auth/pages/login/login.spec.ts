import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { Login } from './login';
import { vi } from 'vitest';

const token = (code: string) => `e.${btoa(JSON.stringify({ token_type: 'tenant', tenant_id: 8, empresa_codigo: code, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;
const base = `${environment.apiUrl}/seguridad`;

describe('Clinical login', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'inicio', component: Login }]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ empresa: 'B' }) } } },
    ] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); });
  function credentials(fixture: ComponentFixture<Login>): void {
    for (const [name, value] of [['email', 'user@example.com'], ['password', 'secret']]) {
      const input = fixture.nativeElement.querySelector(`#${name}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  }

  it('renders async API companies and preselects only a matching code', async () => {
    const fixture = TestBed.createComponent(Login); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    expect(fixture.nativeElement.textContent).toContain('Cargando empresas');
    http.expectOne(`${base}/tenant/empresas`).flush([{ codigo: 'B', nombre: 'Empresa B' }, { codigo: 'C', nombre: 'Empresa C' }]);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#company') as HTMLSelectElement).value).toBe('B');
    expect(fixture.nativeElement.textContent).toContain('Empresa B');
  });

  it('does not trust an unknown query company or submit before the list is available', async () => {
    const fixture = TestBed.createComponent(Login); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    credentials(fixture); fixture.componentInstance.onSubmit();
    http.expectNone(`${base}/tenant/login`);
    http.expectOne(`${base}/tenant/empresas`).flush([{ codigo: 'C', nombre: 'Empresa C' }]);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#company') as HTMLSelectElement).value).toBe('');
    fixture.componentInstance.onSubmit();
    http.expectNone(`${base}/tenant/login`);
    expect(fixture.nativeElement.textContent).toContain('Selecciona una empresa');
  });

  it('never sends token A on public calls; clears it before B login, retains SaaS, stores B JWT', async () => {
    localStorage.setItem('access_token', token('A')); localStorage.setItem('saas_access_token', 'saas');
    const fixture = TestBed.createComponent(Login); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const list = http.expectOne(`${base}/tenant/empresas`);
    expect(list.request.headers.has('Authorization')).toBe(false);
    list.flush([{ codigo: 'B', nombre: 'Empresa B' }]); await fixture.whenStable();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    credentials(fixture);
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const login = http.expectOne(`${base}/tenant/login`);
    expect(login.request.body).toEqual({ empresa_codigo: 'B', correo: 'user@example.com', password: 'secret' });
    expect(login.request.headers.has('Authorization')).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('.login__mode') as HTMLButtonElement).disabled).toBe(true);
    login.flush({ access_token: token('B'), token_type: 'bearer' });
    expect(localStorage.getItem('access_token')).toBe(token('B'));
    expect(localStorage.getItem('saas_access_token')).toBe('saas');
  });

  it('rejects mismatched JWT and sanitizes a suspension race without restoring token A', async () => {
    const fixture = TestBed.createComponent(Login); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${base}/tenant/empresas`).flush([{ codigo: 'B', nombre: 'Empresa B' }]); await fixture.whenStable();
    credentials(fixture);
    fixture.componentInstance.onSubmit();
    http.expectOne(`${base}/tenant/login`).flush({ access_token: token('A') }); await fixture.whenStable();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No se pudo validar');
    localStorage.setItem('access_token', token('A'));
    fixture.componentInstance.onSubmit();
    http.expectOne(`${base}/tenant/login`).flush({ detail: 'internal connection string' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No se puede acceder a esta empresa');
    expect(fixture.nativeElement.textContent).not.toContain('connection string');
  });

  it('keeps legacy login explicit and posts no company when selected', async () => {
    const fixture = TestBed.createComponent(Login); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${base}/tenant/empresas`).flush([]); await fixture.whenStable();
    (fixture.nativeElement.querySelector('.login__mode') as HTMLButtonElement).click(); await fixture.whenStable();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    credentials(fixture);
    fixture.componentInstance.onSubmit();
    const request = http.expectOne(`${base}/login`);
    expect(request.request.body).toEqual({ correo: 'user@example.com', password: 'secret' });
    request.flush({ access_token: 'legacy.jwt.token' });
    expect(localStorage.getItem('access_token')).toBe('legacy.jwt.token');
  });
});
