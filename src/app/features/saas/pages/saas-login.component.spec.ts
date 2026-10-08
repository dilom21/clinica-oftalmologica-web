import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { SaasAuthService } from '../services/saas-auth.service';
import { SaasLoginComponent, safeSaasLoginMessage } from './saas-login.component';
import { Router } from '@angular/router';

describe('SaasLoginComponent', () => {
  async function create(login: Subject<unknown>): Promise<{ fixture: ComponentFixture<SaasLoginComponent>; navigate: ReturnType<typeof vi.fn> }> {
    const navigate = vi.fn(() => Promise.resolve(true));
    await TestBed.configureTestingModule({ imports: [SaasLoginComponent], providers: [{ provide: SaasAuthService, useValue: { login: () => login } }, { provide: Router, useValue: { navigate } }] }).compileComponents();
    const fixture = TestBed.createComponent(SaasLoginComponent); fixture.detectChanges(); return { fixture, navigate };
  }

  it.each([401, 403, 422, 500])('shows a sanitized async DOM error for HTTP %s', async (status) => {
    const login = new Subject<unknown>(); const { fixture } = await create(login); fixture.componentInstance.form.setValue({ correo: 'admin@example.com', password: 'secret' }); fixture.detectChanges();
    fixture.componentInstance.submit(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Validando…'); login.error({ status, message: 'JWT secret backend detail' }); await fixture.whenStable();
    expect(fixture.componentInstance.loading()).toBe(false); expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(status === 422 ? 'Revisa los datos ingresados.' : status >= 500 ? 'La plataforma no está disponible' : 'No se pudo validar'); expect(fixture.nativeElement.textContent).not.toContain('JWT');
  });

  it('keeps successful navigation after the async login response', async () => {
    const login = new Subject<unknown>(); const { fixture, navigate } = await create(login); fixture.componentInstance.form.setValue({ correo: 'admin@example.com', password: 'secret' }); fixture.detectChanges();
    fixture.componentInstance.submit(); fixture.detectChanges(); login.next({ access_token: 'token' }); login.complete(); await fixture.whenStable(); expect(navigate).toHaveBeenCalledWith(['/saas']); expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('preserves the safe message contract', () => { for (const status of [401, 403]) expect(safeSaasLoginMessage({ status })).not.toContain('message'); expect(safeSaasLoginMessage({ status: 422 })).toBe('Revisa los datos ingresados.'); expect(safeSaasLoginMessage({ status: 503 })).toBe('La plataforma no está disponible en este momento.'); });
});
