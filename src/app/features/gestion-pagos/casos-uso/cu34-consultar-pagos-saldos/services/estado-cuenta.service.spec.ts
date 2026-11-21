import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { EstadoCuentaRespuesta } from '../models/estado-cuenta.models';
import { EstadoCuentaService } from './estado-cuenta.service';

describe('EstadoCuentaService', () => {
  let api: EstadoCuentaService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(EstadoCuentaService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta por GET la ruta contractual usando el identificador', () => {
    const resultado = { paciente: { id: 42 } } as EstadoCuentaRespuesta;
    api.consultar(42).subscribe((data) => expect(data).toBe(resultado));
    const request = http.expectOne(`${environment.apiUrl}/pagos/administrativos/estado-cuenta/42`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    request.flush(resultado);
  });

  it('propaga errores HTTP para que la vista gestione los estados', () => {
    let status = 0;
    api.consultar(7).subscribe({ error: (error) => (status = error.status) });
    http.expectOne(`${environment.apiUrl}/pagos/administrativos/estado-cuenta/7`).flush({}, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
  });
});
