import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { SaasAuthService } from '../../features/saas/services/saas-auth.service';
import { saasAuthGuard } from './saas-auth.guard';

describe('saasAuthGuard', () => {
  const route = {} as ActivatedRouteSnapshot; const state = {} as RouterStateSnapshot;
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] }); });
  afterEach(() => localStorage.clear());
  it('rejects missing and clinical tokens', () => { const result = TestBed.runInInjectionContext(() => saasAuthGuard(route, state)); expect(result).not.toBe(true); localStorage.setItem('saas_access_token', 'clinical'); const second = TestBed.runInInjectionContext(() => saasAuthGuard(route, state)); expect(second).not.toBe(true); });
  it('accepts a non-expired SaaS admin token', () => { const token = `a.${btoa(JSON.stringify({ token_type: 'saas_admin', exp: Math.floor(Date.now() / 1000) + 60 }))}.c`; localStorage.setItem('saas_access_token', token); const result = TestBed.runInInjectionContext(() => saasAuthGuard(route, state)); expect(result).toBe(true); expect(TestBed.inject(SaasAuthService).isValidAdminToken()).toBe(true); });
});
