import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { MovimientosService } from './movimientos.service';

describe('MovimientosService', () => {
  let service: MovimientosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MovimientosService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MovimientosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts only the manual movement DTO', () => {
    const body = { lote_id: 4, tipo: 'AJUSTE_ENTRADA' as const, cantidad: 3, observaciones: 'Conteo físico' };
    service.registrarMovimiento(body).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/inventario-proveedores/movimientos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('lists history with optional lote, skip and limit params', () => {
    service.listarMovimientos({ loteId: 4, skip: 50, limit: 25 }).subscribe();
    const request = http.expectOne((r) => r.url === `${environment.apiUrl}/inventario-proveedores/movimientos`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('lote_id')).toBe('4');
    expect(request.request.params.get('skip')).toBe('50');
    expect(request.request.params.get('limit')).toBe('25');
    request.flush([]);
  });

  it('gets existence for one lot', () => {
    service.consultarExistencia(9).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/inventario-proveedores/existencias/9`);
    expect(request.request.method).toBe('GET');
    request.flush({ lote_id: 9, inventario_id: null, stock_actual: 0, stock_reservado: 0, stock_disponible: 0 });
  });
});
