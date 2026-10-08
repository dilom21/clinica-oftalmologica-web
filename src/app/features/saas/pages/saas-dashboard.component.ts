import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, finalize, map } from 'rxjs';
import { SaasApiService } from '../services/saas-api.service';

@Component({
  selector: 'app-saas-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<section class="page" [attr.aria-busy]="loading()"><div class="head"><div><p class="eyebrow">Visión general</p><h1>Centro de control SaaS</h1><p>Estado operativo de la plataforma y sus tenants.</p></div><button type="button" (click)="load()" [disabled]="loading()">{{loading() ? 'Actualizando…' : 'Actualizar datos'}}</button></div><p class="status" aria-live="polite" *ngIf="loading()">Cargando resumen…</p><p class="error" role="alert" aria-live="assertive" *ngIf="error()">{{error()}}</p><div class="metrics" *ngIf="!error()"><article *ngFor="let item of metricList()"><span>{{item[0]}}</span><strong>{{item[1]}}</strong></article></div><div class="summary"><h2>Lectura operativa</h2><p>Las métricas se calculan con las colecciones actuales del backend SaaS.</p></div></section>`,
  styles: [`:host{display:block}.page{max-width:1200px;margin:auto}.head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:28px}.eyebrow{margin:0 0 8px;color:#1683b6;text-transform:uppercase;letter-spacing:.1em;font-weight:800;font-size:.72rem}h1{font-size:clamp(1.8rem,4vw,2.5rem);margin:0;color:#102a43}p{color:#64748b}button{border:1px solid #b8d5e8;background:#fff;color:#1261a0;border-radius:8px;padding:11px 15px;font-weight:700;cursor:pointer}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.metrics article,.summary{background:#fff;border:1px solid #e1eaf2;border-radius:14px;padding:22px;box-shadow:0 4px 14px #102a4308}.metrics span{display:block;color:#64748b;font-size:.84rem}.metrics strong{display:block;color:#102a43;font-size:2rem;margin-top:8px}.summary{margin-top:20px}.summary h2{font-size:1.1rem;color:#102a43}.status{color:#486581}.error{color:#be123c;background:#fff1f2;padding:12px;border-radius:8px}@media(max-width:768px){.metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.head{display:block}.head button{margin-top:18px;width:100%}.metrics{grid-template-columns:1fr}}`],
})
export class SaasDashboardComponent implements OnInit {
  private readonly api = inject(SaasApiService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly metrics = signal({ empresas: 0, activas: 0, tenants: 0, suscripciones: 0, planes: 0, errores: 0 });
  readonly metricList = computed<[string, number][]>(() => {
    const metrics = this.metrics();
    return [['Empresas totales', metrics.empresas], ['Empresas activas', metrics.activas], ['Tenants activos', metrics.tenants], ['Suscripciones activas', metrics.suscripciones], ['Planes disponibles', metrics.planes], ['Provisionamientos con error', metrics.errores]];
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ empresas: this.api.empresas(), tenants: this.api.tenants(), suscripciones: this.api.suscripciones(), planes: this.api.planes(), provisionamientos: this.api.provisionamientos() }).pipe(
      map((data) => ({
        empresas: data.empresas.length,
        activas: data.empresas.filter((x) => x.estado === 'ACTIVA').length,
        tenants: data.tenants.filter((x) => x.estado === 'ACTIVA').length,
        suscripciones: data.suscripciones.filter((x) => x.estado === 'ACTIVA').length,
        planes: data.planes.filter((x) => x.estado === true).length,
        errores: data.provisionamientos.filter((x) => x.estado === 'ERROR').length,
      })),
      finalize(() => this.loading.set(false)),
    ).subscribe({ next: (metrics) => this.metrics.set(metrics), error: () => this.error.set('No se pudo cargar el resumen de la plataforma.') });
  }
}
