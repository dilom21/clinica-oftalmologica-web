import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProveedoresService } from './proveedores.service';

describe('CU28 proveedores: contrato HTTP', () => {
  let service: ProveedoresService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProveedoresService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía filtros y paginación al servidor', () => {
    service.listar(2, false, '  Optica  ').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/proveedores/'));
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('estado')).toBe('false');
    expect(req.request.params.get('buscar')).toBe('Optica');
    req.flush({ items: [], total: 0, pagina: 2, tamanio: 20 });
  });

  it('actualiza solo los campos enviados y reactiva por PUT', () => {
    service.actualizar(3, { telefono: null }).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/proveedores/3'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ telefono: null });
    req.flush({});
    service.reactivar(3).subscribe();
    const reactivar = http.expectOne(r => r.url.endsWith('/proveedores/3'));
    expect(reactivar.request.body).toEqual({ estado: true });
    reactivar.flush({});
  });

  it('confirma la baja y acepta respuesta 204 sin cuerpo', () => {
    service.darBaja(4).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/proveedores/4'));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('confirmar')).toBe('true');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});