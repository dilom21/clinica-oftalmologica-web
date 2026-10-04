import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { DiagnosticoCrear } from '../models/diagnostico.models';
import { DiagnosticoService } from './diagnostico.service';

describe('DiagnosticoService (CU16)', () => {
  let httpMock: HttpTestingController;
  let service: DiagnosticoService;

  const baseUrl = `${environment.apiUrl}/historial-clinico/consultas`;
  const consultaId = 900;
  const diagnosticosUrl = `${baseUrl}/${consultaId}/diagnosticos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(DiagnosticoService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envía POST a /historial-clinico/consultas/{id}/diagnosticos', () => {
    const datos: DiagnosticoCrear = {
      nombre: 'Miopía',
      descripcion: 'Miopía bilateral leve.',
    };

    service.registrarDiagnostico(consultaId, datos).subscribe();

    const req = httpMock.expectOne(diagnosticosUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);

    req.flush(
      {
        id: 1,
        consulta_clinica_id: consultaId,
        nombre: 'Miopía',
        descripcion: 'Miopía bilateral leve.',
        fecha_diagnostico: '2026-10-01T10:00:00',
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('el body NO contiene consulta_clinica_id, oftalmologo_id ni otros campos controlados', () => {
    service.registrarDiagnostico(consultaId, {
      nombre: 'Catarata',
      descripcion: null,
    }).subscribe();

    const req = httpMock.expectOne(diagnosticosUrl);
    const body = req.request.body as Record<string, unknown>;

    expect(body).not.toHaveProperty('consulta_clinica_id');
    expect(body).not.toHaveProperty('oftalmologo_id');
    expect(body).not.toHaveProperty('paciente_id');
    expect(body).not.toHaveProperty('usuario_id');
    expect(body).not.toHaveProperty('estado');
    expect(body).not.toHaveProperty('fecha_diagnostico');

    req.flush(
      {
        id: 2,
        consulta_clinica_id: consultaId,
        nombre: 'Catarata',
        descripcion: null,
        fecha_diagnostico: '2026-10-01T10:00:00',
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('GET lista los diagnósticos de la consulta', () => {
    const respuesta = [
      {
        id: 1,
        consulta_clinica_id: consultaId,
        nombre: 'Miopía',
        descripcion: null,
        fecha_diagnostico: '2026-10-01T10:00:00',
        estado: true,
      },
    ];

    let resultado: unknown;
    service.listarDiagnosticos(consultaId).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(diagnosticosUrl);
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);

    expect(resultado).toEqual(respuesta);
  });
});