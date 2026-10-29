import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../environments/environment';
import { FiltrosInventario } from '../models/inventario.models';
import { InventarioService } from './inventario.service';

describe('CU30 — consultas HTTP y contexto de empresa', () => {
  let servicio: InventarioService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/inventario-proveedores`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    servicio = TestBed.inject(InventarioService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('envía filtros y paginación sin aceptar empresa o tenant como parámetros', () => {
    localStorage.setItem('access_token', 'sesion-tenant');
    servicio
      .consultar({
        q: 'Solución',
        categoria: 'Insumos',
        stock: 'BAJO',
        vencimiento: 'PROXIMO',
        dias_vencimiento: 45,
        page: 2,
        page_size: 10,
        empresa_id: 999,
        tenant_id: 88,
      } as FiltrosInventario)
      .subscribe();
    const req = http.expectOne((r) => r.url === `${url}/inventario`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([
      'q',
      'categoria',
      'stock',
      'vencimiento',
      'dias_vencimiento',
      'page',
      'page_size',
    ]);
    expect(req.request.params.get('q')).toBe('Solución');
    expect(req.request.params.get('dias_vencimiento')).toBe('45');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.headers.get('Authorization')).toBe('Bearer sesion-tenant');
    req.flush({});
  });

  it('usa el token vigente para cualquiera de siete empresas sin conservar el anterior', () => {
    for (let empresa = 1; empresa <= 7; empresa++) {
      localStorage.setItem('access_token', `token-empresa-${empresa}`);
      servicio.consultar().subscribe();
      const req = http.expectOne(`${url}/inventario`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer token-empresa-${empresa}`);
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush({});
    }
  });

  it('consulta alertas y lotes por GET y aplica el mismo umbral de vencimiento', () => {
    servicio.alertas({ stock: 'AGOTADO', page: 3 }).subscribe();
    const avisos = http.expectOne((r) => r.url === `${url}/alertas`);
    expect(avisos.request.method).toBe('GET');
    expect(avisos.request.params.get('stock')).toBe('AGOTADO');
    avisos.flush({});
    servicio.lotes(42, 60).subscribe();
    const lotes = http.expectOne(`${url}/productos/42/lotes?dias_vencimiento=60`);
    expect(lotes.request.method).toBe('GET');
    expect(lotes.request.body).toBeNull();
    lotes.flush({});
  });

  it('envía SIN_UMBRAL como filtro sin convertirlo en stock mínimo cero', () => {
    servicio.consultar({ stock: 'SIN_UMBRAL' }).subscribe();
    const productos = http.expectOne(`${url}/inventario?stock=SIN_UMBRAL`);
    expect(productos.request.params.keys()).toEqual(['stock']);
    productos.flush({ items: [], total: 0 });

    servicio.alertas({ stock: 'SIN_UMBRAL' }).subscribe();
    const alertas = http.expectOne(`${url}/alertas?stock=SIN_UMBRAL`);
    expect(alertas.request.params.keys()).toEqual(['stock']);
    alertas.flush({ items: [], total: 0 });
  });

  it('propaga la indisponibilidad del tenant sin convertirla en una lista vacía', () => {
    let codigo: string | undefined;
    servicio.consultar().subscribe({
      error: (error) => {
        codigo = error.error.detail.codigo;
      },
    });
    http
      .expectOne(`${url}/inventario`)
      .flush(
        { detail: { codigo: 'INVENTARIO_DEPENDENCIAS_PENDIENTES' } },
        { status: 503, statusText: 'Unavailable' },
      );
    expect(codigo).toBe('INVENTARIO_DEPENDENCIAS_PENDIENTES');
  });
});
