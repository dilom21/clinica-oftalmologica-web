import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor SaaS isolation', () => {
  let http: HttpTestingController; let client: HttpClient;
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])] }); http = TestBed.inject(HttpTestingController); client = TestBed.inject(HttpClient); });
  afterEach(() => { http.verify(); localStorage.clear(); });
  it('uses SaaS token for SaaS calls and no token for login', () => { localStorage.setItem('access_token', 'clinical'); localStorage.setItem('saas_access_token', 'saas'); client.get('/saas/empresas').subscribe(); expect(http.expectOne('/saas/empresas').request.headers.get('Authorization')).toBe('Bearer saas'); client.post('/saas/auth/login', {}).subscribe(); expect(http.expectOne('/saas/auth/login').request.headers.has('Authorization')).toBe(false); });
  it('keeps clinical token for non-SaaS calls', () => { localStorage.setItem('access_token', 'clinical'); localStorage.setItem('saas_access_token', 'saas'); client.get('/seguridad/me').subscribe(); expect(http.expectOne('/seguridad/me').request.headers.get('Authorization')).toBe('Bearer clinical'); });
  it('does not attach clinical or SaaS tokens to public tenant selection or login', () => {
    localStorage.setItem('access_token', 'A'); localStorage.setItem('saas_access_token', 'saas');
    client.get('/seguridad/tenant/empresas').subscribe();
    expect(http.expectOne('/seguridad/tenant/empresas').request.headers.has('Authorization')).toBe(false);
    client.post('/seguridad/tenant/login', {}).subscribe();
    expect(http.expectOne('/seguridad/tenant/login').request.headers.has('Authorization')).toBe(false);
  });
  it('uses only the SaaS token for backup and restore endpoints', () => {
    localStorage.setItem('access_token', 'clinical'); localStorage.setItem('saas_access_token', 'saas');
    const calls: Array<[string, string]> = [['GET', '/saas/backups'], ['POST', '/saas/backups'], ['GET', '/saas/backup-policies'], ['PUT', '/saas/backup-policies/7'], ['POST', '/saas/restores/validate'], ['POST', '/saas/restores'], ['GET', '/saas/restores']];
    for (const [method, url] of calls) {
      (method === 'GET' ? client.get(url) : method === 'POST' ? client.post(url, {}) : client.put(url, {})).subscribe();
      expect(http.expectOne(url).request.headers.get('Authorization')).toBe('Bearer saas');
    }
    expect(localStorage.getItem('access_token')).toBe('clinical');
  });
});
