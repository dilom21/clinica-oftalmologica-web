import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { SaasApiService } from '../services/saas-api.service';
import { SaasCollectionComponent } from './saas-collection.component';

describe('SaasCollectionComponent', () => {
  async function create(kind: string, stream: Observable<any[]>, apiOverrides: Record<string, unknown> = {}): Promise<ComponentFixture<SaasCollectionComponent>> {
    await TestBed.configureTestingModule({ imports: [SaasCollectionComponent], providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { kind } } } }, { provide: SaasApiService, useValue: { empresas: () => stream, planes: () => stream, suscripciones: () => stream, tenants: () => stream, provisionamientos: () => stream, bitacora: () => stream, cambiarEmpresaEstado: vi.fn(() => of({})), cambiarSuscripcionEstado: vi.fn(() => of({})), ...apiOverrides } }] }).compileComponents();
    const fixture = TestBed.createComponent(SaasCollectionComponent); fixture.detectChanges(); return fixture;
  }

  it.each([['empresas', 7], ['planes', 3], ['suscripciones', 7], ['tenants', 7], ['provisionamientos', 7]] as const)('renders async DOM rows for %s', async (kind, count) => {
    const stream = new Subject<any[]>(); const fixture = await create(kind, stream);
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    stream.next(Array.from({ length: count }, (_, id) => ({ id, nombre: `registro-${id}` }))); stream.complete(); await fixture.whenStable();
    expect(fixture.componentInstance.rows()).toHaveLength(count); expect(fixture.componentInstance.loading()).toBe(false); expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(count);
  });

  it('renders LOGIN_SAAS and IPv4/IPv6 values in the async bitácora DOM', async () => {
    const stream = new Subject<any[]>(); const fixture = await create('bitacora', stream);
    stream.next([{ id: 1, accion: 'LOGIN_SAAS', ip: '192.168.1.10' }, { id: 2, accion: 'LOGIN_SAAS', ip: '2001:db8::1' }]); stream.complete(); await fixture.whenStable();
    const text = fixture.nativeElement.textContent; expect(text).toContain('LOGIN_SAAS'); expect(text).toContain('192.168.1.10'); expect(text).toContain('2001:db8::1'); expect(text).not.toContain('Cargando');
  });

  it.each([['ACTIVA', 'SUSPENDIDA'], ['SUSPENDIDA', 'ACTIVA']] as const)('PATCHes %s to %s, closes modal, refreshes and updates DOM', async (from, to) => {
    const initial = new Subject<any[]>(); const refreshed = new Subject<any[]>(); const patch = new Subject<unknown>(); let loads = 0;
    const change = vi.fn(() => patch); const fixture = await create('empresas', initial, { empresas: () => (loads++ === 0 ? initial : refreshed), cambiarEmpresaEstado: change });
    const row = { id: 7, nombre: 'Empresa', estado: from }; initial.next([row]); initial.complete(); await fixture.whenStable();
    (fixture.nativeElement.querySelector('.actions button') as HTMLButtonElement).click(); await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('#estado-modal') as HTMLSelectElement; select.value = to; select.dispatchEvent(new Event('change')); (fixture.nativeElement.querySelector('.modal-actions .primary') as HTMLButtonElement).click();
    expect(change).toHaveBeenCalledWith(7, to); expect(fixture.componentInstance.saving()).toBe(true);
    patch.next({ ...row, estado: to }); patch.complete(); await fixture.whenStable(); expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();
    refreshed.next([{ ...row, estado: to }]); refreshed.complete(); await fixture.whenStable(); expect(fixture.componentInstance.saving()).toBe(false); expect(fixture.nativeElement.textContent).toContain(to);
  });

  it('clears saving and shows an error when the PATCH fails asynchronously', async () => {
    const initial = new Subject<any[]>(); const patch = new Subject<unknown>(); const fixture = await create('empresas', initial, { empresas: () => initial, cambiarEmpresaEstado: vi.fn(() => patch) });
    initial.next([{ id: 7, nombre: 'Empresa', estado: 'ACTIVA' }]); initial.complete(); await fixture.whenStable();
    (fixture.nativeElement.querySelector('.actions button') as HTMLButtonElement).click(); await fixture.whenStable(); (fixture.nativeElement.querySelector('.modal-actions .primary') as HTMLButtonElement).click(); patch.error(new Error('failure')); await fixture.whenStable();
    expect(fixture.componentInstance.saving()).toBe(false); expect(fixture.nativeElement.textContent).toContain('No se pudo cambiar el estado. Intenta nuevamente.');
  });

  it('does not offer an implicit action for a PENDIENTE company', async () => {
    const fixture = await create('empresas', of([{ id: 7, estado: 'PENDIENTE' }])); await fixture.whenStable();
    expect(fixture.componentInstance.canChangeCompany({ id: 7, estado: 'PENDIENTE' } as never)).toBe(false); expect(fixture.nativeElement.textContent).toContain('Sin acción disponible');
  });
});
