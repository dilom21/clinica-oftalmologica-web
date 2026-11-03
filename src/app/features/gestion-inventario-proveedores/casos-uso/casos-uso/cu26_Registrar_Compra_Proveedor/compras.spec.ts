import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ComprasService } from './compras.service';
import { centavos, importe } from './compras.utils';

describe('CU26: contrato de compras y cálculo de importes', () => {
  let api: ComprasService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ComprasService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('busca proveedores y productos por páginas sin enviar empresa ni usuario', () => {
    api.proveedores(2, '  Optica  ').subscribe();
    const p = http.expectOne(r => r.url.endsWith('/compras/proveedores'));
    expect(p.request.params.keys().sort()).toEqual(['buscar', 'pagina']);
    expect(p.request.params.get('pagina')).toBe('2');
    expect(p.request.params.get('buscar')).toBe('Optica');
    p.flush({ items: [], total: 0, pagina: 2, tamanio: 20 });
    api.productos(3, 'Gasas').subscribe();
    const q = http.expectOne(r => r.url.endsWith('/compras/productos'));
    expect(q.request.params.get('pagina')).toBe('3'); q.flush({});
  });

  it('consulta los lotes del producto seleccionado y el historial', () => {
    api.lotes(8, 2).subscribe();
    const l = http.expectOne(r => r.url.endsWith('/compras/productos/8/lotes'));
    expect(l.request.params.get('pagina')).toBe('2'); l.flush({});
    api.listar(4).subscribe();
    const h = http.expectOne(r => r.url.endsWith('/compras/'));
    expect(h.request.params.get('pagina')).toBe('4'); h.flush({});
    api.consultar(14).subscribe();
    http.expectOne(r => r.url.endsWith('/compras/14')).flush({});
  });

  it('registra con el contrato de la API y conserva el costo decimal como texto', () => {
    const datos = { proveedor_id: 1, moneda: 'BOB', detalles: [{ producto_id: 2, lote_id: 3, cantidad: 3, costo_unitario: '0.10' }] };
    api.crear(datos).subscribe();
    const r = http.expectOne(r => r.url.endsWith('/compras/'));
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(datos); r.flush({});
  });

  it('calcula centavos sin errores binarios incluso por encima de Number.MAX_SAFE_INTEGER', () => {
    expect(centavos('0.10') * 3n).toBe(30n);
    expect(centavos('9999999999.99') * 2147483647n).toBe(2147483646997852516353n);
    expect(importe(280n)).toContain('2,80');
    expect(centavos('0')).toBe(0n);
    expect(() => centavos('NaN')).toThrow();
    expect(() => centavos('1.001')).toThrow();
  });
});
