import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../../environments/environment';
import { RegistrarConsulta } from './registrar-consulta';

describe('RegistrarConsulta (CU15)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<RegistrarConsulta>;

  const apiUrl = environment.apiUrl;
  const pacientesUrl = `${apiUrl}/pacientes`;
  const menuUrl = `${apiUrl}/seguridad/menu`;
  const consultasUrl = `${apiUrl}/historial-clinico/consultas`;
  const citasUrl = `${apiUrl}/agenda-citas/citas`;

  const pacienteBase = {
    id: 1,
    usuario_id: null,
    nombres: 'Juan',
    apellidos: 'Quispe',
    ci: '1234567',
    fecha_nacimiento: '1990-05-10',
    sexo: 'M',
    telefono: '70000000',
    contacto_emergencia: '70000001',
    fecha_registro: '2026-01-01',
    direccion: 'Calle 1',
    estado: true,
  };

  const historialRespuesta = {
    paciente: pacienteBase,
    historial: {
      id: 10,
      fecha_apertura: '2026-01-02',
      observaciones_generales: 'Sin alergias conocidas',
      antecedentes: [
        {
          id: 100,
          tipo: 'ALERGIA',
          descripcion: 'Penicilina',
          fecha_registro: '2026-01-03',
        },
      ],
    },
  };

  const citaProgramada = {
    id: 55,
    paciente_id: 1,
    oftalmologo_id: 2,
    fecha: '2026-10-05',
    hora_inicio: '09:00:00',
    hora_fin: '10:00:00',
    motivo: 'Control',
    observaciones: null,
    estado: 'PROGRAMADA',
    fecha_registro: null,
    fecha_actualizacion: null,
  };

  const citaAtendida = { ...citaProgramada, id: 56, estado: 'ATENDIDA' };

  const respuestaConsulta = {
    id: 900,
    historial_clinico_id: 10,
    cita_id: null,
    oftalmologo: {
      id: 2,
      matricula: 'MP-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      especialidad: null,
    },
    fecha_consulta: '2026-10-01T10:00:00',
    motivo_consulta: 'Control',
    anamnesis: 'Paciente refiere visión borrosa.',
    observaciones: null,
    estado: true,
  };

  beforeEach(async () => {
    localStorage.setItem('access_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [RegistrarConsulta],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegistrarConsulta);
    fixture.detectChanges();

    httpMock.match((r) => r.url === menuUrl).forEach((r) => r.flush([]));
    httpMock.expectOne((r) => r.url === pacientesUrl).flush([pacienteBase]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
  });

  function seleccionarPaciente(): void {
    const select = fixture.nativeElement.querySelector(
      '.consulta-selector__select select',
    ) as HTMLSelectElement;
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${apiUrl}/historial-clinico/1`)
      .flush(historialRespuesta);
    httpMock
      .expectOne((r) => r.url.startsWith(citasUrl))
      .flush([citaProgramada, citaAtendida]);
    fixture.detectChanges();
  }

  function completarFormulario(anamnesis = 'Paciente refiere visión borrosa.'): void {
    const form = fixture.nativeElement.querySelector(
      'form.consulta-form',
    ) as HTMLFormElement;
    const motivo = form.querySelector('input[type="text"]') as HTMLInputElement;
    const textareas = form.querySelectorAll('textarea');
    const anamnesisInput = textareas[0] as HTMLTextAreaElement;
    const observacionesInput = textareas[1] as HTMLTextAreaElement;

    motivo.value = 'Control';
    motivo.dispatchEvent(new Event('input'));
    anamnesisInput.value = anamnesis;
    anamnesisInput.dispatchEvent(new Event('input'));
    observacionesInput.value = 'Sin hallazgos';
    observacionesInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviarFormulario(): void {
    const form = fixture.nativeElement.querySelector(
      'form.consulta-form',
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('carga los pacientes al iniciar', () => {
    const opciones = fixture.nativeElement.querySelectorAll(
      '.consulta-selector__select option',
    );
    // placeholder + 1 paciente
    expect(opciones.length).toBe(2);
  });

  it('selecciona un paciente y carga su historial y citas', () => {
    seleccionarPaciente();

    const resumen = fixture.nativeElement.querySelector('.consulta-resumen');
    expect(resumen?.textContent).toContain('Juan');
    expect(resumen?.textContent).toContain('Quispe');

    const antecedentes = fixture.nativeElement.querySelectorAll(
      '.consulta-antecedentes__lista li',
    );
    expect(antecedentes.length).toBe(1);

    // "Sin cita asociada" + 1 cita vigente (la ATENDIDA se filtra).
    const radios = fixture.nativeElement.querySelectorAll(
      'input[name="opcion-cita"]',
    );
    expect(radios.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('05/10/2026');
  });

  it('no envía la consulta si la anamnesis está vacía', () => {
    seleccionarPaciente();
    enviarFormulario();

    expect(httpMock.match((r) => r.url === consultasUrl).length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('La anamnesis es obligatoria');
  });

  it('registra sin cita (cita_id null) y sin oftalmologo_id', () => {
    seleccionarPaciente();
    completarFormulario();
    enviarFormulario();

    const req = httpMock.expectOne((r) => r.url === consultasUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');

    const body = req.request.body as Record<string, unknown>;
    expect(body).toEqual({
      historial_clinico_id: 10,
      cita_id: null,
      motivo_consulta: 'Control',
      anamnesis: 'Paciente refiere visión borrosa.',
      observaciones: 'Sin hallazgos',
    });
    expect(body).not.toHaveProperty('oftalmologo_id');
    expect(body).not.toHaveProperty('paciente_id');
    expect(body).not.toHaveProperty('usuario_id');

    req.flush(respuestaConsulta, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    const exito = fixture.nativeElement.querySelector('.consulta-exito');
    expect(exito?.textContent).toContain('#900');
  });

  it('asocia una cita válida enviando su id', () => {
    seleccionarPaciente();

    const radios = fixture.nativeElement.querySelectorAll(
      'input[name="opcion-cita"]',
    ) as NodeListOf<HTMLInputElement>;
    radios[1].click();
    fixture.detectChanges();

    completarFormulario();
    enviarFormulario();

    const req = httpMock.expectOne((r) => r.url === consultasUrl);
    const body = req.request.body as Record<string, unknown>;
    expect(body['cita_id']).toBe(55);
    expect(body).not.toHaveProperty('oftalmologo_id');

    req.flush(
      { ...respuestaConsulta, cita_id: 55 },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    // Tras el alta se muestra el resumen de éxito con la cita asociada.
    const exito = fixture.nativeElement.querySelector('.consulta-exito');
    expect(exito?.textContent).toContain('#55');
    expect(exito?.textContent).toContain('Atendida');
  });

  it('muestra el detalle del backend ante un error 409', () => {
    seleccionarPaciente();
    completarFormulario();
    enviarFormulario();

    httpMock
      .expectOne((r) => r.url === consultasUrl)
      .flush(
        { detail: 'La cita ya tiene una consulta clínica registrada' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'La cita ya tiene una consulta clínica registrada',
    );
  });

  it('evita el doble submit', () => {
    seleccionarPaciente();
    completarFormulario();

    enviarFormulario();
    enviarFormulario();

    const peticiones = httpMock.match((r) => r.url === consultasUrl);
    expect(peticiones.length).toBe(1);

    peticiones[0].flush(respuestaConsulta, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.consulta-exito')).toBeTruthy();
  });
});
