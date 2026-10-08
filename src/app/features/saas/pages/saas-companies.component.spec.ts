import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../autenticacion-seguridad/Auth/services/auth.service';
import { SaasApiService } from '../services/saas-api.service';
import { SaasCompaniesComponent } from './saas-companies.component';

describe('SaaS open company', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('offers only publicly eligible companies, clears tenant token, retains SaaS and navigates to credentials', async () => {
    const companies = new Subject<{ codigo: string; nombre: string }[]>();
    const logout = vi.fn(() => localStorage.removeItem('access_token'));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'empresas' } } } },
      { provide: AuthService, useValue: { companies: () => companies, logout } },
      { provide: SaasApiService, useValue: { empresas: () => of([{ codigo: 'B', estado: 'ACTIVA' }, { codigo: 'A', estado: 'SUSPENDIDA' }]) } },
    ] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem('access_token', 'A'); localStorage.setItem('saas_access_token', 'saas');
    const fixture = TestBed.createComponent(SaasCompaniesComponent); fixture.detectChanges();
    companies.next([{ codigo: 'B', nombre: 'Empresa B' }]); await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.open-company button').length).toBe(1);
    fixture.componentInstance.open('A'); expect(logout).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('.open-company button') as HTMLButtonElement).click();
    expect(localStorage.getItem('access_token')).toBeNull(); expect(localStorage.getItem('saas_access_token')).toBe('saas');
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { empresa: 'B' } });
  });
});
