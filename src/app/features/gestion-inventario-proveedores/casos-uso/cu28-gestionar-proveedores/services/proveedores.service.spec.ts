import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import { ProveedoresService } from './proveedores.service';

const BASE = `${environment.apiUrl}/proveedores/`;

describe('CU28 — contratos HTTP de proveedores', () => {
  let servicio: ProveedoresService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ProveedoresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista con estado, búsqueda recortada y paginación', () => {
    servicio.listar({ estado: false, busqueda: '  Optica ', skip: 20, limit: 20 }).subscribe();

    const peticion = http.expectOne(
      (req) => req.url === BASE && req.method === 'GET',
    );
    expect(peticion.request.params.get('estado')).toBe('false');
    expect(peticion.request.params.get('busqueda')).toBe('Optica');
    expect(peticion.request.params.get('skip')).toBe('20');
    expect(peticion.request.params.get('limit')).toBe('20');
    peticion.flush([]);
  });

  it('omite la búsqueda vacía', () => {
    servicio.listar({ estado: true, busqueda: '   ' }).subscribe();

    const peticion = http.expectOne((req) => req.url === BASE);
    expect(peticion.request.params.has('busqueda')).toBe(false);
    expect(peticion.request.params.get('estado')).toBe('true');
    peticion.flush([]);
  });

  it('da de baja con DELETE y reactiva con PUT estado=true', () => {
    servicio.desactivar(5).subscribe();
    const baja = http.expectOne(`${BASE}5`);
    expect(baja.request.method).toBe('DELETE');
    baja.flush(null, { status: 204, statusText: 'No Content' });

    servicio.reactivar(5).subscribe();
    const alta = http.expectOne(`${BASE}5`);
    expect(alta.request.method).toBe('PUT');
    expect(alta.request.body).toEqual({ estado: true });
    alta.flush({});
  });
});
