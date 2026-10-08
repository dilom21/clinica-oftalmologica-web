import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import {
  ExamenOftalmologicoCrear,
  ResultadoExamenCrear,
} from '../models/examenes.models';
import { ExamenesService } from './examenes.service';

describe('ExamenesService (CU18)', () => {
  let httpMock: HttpTestingController;
  let service: ExamenesService;

  const apiUrl = environment.apiUrl;
  const consultasBaseUrl = `${apiUrl}/historial-clinico/consultas`;
  const examenesBaseUrl = `${apiUrl}/historial-clinico/examenes`;
  const consultaId = 900;
  const examenId = 850;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ExamenesService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listarExamenes hace GET a /consultas/{id}/examenes', () => {
    let resultado: unknown;
    service.listarExamenes(consultaId).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/examenes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(resultado).toEqual([]);
  });

  it('registrarExamen hace POST solo con nombre y observaciones', () => {
    const datos: ExamenOftalmologicoCrear = {
      nombre_examen: 'Tonometría',
      observaciones: 'Ojo derecho e izquierdo',
    };

    service.registrarExamen(consultaId, datos).subscribe();

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/examenes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);

    const body = req.request.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('consulta_clinica_id');
    expect(body).not.toHaveProperty('fecha_solicitud');
    expect(body).not.toHaveProperty('estado');
    expect(body).not.toHaveProperty('oftalmologo_id');
    expect(body).not.toHaveProperty('paciente_id');
    expect(body).not.toHaveProperty('usuario_id');

    req.flush(
      {
        id: examenId,
        consulta_clinica_id: consultaId,
        nombre_examen: 'Tonometría',
        fecha_solicitud: '2026-10-03T11:00:00',
        observaciones: 'Ojo derecho e izquierdo',
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('obtenerExamen hace GET a /examenes/{id}', () => {
    service.obtenerExamen(examenId).subscribe();

    const req = httpMock.expectOne(`${examenesBaseUrl}/${examenId}`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: examenId,
      consulta_clinica_id: consultaId,
      nombre_examen: 'Tonometría',
      fecha_solicitud: '2026-10-03T11:00:00',
      observaciones: null,
      estado: true,
      resultados: [],
    });
  });

  it('listarResultados hace GET a /examenes/{id}/resultados', () => {
    service.listarResultados(examenId).subscribe();

    const req = httpMock.expectOne(`${examenesBaseUrl}/${examenId}/resultados`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('registrarResultado hace POST sin campos controlados', () => {
    const datos: ResultadoExamenCrear = {
      resultado: 'OD 16 mmHg · OI 15 mmHg',
      archivo_url: null,
    };

    service.registrarResultado(examenId, datos).subscribe();

    const req = httpMock.expectOne(`${examenesBaseUrl}/${examenId}/resultados`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);

    const body = req.request.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('examen_id');
    expect(body).not.toHaveProperty('fecha_resultado');
    expect(body).not.toHaveProperty('estado');

    req.flush(
      {
        id: 950,
        examen_id: examenId,
        resultado: 'OD 16 mmHg · OI 15 mmHg',
        archivo_url: null,
        fecha_resultado: '2026-10-03T11:30:00',
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('envía archivo_url cuando se indica una URL', () => {
    service
      .registrarResultado(examenId, {
        resultado: 'Agudeza OD 20/40',
        archivo_url: 'https://ejemplo.test/od.pdf',
      })
      .subscribe();

    const req = httpMock.expectOne(`${examenesBaseUrl}/${examenId}/resultados`);
    expect(req.request.body).toEqual({
      resultado: 'Agudeza OD 20/40',
      archivo_url: 'https://ejemplo.test/od.pdf',
    });
    req.flush({ id: 1, examen_id: examenId, resultado: 'x', archivo_url: null });
  });
});
