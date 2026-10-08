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
});
