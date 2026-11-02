import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CatalogoService } from './catalogo.service';
import { environment } from '../../../../../../environments/environment';

describe('CatalogoService', () => {
  let service: CatalogoService; let http: HttpTestingController; const base = `${environment.apiUrl}/inventario-proveedores`;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [CatalogoService, provideHttpClient(), provideHttpClientTesting()] }); service = TestBed.inject(CatalogoService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('covers the 15 catalog operations and exact request contracts', () => {
    service.listarCategorias().subscribe(); let r = http.expectOne(`${base}/categorias?incluir_inactivos=false`); expect(r.request.method).toBe('GET'); r.flush([]);
    service.obtenerCategoria(1).subscribe(); r = http.expectOne(`${base}/categorias/1`); expect(r.request.method).toBe('GET'); r.flush({});
    service.crearCategoria({ nombre: 'A' }).subscribe(); r = http.expectOne(`${base}/categorias`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({ nombre: 'A' }); r.flush({});
    service.actualizarCategoria(1, { nombre: 'B' }).subscribe(); r = http.expectOne(`${base}/categorias/1`); expect(r.request.method).toBe('PUT'); r.flush({});
    service.cambiarEstadoCategoria(1, false).subscribe(); r = http.expectOne(`${base}/categorias/1/estado`); expect(r.request.method).toBe('PATCH'); expect(r.request.body).toEqual({ estado: false }); r.flush({});
    service.listarProductos(2, true).subscribe(); r = http.expectOne(`${base}/productos?incluir_inactivos=true&categoria_id=2`); expect(r.request.method).toBe('GET'); r.flush([]);
    service.obtenerProducto(1).subscribe(); r = http.expectOne(`${base}/productos/1`); r.flush({});
    service.crearProducto({ categoria_id: 2, codigo: 'X', nombre: 'Y' }).subscribe(); r = http.expectOne(`${base}/productos`); expect(r.request.method).toBe('POST'); r.flush({});
    service.actualizarProducto(1, { categoria_id: 2, codigo: 'X', nombre: 'Y' }).subscribe(); r = http.expectOne(`${base}/productos/1`); expect(r.request.method).toBe('PUT'); r.flush({});
    service.cambiarEstadoProducto(1, true).subscribe(); r = http.expectOne(`${base}/productos/1/estado`); expect(r.request.method).toBe('PATCH'); r.flush({});
    service.listarLotes(3).subscribe(); r = http.expectOne(`${base}/lotes?incluir_inactivos=false&producto_id=3`); expect(r.request.method).toBe('GET'); r.flush([]);
    service.obtenerLote(1).subscribe(); r = http.expectOne(`${base}/lotes/1`); r.flush({});
    service.crearLote({ producto_id: 3, numero_lote: 'L' }).subscribe(); r = http.expectOne(`${base}/lotes`); expect(r.request.body.producto_id).toBe(3); r.flush({});
    service.actualizarLote(1, { numero_lote: 'L2' }).subscribe(); r = http.expectOne(`${base}/lotes/1`); expect(r.request.method).toBe('PUT'); expect(r.request.body.producto_id).toBeUndefined(); r.flush({});
    service.cambiarEstadoLote(1, false).subscribe(); r = http.expectOne(`${base}/lotes/1/estado`); expect(r.request.method).toBe('PATCH'); r.flush({});
  });
});
