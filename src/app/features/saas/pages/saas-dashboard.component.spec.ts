import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { SaasApiService } from '../services/saas-api.service';
import { SaasDashboardComponent } from './saas-dashboard.component';

describe('SaasDashboardComponent', () => {
  let fixture: ComponentFixture<SaasDashboardComponent>;
  type Streams = { empresas: Subject<any[]>; tenants: Subject<any[]>; suscripciones: Subject<any[]>; planes: Subject<any[]>; provisionamientos: Subject<any[]> };
  const api = {
    empresas: () => new Subject<any[]>(), tenants: () => new Subject<any[]>(), suscripciones: () => new Subject<any[]>(), planes: () => new Subject<any[]>(), provisionamientos: () => new Subject<any[]>(),
  };

  async function create(): Promise<Streams> {
    const streams = { empresas: new Subject<any[]>(), tenants: new Subject<any[]>(), suscripciones: new Subject<any[]>(), planes: new Subject<any[]>(), provisionamientos: new Subject<any[]>() };
    await TestBed.configureTestingModule({ imports: [SaasDashboardComponent], providers: [{ provide: SaasApiService, useValue: Object.fromEntries(Object.entries(streams).map(([key, stream]) => [key, () => stream])) }] }).compileComponents();
    fixture = TestBed.createComponent(SaasDashboardComponent);
    fixture.detectChanges();
    return streams;
  }

  it('shows pending and real metrics in the DOM after async responses', async () => {
    const streams = await create();
    expect(fixture.nativeElement.textContent).toContain('Cargando resumen…');
    expect(fixture.nativeElement.textContent).toContain('Actualizando…');
    streams.empresas.next(Array.from({ length: 7 }, (_, id) => ({ id, estado: 'ACTIVA' }))); streams.empresas.complete();
    streams.tenants.next(Array.from({ length: 7 }, (_, id) => ({ id, estado: 'ACTIVA' }))); streams.tenants.complete();
    streams.suscripciones.next(Array.from({ length: 7 }, (_, id) => ({ id, estado: 'ACTIVA' }))); streams.suscripciones.complete();
    streams.planes.next(Array.from({ length: 3 }, (_, id) => ({ id, estado: true }))); streams.planes.complete();
    streams.provisionamientos.next(Array.from({ length: 7 }, (_, id) => ({ id, estado: 'COMPLETADO' }))); streams.provisionamientos.complete();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Cargando resumen…'); expect(text).not.toContain('Actualizando…');
    const articles = fixture.nativeElement.querySelectorAll('.metrics article') as NodeListOf<HTMLElement>;
    const metricTexts = Array.from(articles).map((article) => article.textContent?.replace(/\s+/g, ' ').trim());
    expect(metricTexts).toEqual(['Empresas totales7', 'Empresas activas7', 'Tenants activos7', 'Suscripciones activas7', 'Planes disponibles3', 'Provisionamientos con error0']);
    expect(fixture.componentInstance.metrics()).toEqual({ empresas: 7, activas: 7, tenants: 7, suscripciones: 7, planes: 3, errores: 0 });
  });

  it('terminates loading and renders only the async error state', async () => {
    await TestBed.configureTestingModule({ imports: [SaasDashboardComponent], providers: [{ provide: SaasApiService, useValue: { ...api, planes: () => throwError(() => new Error('backend details')) } }] }).compileComponents();
    fixture = TestBed.createComponent(SaasDashboardComponent); fixture.detectChanges(); await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(fixture.componentInstance.loading()).toBe(false); expect(text).not.toContain('Actualizando…'); expect(text).toContain('No se pudo cargar el resumen de la plataforma.'); expect(text).not.toContain('Empresas totales');
  });
});
