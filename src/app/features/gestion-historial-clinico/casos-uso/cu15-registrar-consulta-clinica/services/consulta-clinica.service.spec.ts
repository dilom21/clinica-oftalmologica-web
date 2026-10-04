import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ConsultaClinicaCrear } from '../models/consulta-clinica.models';
import { ConsultaClinicaService } from './consulta-clinica.service';

describe('ConsultaClinicaService', () => {
  let httpMock: HttpTestingController;
  let service: ConsultaClinicaService;

  const consultasUrl = `${environment.apiUrl}/historial-clinico/consultas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ConsultaClinicaService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envía POST a /historial-clinico/consultas con el payload exacto', () => {
    const datos: ConsultaClinicaCrear = {
      historial_clinico_id: 7,
      cita_id: null,
      motivo_consulta: 'Disminución de visión',
      anamnesis: 'Paciente refiere visión borrosa.',
      observaciones: null,
    };

    service.registrarConsulta(datos).subscribe();

    const req = httpMock.expectOne(consultasUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    expect(req.request.body).not.toHaveProperty('oftalmologo_id');
    expect(req.request.body).not.toHaveProperty('paciente_id');
    expect(req.request.body).not.toHaveProperty('usuario_id');
    expect(req.request.body).not.toHaveProperty('estado');
    expect(req.request.body).not.toHaveProperty('fecha_consulta');

    req.flush(
      {
        id: 1,
        historial_clinico_id: 7,
        cita_id: null,
        oftalmologo: {
          id: 2,
          matricula: 'MP-123',
          nombres: 'Ana',
          apellidos: 'Pérez',
          especialidad: null,
        },
        fecha_consulta: '2026-10-01T10:00:00',
        motivo_consulta: 'Disminución de visión',
        anamnesis: 'Paciente refiere visión borrosa.',
        observaciones: null,
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
  });
});
