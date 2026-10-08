import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import {
  IndicacionCrear,
  RecetaCrear,
  TratamientoCrear,
} from '../models/tratamientos-recetas.models';
import { TratamientosRecetasService } from './tratamientos-recetas.service';

describe('TratamientosRecetasService (CU17)', () => {
  let httpMock: HttpTestingController;
  let service: TratamientosRecetasService;

  const apiUrl = environment.apiUrl;
  const consultasBaseUrl = `${apiUrl}/historial-clinico/consultas`;
  const recetasBaseUrl = `${apiUrl}/historial-clinico/recetas`;
  const consultaId = 900;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(TratamientosRecetasService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Tratamientos -------------------------------------------------------

  it('listarTratamientos hace GET a /consultas/{id}/tratamientos', () => {
    let resultado: unknown;
    service.listarTratamientos(consultaId).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/tratamientos`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(resultado).toEqual([]);
  });

  it('registrarTratamiento hace POST y envía solo los campos permitidos', () => {
    const datos: TratamientoCrear = {
      descripcion: 'Lubricante ocular',
      observaciones: null,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-10-30',
    };

    service.registrarTratamiento(consultaId, datos).subscribe();

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/tratamientos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);

    const body = req.request.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('estado');
    expect(body).not.toHaveProperty('consulta_clinica_id');
    expect(body).not.toHaveProperty('oftalmologo_id');
    expect(body).not.toHaveProperty('usuario_id');
    expect(body).not.toHaveProperty('paciente_id');

    req.flush(
      {
        id: 1,
        consulta_clinica_id: consultaId,
        descripcion: 'Lubricante ocular',
        observaciones: null,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-10-30',
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
  });

  // --- Indicaciones -------------------------------------------------------

  it('listarIndicaciones hace GET a /consultas/{id}/indicaciones', () => {
    service.listarIndicaciones(consultaId).subscribe();

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/indicaciones`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('registrarIndicacion hace POST sin fecha_registro ni identificadores internos', () => {
    const datos: IndicacionCrear = { descripcion: 'No frotarse los ojos' };

    service.registrarIndicacion(consultaId, datos).subscribe();

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/indicaciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ descripcion: 'No frotarse los ojos' });

    const body = req.request.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('fecha_registro');
    expect(body).not.toHaveProperty('consulta_clinica_id');
    expect(body).not.toHaveProperty('estado');

    req.flush(
      {
        id: 5,
        consulta_clinica_id: consultaId,
        descripcion: 'No frotarse los ojos',
        fecha_registro: '2026-10-03T10:00:00',
      },
      { status: 201, statusText: 'Created' },
    );
  });

  // --- Recetas ------------------------------------------------------------

  it('listarRecetas hace GET a /consultas/{id}/recetas', () => {
    service.listarRecetas(consultaId).subscribe();

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/recetas`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('registrarReceta hace POST con observaciones y detalles, sin campos controlados', () => {
    const datos: RecetaCrear = {
      observaciones: 'Aplicar en el ojo derecho',
      detalles: [
        {
          medicamento: 'Tobramicina',
          presentacion: 'Solución oftálmica 0.3%',
          dosis: '1 gota',
          frecuencia: 'Cada 8 horas',
          duracion: '7 días',
          indicaciones: 'No suspender antes del alta.',
        },
      ],
    };

    service.registrarReceta(consultaId, datos).subscribe();

    const req = httpMock.expectOne(`${consultasBaseUrl}/${consultaId}/recetas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);

    const body = req.request.body as Record<string, unknown> & {
      detalles: Record<string, unknown>[];
    };
    expect(body).not.toHaveProperty('fecha_emision');
    expect(body).not.toHaveProperty('estado');
    expect(body).not.toHaveProperty('receta_id');
    expect(body).not.toHaveProperty('consulta_clinica_id');
    expect(body.detalles[0]).not.toHaveProperty('receta_id');

    req.flush(
      {
        id: 12,
        consulta_clinica_id: consultaId,
        observaciones: 'Aplicar en el ojo derecho',
        fecha_emision: '2026-10-03T10:00:00',
        estado: true,
        detalles: [{ id: 30, receta_id: 12, ...datos.detalles[0] }],
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('obtenerReceta hace GET a /historial-clinico/recetas/{id}', () => {
    service.obtenerReceta(12).subscribe();

    const req = httpMock.expectOne(`${recetasBaseUrl}/12`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 12,
      consulta_clinica_id: consultaId,
      observaciones: null,
      fecha_emision: '2026-10-03T10:00:00',
      estado: true,
      detalles: [],
    });
  });
});
