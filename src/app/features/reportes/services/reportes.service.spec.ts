import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  let service: ReportesService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReportesService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const dynamicRequest = { dataset: 'pacientes', columns: ['id', 'activo'], filters: [{ field: 'activo', operator: 'eq', value: true }], order_by: [{ field: 'id', direction: 'desc' as const }], limit: 25 };

  it('gets and normalizes the catalog', () => {
    service.obtenerCatalogo().subscribe((catalog) => expect(catalog.datasets[0].key).toBe('pacientes'));
    const request = http.expectOne(`${environment.apiUrl}/reportes/catalogo`);
    expect(request.request.method).toBe('GET');
    request.flush({ datasets: [{ key: 'pacientes', label: 'Pacientes', fields: [{ key: 'id', label: 'ID', type: 'number', operators: ['eq'], sortable: true, default: true }] }] });
  });

  it('posts voice report interpretation without sending audio', () => {
    service.interpretarReporte('Muéstrame las consultas de octubre').subscribe((result) => expect(result.dataset).toBe('consultas_clinicas'));
    const request = http.expectOne(`${environment.apiUrl}/ia/reportes/interpretar`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ texto: 'Muéstrame las consultas de octubre' });
    expect(request.request.body).not.toHaveProperty('audio');
    request.flush({ dataset: 'consultas_clinicas', columnas: ['fecha_consulta'], filtros: [], orden: [], limit: 25 });
  });

  it('maps dynamic requests to the strict backend names, including order', () => {
    service.previsualizarDinamico(dynamicRequest).subscribe((preview) => expect(preview).toEqual({ columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 1 }], total: 2, limit: 1 }));
    const request = http.expectOne(`${environment.apiUrl}/reportes/dinamicos/previsualizar`);
    expect(request.request.body).toEqual({ dataset: 'pacientes', columnas: ['id', 'activo'], filtros: [{ campo: 'activo', operador: 'eq', valor: true }], orden: [{ campo: 'id', direccion: 'desc' }], limit: 25 });
    request.flush({ columnas: [{ key: 'id', label: 'ID' }], filas: [{ id: 1 }], total: 2, limit: 1 });
  });

  it('maps between to one valor array and leaves empty filters valid', () => {
    service.previsualizarDinamico({ dataset: 'citas', columns: ['fecha'], filters: [{ field: 'fecha', operator: 'between', value: '2026-01-01', value2: '2026-01-31' }], order_by: [] }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/reportes/dinamicos/previsualizar`);
    expect(request.request.body).toEqual({ dataset: 'citas', columnas: ['fecha'], filtros: [{ campo: 'fecha', operador: 'between', valor: ['2026-01-01', '2026-01-31'] }], orden: [], limit: 50 });
    request.flush({ columnas: [], filas: [], total: 0, limit: 10 });
  });

  it('sends only filtros for static preview and normalizes column labels', () => {
    service.previsualizarEstatico('citas_por_fecha', { filters: [{ field: 'estado', operator: 'in', value: ['confirmada', 'pendiente'] }], order_by: [{ field: 'estado', direction: 'asc' }] }).subscribe((preview) => expect(preview.columns[0]).toEqual({ key: 'estado', label: 'Estado' }));
    const request = http.expectOne(`${environment.apiUrl}/reportes/estaticos/citas_por_fecha/previsualizar`);
    expect(request.request.body).toEqual({ filtros: [{ campo: 'estado', operador: 'in', valor: ['confirmada', 'pendiente'] }], limit: 50 });
    request.flush({ columnas: [{ key: 'estado', label: 'Estado' }], filas: [], total: 0, limit: 10 });
  });

  it('uses blob responses for dynamic and static exports', () => {
    service.exportarDinamico('xlsx', dynamicRequest).subscribe((response) => expect(response.body).toBeInstanceOf(Blob));
    const dynamic = http.expectOne(`${environment.apiUrl}/reportes/dinamicos/exportar/xlsx`);
    expect(dynamic.request.responseType).toBe('blob');
    expect(dynamic.request.body).toEqual({ dataset: 'pacientes', columnas: ['id', 'activo'], filtros: [{ campo: 'activo', operador: 'eq', valor: true }], orden: [{ campo: 'id', direccion: 'desc' }], limit: 25 });
    dynamic.flush(new Blob(['x']), { headers: { 'Content-Disposition': 'attachment; filename="pacientes.xlsx"' } });
    service.exportarEstatico('pacientes_activos', 'csv', { filters: [] }).subscribe();
    const staticRequest = http.expectOne(`${environment.apiUrl}/reportes/estaticos/pacientes_activos/exportar/csv`);
    expect(staticRequest.request.responseType).toBe('blob');
    expect(staticRequest.request.body).toEqual({ filtros: [], limit: 50 });
    staticRequest.flush(new Blob(['x']));
  });

  it('exports HTML as a blob and uses the fallback filename', () => {
    service.exportarDinamico('html', dynamicRequest).subscribe((response) => expect(ReportesService.filename(response, 'html')).toBe('reporte.html'));
    const request = http.expectOne(`${environment.apiUrl}/reportes/dinamicos/exportar/html`);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['<html></html>']));
  });

  it('exports static HTML through the static endpoint as a blob', () => {
    service.exportarEstatico('pacientes_activos', 'html', { filters: [] }).subscribe((response) => expect(response.body).toBeInstanceOf(Blob));
    const request = http.expectOne(`${environment.apiUrl}/reportes/estaticos/pacientes_activos/exportar/html`);
    expect(request.request.responseType).toBe('blob');
    expect(request.request.body).toEqual({ filtros: [], limit: 50 });
    request.flush(new Blob(['<html></html>']), { headers: { 'Content-Disposition': 'attachment; filename="pacientes.html"' } });
  });

  it('sends dynamic email with the exact backend payload', () => {
    service.enviarEmailDinamico({ destinatario: 'destino@example.com', formato: 'pdf', asunto: 'Reporte', mensaje: 'Mensaje' }, dynamicRequest).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/reportes/dinamicos/enviar-email`);
    expect(request.request.body).toEqual({ destinatario: 'destino@example.com', formato: 'pdf', asunto: 'Reporte', mensaje: 'Mensaje', dataset: 'pacientes', columnas: ['id', 'activo'], filtros: [{ campo: 'activo', operador: 'eq', valor: true }], orden: [{ campo: 'id', direccion: 'desc' }], limit: 25 });
    request.flush({ ok: true });
  });

  it('sends static email without dynamic columns', () => {
    service.enviarEmailEstatico('pacientes_activos', { destinatario: 'destino@example.com', formato: 'html', asunto: 'Reporte', mensaje: '' }, { filters: [] }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/reportes/estaticos/pacientes_activos/enviar-email`);
    expect(request.request.body).toEqual({ destinatario: 'destino@example.com', formato: 'html', asunto: 'Reporte', mensaje: '', filtros: [], limit: 50 });
    request.flush({ ok: true });
  });

  it('consumes progressive KPIs with exact filters and no tenant identifiers', () => {
    service.obtenerKpis({ fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31', granularidad: 'semana', estado: 'ATENDIDA' }).subscribe();
    const request = http.expectOne((item) => item.url === `${environment.apiUrl}/reportes/progresivos/kpis`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['estado', 'fecha_desde', 'fecha_hasta', 'granularidad']);
    expect(request.request.params.get('estado')).toBe('ATENDIDA');
    expect(request.request.params.has('tenant_id')).toBe(false);
    expect(request.request.params.has('empresa_id')).toBe(false);
    request.flush({ fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31', zona_horaria: 'America/La_Paz', indicadores: [], distribucion_estados: [], advertencias: [] });
  });

  it('gets series and comparisons with an encoded indicator', () => {
    const filters = { fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31', granularidad: 'dia' as const };
    service.obtenerSerie('citas creadas', filters).subscribe();
    http.expectOne((item) => item.url === `${environment.apiUrl}/reportes/progresivos/series/citas%20creadas`).flush({ indicador: 'citas_creadas', etiqueta: 'Citas creadas', granularidad: 'dia', fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta, zona_horaria: 'America/La_Paz', puntos: [], advertencias: [] });
    service.obtenerComparacion('citas_creadas', filters).subscribe();
    http.expectOne((item) => item.url === `${environment.apiUrl}/reportes/progresivos/comparaciones/citas_creadas`).flush({ indicador: 'citas_creadas', actual: { valor: null, estado_dato: 'SUPPRESSED' }, anterior: { valor: 0, estado_dato: 'ZERO' }, variacion_absoluta: null, variacion_porcentual: null, periodo_actual: ['2026-01-01', '2026-01-31'], periodo_anterior: ['2025-12-01', '2025-12-31'], advertencias: [] });
  });

  it('exports progressive data with the selected filters as a blob', () => {
    service.exportarProgresivo('pdf', 'citas_creadas', { fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31', granularidad: 'mes' }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/reportes/progresivos/exportar/pdf`);
    expect(request.request.method).toBe('POST');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.body).toEqual({ fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31', granularidad: 'mes', indicador: 'citas_creadas' });
    request.flush(new Blob(['pdf']));
  });

  it('requests demand forecast and ML status without patient or tenant fields', () => {
    service.obtenerPronosticoDemanda(8, '2026-03-02').subscribe();
    const forecast = http.expectOne((item) => item.url === `${environment.apiUrl}/ia-predictiva/demanda/semanal`);
    expect(forecast.request.params.keys().sort()).toEqual(['fecha_corte', 'horizonte']);
    forecast.flush({ estado: 'INSUFFICIENT_HISTORY', objetivo: 'CITAS_CREADAS', zona_horaria: 'America/La_Paz', fecha_corte: '2026-03-02T00:00:00Z', horizonte_semanas: 8, metodo: null, version_modelo: 'v1', rango_historico_inicio: null, rango_historico_fin: null, calidad_historica: { semanas_ok: 0, semanas_zero: 0, semanas_suppressed: 0, semanas_partial: 0, semanas_not_covered: 0 }, metricas: null, metricas_baseline: null, comparacion_metodos: [], pronosticos: [], intervalo: null, advertencias: [] });
    service.obtenerEstadoInasistencia().subscribe();
    const ml = http.expectOne(`${environment.apiUrl}/ia-predictiva/inasistencia/estado`);
    expect(ml.request.params.keys()).toEqual([]);
    ml.flush({ estado: 'TRAINING_DISABLED', fuente: 'CITA_ESTADO_Y_BITACORA', calidad: 'BLOQUEADO_POR_DATOS', version_regla: 'v1', q09_entrenamiento: 'PROHIBIDO', modelo_habilitado: false, prediccion_habilitada: false, algoritmos_disponibles: [], variables_permitidas: [], variables_excluidas: [], razones_bloqueo: [], advertencias: [] });
  });
});
