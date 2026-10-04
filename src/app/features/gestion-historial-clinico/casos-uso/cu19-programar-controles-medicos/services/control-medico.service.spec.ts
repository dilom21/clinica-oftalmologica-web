import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../environments/environment';
import { ControlMedicoService } from './control-medico.service';

describe('ControlMedicoService (CU19)', () => {
  let service: ControlMedicoService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/historial-clinico`;

  beforeEach(() => {
    localStorage.setItem('access_token', 'token-cu19');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    service = TestBed.inject(ControlMedicoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('access_token'); });

  it('programa en la consulta previa sin enviar identidades ni estado', () => {
    const datos = { fecha_programada: '2026-10-05', motivo: 'Seguimiento', observaciones: null };
    service.programarControl(9, datos).subscribe();
    const req = http.expectOne(`${baseUrl}/consultas/9/controles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-cu19');
    expect(req.request.body).toEqual(datos);
    expect(req.request.body).not.toHaveProperty('paciente_id');
    expect(req.request.body).not.toHaveProperty('oftalmologo_id');
    expect(req.request.body).not.toHaveProperty('consulta_clinica_id');
    expect(req.request.body).not.toHaveProperty('estado');
    req.flush({});
  });

  it('lista por paciente, atención y estado con los filtros del contrato', () => {
    service.listarControles({ paciente_id: 4, consulta_clinica_id: 9, estado: 'PROGRAMADO' }).subscribe();
    const req = http.expectOne((r) => r.url === `${baseUrl}/controles`);
    expect(req.request.params.get('paciente_id')).toBe('4');
    expect(req.request.params.get('consulta_clinica_id')).toBe('9');
    expect(req.request.params.get('estado')).toBe('PROGRAMADO');
    req.flush([]);
  });

  it('consulta la lista de una atención y el detalle de un control', () => {
    service.listarControlesConsulta(9).subscribe();
    http.expectOne(`${baseUrl}/consultas/9/controles`).flush([]);
    service.obtenerControl(8).subscribe();
    http.expectOne(`${baseUrl}/controles/8`).flush({});
  });

  it('actualiza parcialmente por PUT y reutiliza el contexto del oftalmólogo autenticado', () => {
    service.obtenerOftalmologoActual().subscribe();
    http.expectOne(`${baseUrl}/controles/oftalmologo-actual`).flush(null);
    service.actualizarControl(8, { estado: 'REALIZADO' }).subscribe();
    const req = http.expectOne(`${baseUrl}/controles/8`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'REALIZADO' });
    req.flush({});
  });
});
