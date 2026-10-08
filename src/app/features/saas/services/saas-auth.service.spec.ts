import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SaasAuthService, SAAS_TOKEN_KEY, decodeSaasToken } from './saas-auth.service';

describe('SaasAuthService', () => {
  let service: SaasAuthService; let http: HttpTestingController;
  const token = `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify({ token_type: 'saas_admin', exp: Math.floor(Date.now() / 1000) + 3600, saas_usuario_id: 7 }))}.signature`;
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'saas/login', redirectTo: '' }])] }); service = TestBed.inject(SaasAuthService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => { http.verify(); localStorage.clear(); });
  it('posts credentials and stores only the SaaS token', () => { service.login({ correo: 'admin@example.com', password: 'secret' }).subscribe(); const request = http.expectOne(`${environment.apiUrl}/saas/auth/login`); expect(request.request.body).toEqual({ correo: 'admin@example.com', password: 'secret' }); request.flush({ access_token: token, token_type: 'bearer', saas_usuario_id: 7 }); expect(localStorage.getItem(SAAS_TOKEN_KEY)).toBe(token); });
  it('validates token type and expiry locally for UX only', () => { localStorage.setItem(SAAS_TOKEN_KEY, token); expect(service.isValidAdminToken()).toBe(true); expect(decodeSaasToken(token)?.saas_usuario_id).toBe(7); localStorage.setItem(SAAS_TOKEN_KEY, 'clinical-token'); expect(service.isValidAdminToken()).toBe(false); });
  it('logout removes only SaaS storage', () => { localStorage.setItem(SAAS_TOKEN_KEY, token); localStorage.setItem('access_token', 'clinical-token'); service.logout(); expect(localStorage.getItem(SAAS_TOKEN_KEY)).toBeNull(); expect(localStorage.getItem('access_token')).toBe('clinical-token'); });
});
