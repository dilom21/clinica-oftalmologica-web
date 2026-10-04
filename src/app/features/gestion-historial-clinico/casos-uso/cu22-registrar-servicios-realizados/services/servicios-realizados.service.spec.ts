import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../environments/environment';
import { ServiciosRealizadosService } from './servicios-realizados.service';

describe('CU22 — contrato HTTP, importes y JWT', () => {
  let servicio: ServiciosRealizadosService, http: HttpTestingController;
  const url = `${environment.apiUrl}/historial-clinico/servicios-realizados`;
  const datos = { paciente_id: 5, servicio_id: 3, consulta_clinica_id: 100,
    precio_aplicado: 130.25, fecha_realizacion: '2020-01-02T12:00:00Z', observaciones: null };
  beforeEach(() => {
    localStorage.setItem('access_token', 'token-de-prueba');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    servicio = TestBed.inject(ServiciosRealizadosService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('access_token'); });

  it('envía filtros por paciente y consulta, paginación y estado false con JWT', () => {
    servicio.listar({ paciente_id: 5, consulta_clinica_id: 100, estado: false, page: 2 }).subscribe();
    const req = http.expectOne(r => r.url === url);
    expect(req.request.params.get('consulta_clinica_id')).toBe('100');
    expect(req.request.params.get('estado')).toBe('false'); expect(req.request.params.get('page')).toBe('2');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush({ items: [], total: 0, page: 2, page_size: 20, total_pages: 0 });
  });

  it('POST individual incluye el precio y excluye identidad clínica o estado enviados por terceros', () => {
    servicio.registrar({ ...datos, oftalmologo_id: 999, estado: false } as typeof datos).subscribe();
    const req = http.expectOne(url); expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos); req.flush({});
  });

  it('POST lote envía filas con precio y observaciones por servicio en una sola petición', () => {
    const filas = [{ servicio_id: 3, precio_aplicado: 130.25, observaciones: 'Primera' },
      { servicio_id: 4, precio_aplicado: 0, observaciones: null }];
    servicio.registrarLote({ paciente_id: 5, consulta_clinica_id: 100,
      fecha_realizacion: datos.fecha_realizacion, servicios: filas }).subscribe();
    const req = http.expectOne(url + '/lote');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.servicios).toEqual(filas);
    expect(req.request.body).not.toHaveProperty('oftalmologo_id');
    req.flush([]);
  });

  it('consulta el detalle y envía PUT completo con precio aplicado', () => {
    servicio.consultar(9).subscribe(); const lectura = http.expectOne(url + '/9');
    expect(lectura.request.method).toBe('GET'); lectura.flush({});
    servicio.actualizar(9, datos).subscribe(); const edicion = http.expectOne(url + '/9');
    expect(edicion.request.method).toBe('PUT'); expect(edicion.request.body).toEqual(datos); edicion.flush({});
  });

  it('usa DELETE del registro para la anulación lógica', () => {
    servicio.anular(9).subscribe(); const req = http.expectOne(url + '/9');
    expect(req.request.method).toBe('DELETE'); req.flush({});
  });
});
