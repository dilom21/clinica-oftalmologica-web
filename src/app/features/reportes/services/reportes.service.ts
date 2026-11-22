import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ReporteCatalogo, ReporteExportacion, ReporteFormato, ReportePreview, ReporteRequest, ReporteInterpretacionIa,
  ReporteEmailDinamicoPayload, ReporteEmailEstaticoPayload,
  normalizeCatalog, normalizePreview,
} from '../models/reportes.models';
import {
  CatalogoProgresivo, EstadoModeloInasistencia, FiltrosProgresivos,
  FormatoProgresivo, PronosticoDemanda, RespuestaComparacion, RespuestaKpis,
  RespuestaSerie,
} from '../models/analitica.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reportes`;

  obtenerCatalogo(): Observable<ReporteCatalogo> {
    return this.http.get<unknown>(`${this.baseUrl}/catalogo`).pipe(map(normalizeCatalog));
  }
  obtenerCatalogoProgresivo(): Observable<CatalogoProgresivo> {
    return this.http.get<CatalogoProgresivo>(`${this.baseUrl}/progresivos/catalogo`);
  }
  obtenerKpis(filtros: FiltrosProgresivos): Observable<RespuestaKpis> {
    return this.http.get<RespuestaKpis>(`${this.baseUrl}/progresivos/kpis`, { params: this.progressiveParams(filtros) });
  }
  obtenerSerie(indicador: string, filtros: FiltrosProgresivos): Observable<RespuestaSerie> {
    return this.http.get<RespuestaSerie>(`${this.baseUrl}/progresivos/series/${encodeURIComponent(indicador)}`, { params: this.progressiveParams(filtros) });
  }
  obtenerComparacion(indicador: string, filtros: FiltrosProgresivos): Observable<RespuestaComparacion> {
    return this.http.get<RespuestaComparacion>(`${this.baseUrl}/progresivos/comparaciones/${encodeURIComponent(indicador)}`, { params: this.progressiveParams(filtros) });
  }
  exportarProgresivo(formato: FormatoProgresivo, indicador: string, filtros: FiltrosProgresivos): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/progresivos/exportar/${formato}`, { ...filtros, indicador }, { observe: 'response', responseType: 'blob' });
  }
  obtenerPronosticoDemanda(horizonte: number, fechaCorte?: string): Observable<PronosticoDemanda> {
    let params = new HttpParams().set('horizonte', String(horizonte));
    if (fechaCorte) params = params.set('fecha_corte', fechaCorte);
    return this.http.get<PronosticoDemanda>(`${environment.apiUrl}/ia-predictiva/demanda/semanal`, { params });
  }
  obtenerEstadoInasistencia(): Observable<EstadoModeloInasistencia> {
    return this.http.get<EstadoModeloInasistencia>(`${environment.apiUrl}/ia-predictiva/inasistencia/estado`);
  }
  interpretarReporte(texto: string): Observable<ReporteInterpretacionIa> {
    return this.http.post<ReporteInterpretacionIa>(`${environment.apiUrl}/ia/reportes/interpretar`, { texto });
  }
  previsualizarDinamico(request: ReporteRequest): Observable<ReportePreview> {
    return this.http.post<unknown>(`${this.baseUrl}/dinamicos/previsualizar`, this.dynamicPayload(request)).pipe(map(normalizePreview));
  }
  exportarDinamico(formato: ReporteFormato, request: ReporteRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/dinamicos/exportar/${formato}`, this.dynamicPayload(request), { observe: 'response', responseType: 'blob' });
  }
  previsualizarEstatico(reporteKey: string, request: ReporteRequest): Observable<ReportePreview> {
    return this.http.post<unknown>(`${this.baseUrl}/estaticos/${encodeURIComponent(reporteKey)}/previsualizar`, this.staticPayload(request)).pipe(map(normalizePreview));
  }
  exportarEstatico(reporteKey: string, formato: ReporteFormato, request: ReporteRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/estaticos/${encodeURIComponent(reporteKey)}/exportar/${formato}`, this.staticPayload(request), { observe: 'response', responseType: 'blob' });
  }
  enviarEmailDinamico(email: Omit<ReporteEmailDinamicoPayload, 'dataset' | 'columnas' | 'filtros' | 'orden' | 'limit'>, request: ReporteRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/dinamicos/enviar-email`, { ...email, ...this.dynamicPayload(request) });
  }
  enviarEmailEstatico(reporteKey: string, email: Omit<ReporteEmailEstaticoPayload, 'filtros' | 'limit'>, request: ReporteRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/estaticos/${encodeURIComponent(reporteKey)}/enviar-email`, { ...email, ...this.staticPayload(request) });
  }

  private dynamicPayload(request: ReporteRequest): Record<string, unknown> {
    return { dataset: request.dataset, columnas: request.columns ?? [], filtros: request.filters.map((filter) => this.filterPayload(filter)), orden: (request.order_by ?? []).map((order) => ({ campo: order.field, direccion: order.direction })), limit: this.validLimit(request.limit) };
  }

  private staticPayload(request: ReporteRequest): Record<string, unknown> {
    return { filtros: request.filters.map((filter) => this.filterPayload(filter)), limit: this.validLimit(request.limit) };
  }

  private filterPayload(filter: ReporteRequest['filters'][number]): Record<string, unknown> {
    const value = filter.value2 === undefined ? filter.value : [filter.value, filter.value2];
    return { campo: filter.field, operador: filter.operator, valor: value };
  }

  private validLimit(limit: number | undefined): number {
    return typeof limit === 'number' && Number.isInteger(limit) && limit >= 1 && limit <= 200 ? limit : 50;
  }

  private progressiveParams(filtros: FiltrosProgresivos): HttpParams {
    let params = new HttpParams()
      .set('fecha_desde', filtros.fecha_desde)
      .set('fecha_hasta', filtros.fecha_hasta)
      .set('granularidad', filtros.granularidad);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return params;
  }

  static filename(response: HttpResponse<Blob>, formato: ReporteFormato): string {
    const header = response.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(header);
    return match?.[1] ? decodeURIComponent(match[1].trim().replace(/^"|"$/g, '')) : `reporte.${formato}`;
  }
}
