import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { EstadoModeloInasistencia, PronosticoDemanda } from '../../models/analitica.models';
import { ReportesService } from '../../services/reportes.service';

@Component({ selector: 'app-panel-ia-predictiva', imports: [CommonModule, FormsModule], templateUrl: './panel-ia-predictiva.html', styleUrl: './panel-ia-predictiva.css' })
export class PanelIaPredictiva implements OnInit, OnDestroy {
  protected horizonte = 4;
  protected fechaCorte = '';
  protected readonly pronostico = signal<PronosticoDemanda | null>(null);
  protected readonly ml = signal<EstadoModeloInasistencia | null>(null);
  protected readonly cargandoPronostico = signal(true);
  protected readonly cargandoMl = signal(true);
  protected readonly errorPronostico = signal<string | null>(null);
  protected readonly errorMl = signal<string | null>(null);
  private readonly consultar$ = new Subject<void>();
  private readonly destruir$ = new Subject<void>();
  private readonly service = inject(ReportesService);

  ngOnInit(): void {
    this.consultar$.pipe(switchMap(() => this.service.obtenerPronosticoDemanda(this.horizonte, this.fechaCorte || undefined)), takeUntil(this.destruir$)).subscribe({ next: (data) => { this.pronostico.set(data); this.cargandoPronostico.set(false); }, error: (error: unknown) => { this.cargandoPronostico.set(false); this.errorPronostico.set(this.mensajeError(error)); } });
    this.consultarPronostico(); this.consultarMl();
  }
  ngOnDestroy(): void { this.destruir$.next(); this.destruir$.complete(); }
  protected consultarPronostico(): void { if (this.horizonte < 4 || this.horizonte > 12) { this.errorPronostico.set('El horizonte debe estar entre 4 y 12 semanas.'); return; } this.cargandoPronostico.set(true); this.errorPronostico.set(null); this.consultar$.next(); }
  protected consultarMl(): void { this.cargandoMl.set(true); this.errorMl.set(null); this.service.obtenerEstadoInasistencia().subscribe({ next: (data) => { this.ml.set(data); this.cargandoMl.set(false); }, error: (error: unknown) => { this.cargandoMl.set(false); this.errorMl.set(this.mensajeError(error)); } }); }
  protected altura(valor: number): number { const max = Math.max(1, ...(this.pronostico()?.pronosticos.map((item) => item.limite_superior) ?? [])); return Math.max(5, Math.round(valor * 100 / max)); }
  protected estadoTexto(estado: PronosticoDemanda['estado']): string { return ({ READY: 'Pronóstico disponible', INSUFFICIENT_HISTORY: 'Historial insuficiente', INSUFFICIENT_DATA: 'Datos no utilizables', FORECAST_UNAVAILABLE: 'Pronóstico no disponible' })[estado]; }
  protected nombreVariable(value: string): string { return value.replaceAll('_', ' ').toLowerCase(); }
  private mensajeError(error: unknown): string { const status = error instanceof HttpErrorResponse ? error.status : (error as { status?: number })?.status; return status === 401 ? 'Tu sesión expiró.' : status === 403 ? 'No tienes permiso para consultar esta analítica.' : status === 429 ? 'Hay demasiadas solicitudes. Intenta más tarde.' : status === 422 ? 'Revisa el horizonte y la fecha de corte.' : 'No se pudo consultar el servicio de IA.'; }
}
