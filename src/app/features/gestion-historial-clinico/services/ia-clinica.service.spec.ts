import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { IaClinicaService } from './ia-clinica.service';

describe('IaClinicaService', () => {
  let service: IaClinicaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(IaClinicaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts to analysis endpoint without clinical request body', () => {
    service.analizarConsulta(7).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/ia/consultas/7/analizar`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({});
  });

  it('posts only name and description to wording endpoint', () => {
    service.mejorarRedaccionDiagnostico(8, { nombre: 'Miopía', descripcion: 'Leve' }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/ia/consultas/8/mejorar-redaccion-diagnostico`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Miopía', descripcion: 'Leve' });
    request.flush({});
  });
});
