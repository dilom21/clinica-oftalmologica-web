import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, forkJoin, switchMap, takeUntil } from 'rxjs';
import { FiltrosProgresivos, FormatoProgresivo, Granularidad, IndicadorCatalogo, RespuestaComparacion, RespuestaKpis, RespuestaSerie } from '../../models/analitica.models';
import { ReportesService } from '../../services/reportes.service';

@Component({
  selector: 'app-dashboard-progresivo',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-progresivo.html',
  styleUrl: './dashboard-progresivo.css',
})
export class DashboardProgresivo implements OnInit, OnDestroy {
  protected readonly catalogo = signal<IndicadorCatalogo[]>([]);
  protected readonly kpis = signal<RespuestaKpis | null>(null);
  protected readonly serie = signal<RespuestaSerie | null>(null);
  protected readonly comparacion = signal<RespuestaComparacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly exportando = signal<FormatoProgresivo | null>(null);
  protected fechaDesde = this.isoDate(-29);
  protected fechaHasta = this.isoDate(0);
  protected granularidad: Granularidad = 'dia';
  protected estado = '';
  protected indicador = 'citas_creadas';
  private readonly actualizar$ = new Subject<FiltrosProgresivos>();
  private readonly destruir$ = new Subject<void>();
  private readonly service = inject(ReportesService);

  ngOnInit(): void {
    this.actualizar$.pipe(
      switchMap((filtros) => forkJoin({
        kpis: this.service.obtenerKpis(filtros),
        serie: this.service.obtenerSerie(this.indicador, filtros),
        comparacion: this.service.obtenerComparacion(this.indicador, filtros),
      })),
      takeUntil(this.destruir$),
    ).subscribe({
      next: ({ kpis, serie, comparacion }) => { this.kpis.set(kpis); this.serie.set(serie); this.comparacion.set(comparacion); this.cargando.set(false); },
      error: (error: unknown) => { this.cargando.set(false); this.error.set(this.mensajeError(error)); },
    });
    this.service.obtenerCatalogoProgresivo().subscribe({
      next: (catalogo) => { this.catalogo.set(catalogo.indicadores); this.consultar(); },
      error: (error: unknown) => { this.cargando.set(false); this.error.set(this.mensajeError(error)); },
    });
  }
  ngOnDestroy(): void { this.destruir$.next(); this.destruir$.complete(); }

  protected consultar(): void {
    this.error.set(null);
    if (!this.fechasValidas()) { this.error.set('Selecciona un rango válido de hasta 366 días.'); return; }
    this.cargando.set(true);
    this.actualizar$.next(this.filtros());
  }
  protected cambiarIndicador(key: string): void { this.indicador = key; this.consultar(); }
  protected disponible(item: IndicadorCatalogo): boolean { return item.disponible && item.key !== 'calidad_cobertura'; }
  protected indicadorActual(): IndicadorCatalogo | undefined { return this.catalogo().find((item) => item.key === this.indicador); }
  protected valorVisible(valor: number | null, estado: string): string { return valor === null ? this.estadoLabel(estado) : new Intl.NumberFormat('es-BO').format(valor); }
  protected estadoLabel(estado: string): string { return ({ OK: 'Disponible', ZERO: 'Cero real', SUPPRESSED: 'Suprimido', PARTIAL: 'Cobertura parcial', NOT_COVERED: 'Sin cobertura' } as Record<string, string>)[estado] ?? estado; }
  protected altura(valor: number | null): number {
    if (valor === null) return 8;
    const max = Math.max(1, ...(this.serie()?.puntos.flatMap((p) => p.valor === null ? [] : [p.valor]) ?? []));
    return Math.max(4, Math.round(valor * 100 / max));
  }
  protected exportar(formato: FormatoProgresivo): void {
    if (this.exportando()) return;
    this.exportando.set(formato); this.error.set(null);
    this.service.exportarProgresivo(formato, this.indicador, this.filtros()).subscribe({
      next: (response) => { this.descargar(response.body, ReportesService.filename(response, formato)); this.exportando.set(null); },
      error: (error: unknown) => { this.exportando.set(null); this.error.set(this.mensajeError(error)); },
    });
  }
  private filtros(): FiltrosProgresivos { return { fecha_desde: this.fechaDesde, fecha_hasta: this.fechaHasta, granularidad: this.granularidad, ...(this.estado ? { estado: this.estado as FiltrosProgresivos['estado'] } : {}) }; }
  private fechasValidas(): boolean { const desde = new Date(`${this.fechaDesde}T00:00:00`); const hasta = new Date(`${this.fechaHasta}T00:00:00`); const dias = (hasta.getTime() - desde.getTime()) / 86400000; return Boolean(this.fechaDesde && this.fechaHasta && dias >= 0 && dias <= 366); }
  private isoDate(offset: number): string { const value = new Date(); value.setDate(value.getDate() + offset); return value.toISOString().slice(0, 10); }
  private descargar(blob: Blob | null, nombre: string): void { if (!blob) return; const url = URL.createObjectURL(blob); const enlace = document.createElement('a'); enlace.href = url; enlace.download = nombre; enlace.click(); URL.revokeObjectURL(url); }
  private mensajeError(error: unknown): string { const status = error instanceof HttpErrorResponse ? error.status : (error as { status?: number })?.status; return status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.' : status === 403 ? 'No tienes permiso para consultar reportes progresivos.' : status === 429 ? 'Hay demasiadas solicitudes. Espera un momento.' : status === 422 ? 'El rango o los filtros no son válidos.' : 'No se pudo cargar la analítica. Intenta nuevamente.'; }
}
