import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { authInterceptor } from '../../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../../environments/environment';
import { RegistrarDiagnostico } from './registrar-diagnostico';
import { VoiceRecognitionService } from '../../../../../../shared/services/voice-recognition.service';

class VoiceStub {
  readonly state = signal<'idle' | 'listening' | 'processing' | 'success' | 'error' | 'unsupported'>('idle');
  readonly mensajeError = signal<string | null>(null);
  readonly resultsSubject = new Subject<{ transcript: string; isFinal: boolean; sessionId: number }>();
  readonly terminalSubject = new Subject<{ sessionId: number; reason: 'permission-denied' | 'stop' | 'error' | 'no-speech' }>();
  private id = 0;
  isSupported(): boolean { return true; }
  get results$() { return this.resultsSubject.asObservable(); }
  get terminal$() { return this.terminalSubject.asObservable(); }
  start(): number { this.state.set('listening'); return ++this.id; }
  stop(): void { this.state.set('idle'); this.terminalSubject.next({ sessionId: this.id, reason: 'stop' }); }
  result(transcript: string): void { this.state.set('success'); this.resultsSubject.next({ transcript, isFinal: true, sessionId: this.id }); }
  terminal(reason: 'permission-denied' | 'stop' | 'error' | 'no-speech'): void { this.state.set(reason === 'permission-denied' || reason === 'error' ? 'error' : 'idle'); this.terminalSubject.next({ sessionId: this.id, reason }); }
}

describe('RegistrarDiagnostico (CU16)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<RegistrarDiagnostico>;
  let voiceStub: VoiceStub;

  const apiUrl = environment.apiUrl;
  const pacientesUrl = `${apiUrl}/pacientes`;
  const menuUrl = `${apiUrl}/seguridad/menu`;
  const consultasUrl = `${apiUrl}/historial-clinico/consultas`;
  const consultaId = 900;
  const diagnosticosUrl = `${consultasUrl}/${consultaId}/diagnosticos`;

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

  const consultaExistente = {
    id: consultaId,
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

  const diagnosticoExistente = {
    id: 500,
    consulta_clinica_id: consultaId,
    nombre: 'Astigmatismo',
    descripcion: 'Astigmatismo leve.',
    fecha_diagnostico: '2026-09-30T09:00:00',
    estado: true,
  };

  const diagnosticoCreado = {
    id: 501,
    consulta_clinica_id: consultaId,
    nombre: 'Miopía',
    descripcion: 'Miopía bilateral leve.',
    fecha_diagnostico: '2026-10-01T10:30:00',
    estado: true,
  };

  beforeEach(async () => {
    localStorage.setItem('access_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [RegistrarDiagnostico],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: VoiceRecognitionService, useValue: voiceStub = new VoiceStub() },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegistrarDiagnostico);
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
      '.diagnostico-selector__select select',
    ) as HTMLSelectElement;
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${apiUrl}/historial-clinico/1`)
      .flush(historialRespuesta);
    httpMock
      .expectOne((r) => r.url === consultasUrl && r.params.get('paciente_id') === '1')
      .flush([consultaExistente]);
    fixture.detectChanges();
  }

  function seleccionarConsulta(): void {
    const tarjeta = fixture.nativeElement.querySelector(
      '.diagnostico-consulta-tarjeta',
    ) as HTMLElement;
    tarjeta.click();
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === diagnosticosUrl).flush([diagnosticoExistente]);
    fixture.detectChanges();
  }

  function completarFormulario(
    nombre = 'Miopía',
    descripcion = 'Miopía bilateral leve.',
  ): void {
    const form = fixture.nativeElement.querySelector(
      'form.diagnostico-form',
    ) as HTMLFormElement;
    const nombreInput = form.querySelector('input[type="text"]') as HTMLInputElement;
    const descripcionInput = form.querySelector('textarea') as HTMLTextAreaElement;

    nombreInput.value = nombre;
    nombreInput.dispatchEvent(new Event('input'));
    descripcionInput.value = descripcion;
    descripcionInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviarFormulario(): void {
    const form = fixture.nativeElement.querySelector(
      'form.diagnostico-form',
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('carga los pacientes al iniciar', () => {
    const opciones = fixture.nativeElement.querySelectorAll(
      '.diagnostico-selector__select option',
    );
    // placeholder + 1 paciente
    expect(opciones.length).toBe(2);
  });

  it('selecciona un paciente y carga sus consultas clínicas', () => {
    seleccionarPaciente();

    const tarjetas = fixture.nativeElement.querySelectorAll(
      '.diagnostico-consulta-tarjeta',
    );
    expect(tarjetas.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Consulta #900');
    expect(fixture.nativeElement.textContent).toContain('Control');
  });

  it('no permite enviar sin consulta seleccionada', () => {
    seleccionarPaciente();

    // Sin consulta seleccionada no se renderiza el formulario.
    const form = fixture.nativeElement.querySelector('form.diagnostico-form');
    expect(form).toBeNull();

    const peticiones = httpMock.match(
      (r) => r.url === diagnosticosUrl && r.method === 'POST',
    );
    expect(peticiones.length).toBe(0);
  });

  it('selecciona una consulta y carga los diagnósticos existentes', () => {
    seleccionarPaciente();
    seleccionarConsulta();

    const items = fixture.nativeElement.querySelectorAll('.diagnostico-item');
    expect(items.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Astigmatismo');
    expect(fixture.nativeElement.textContent).toContain('Astigmatismo leve.');
  });

  it('no envía si el nombre está vacío', () => {
    seleccionarPaciente();
    seleccionarConsulta();
    enviarFormulario();

    expect(httpMock.match((r) => r.url === diagnosticosUrl).length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio');
  });

  it('renders dictation only for description and does not submit or request writing AI', () => {
    seleccionarPaciente(); seleccionarConsulta();
    expect(fixture.nativeElement.querySelectorAll('.diagnostico-dictado').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Dictar descripción');
    expect(httpMock.match((r) => r.method === 'POST' && r.url.includes('/ia/')).length).toBe(0);
    expect(httpMock.match((r) => r.method === 'POST' && r.url === diagnosticosUrl).length).toBe(0);
  });

  it('resets after a dictation error, retries only description, and never registers or calls IA', () => {
    seleccionarPaciente(); seleccionarConsulta();
    const component = fixture.componentInstance as any;
    component.dictarDescripcion();
    voiceStub.terminal('permission-denied');
    expect(component.dictandoDescripcion()).toBe(false);
    component.dictarDescripcion();
    voiceStub.result('Descripción dictada');
    expect(component.form.controls.descripcion.value).toBe('Descripción dictada');
    expect(httpMock.match((r) => r.method === 'POST' && (r.url === diagnosticosUrl || r.url.includes('/ia/'))).length).toBe(0);
  });

  it('exige descripción para IA y solo actualiza la descripción al aceptar sugerencia', () => {
    seleccionarPaciente(); seleccionarConsulta();
    completarFormulario(' Miopía ', ' Texto original ');
    const botonIa = fixture.nativeElement.querySelector('.diagnostico-ia button') as HTMLButtonElement;
    botonIa.click(); fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/ia/consultas/${consultaId}/mejorar-redaccion-diagnostico`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Miopía', descripcion: 'Texto original' });
    expect(botonIa.disabled).toBe(true);
    req.flush({ nombre: 'Miopía', descripcion_original: 'Texto original', descripcion_mejorada: 'Texto mejorado', advertencia: 'Validar' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Descripción original');
    expect(fixture.nativeElement.textContent).toContain('Texto mejorado');
    (fixture.nativeElement.querySelector('.diagnostico-ia button:not(:first-child)') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.diagnostico-form textarea') as HTMLTextAreaElement).value).toBe('Texto mejorado');
    expect(httpMock.match((r) => r.method === 'POST' && r.url === diagnosticosUrl).length).toBe(0);
  });

  it('no solicita IA con descripción vacía y descartar conserva descripción original', () => {
    seleccionarPaciente(); seleccionarConsulta(); completarFormulario('Miopía', '   ');
    (fixture.nativeElement.querySelector('.diagnostico-ia button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(httpMock.match((r) => r.url.includes('/ia/consultas/')).length).toBe(0);
    completarFormulario('Miopía', 'Texto original');
    (fixture.nativeElement.querySelector('.diagnostico-ia button') as HTMLButtonElement).click();
    httpMock.expectOne(`${apiUrl}/ia/consultas/${consultaId}/mejorar-redaccion-diagnostico`).flush({ nombre: 'Miopía', descripcion_original: 'Texto original', descripcion_mejorada: 'Sugerencia', advertencia: 'Validar' });
    fixture.detectChanges();
    const descartar = fixture.nativeElement.querySelectorAll('.diagnostico-ia button')[2] as HTMLButtonElement;
    descartar.click(); fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.diagnostico-form textarea') as HTMLTextAreaElement).value).toBe('Texto original');
    expect(httpMock.match((r) => r.method === 'POST' && r.url === diagnosticosUrl).length).toBe(0);
  });

  it('muestra un mensaje amigable cuando IA no está disponible', () => {
    seleccionarPaciente(); seleccionarConsulta(); completarFormulario();
    (fixture.nativeElement.querySelector('.diagnostico-ia button') as HTMLButtonElement).click();
    httpMock.expectOne(`${apiUrl}/ia/consultas/${consultaId}/mejorar-redaccion-diagnostico`).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.diagnostico-ia [role="alert"]').textContent).toContain('servicio de IA no está disponible');
  });

  it('rechaza un nombre con más de 150 caracteres', () => {
    seleccionarPaciente();
    seleccionarConsulta();
    completarFormulario('a'.repeat(151));
    enviarFormulario();

    expect(httpMock.match((r) => r.url === diagnosticosUrl).length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'El nombre no puede superar los 150 caracteres',
    );
  });

  it('registra el diagnóstico con POST, URL correcta y body sin campos controlados', () => {
    seleccionarPaciente();
    seleccionarConsulta();
    completarFormulario();
    enviarFormulario();

    const req = httpMock.expectOne(diagnosticosUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');

    const body = req.request.body as Record<string, unknown>;
    expect(body).toEqual({
      nombre: 'Miopía',
      descripcion: 'Miopía bilateral leve.',
    });
    expect(body).not.toHaveProperty('consulta_clinica_id');
    expect(body).not.toHaveProperty('oftalmologo_id');
    expect(body).not.toHaveProperty('paciente_id');
    expect(body).not.toHaveProperty('usuario_id');
    expect(body).not.toHaveProperty('estado');
    expect(body).not.toHaveProperty('fecha_diagnostico');

    req.flush(diagnosticoCreado, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    const exito = fixture.nativeElement.querySelector('.diagnostico-exito');
    expect(exito?.textContent).toContain('#501');
    expect(exito?.textContent).toContain('Miopía');
  });

  it('tras 201 limpia el formulario y permite registrar otro diagnóstico en la misma consulta', () => {
    seleccionarPaciente();
    seleccionarConsulta();
    completarFormulario();
    enviarFormulario();

    httpMock
      .expectOne(diagnosticosUrl)
      .flush(diagnosticoCreado, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    // Volver al formulario conservando la consulta seleccionada.
    const botonOtro = fixture.nativeElement.querySelector(
      '.diagnostico-exito__acciones button',
    ) as HTMLButtonElement;
    botonOtro.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector(
      'form.diagnostico-form',
    ) as HTMLFormElement;
    expect(form).toBeTruthy();

    // El diagnóstico recién creado se agregó al listado de la consulta.
    const items = fixture.nativeElement.querySelectorAll('.diagnostico-item');
    expect(items.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Miopía');

    // El formulario quedó limpio.
    const nombreInput = form.querySelector('input[type="text"]') as HTMLInputElement;
    expect(nombreInput.value).toBe('');

    // Se puede registrar un segundo diagnóstico sobre la misma consulta.
    completarFormulario('Glaucoma', 'Presión intraocular elevada.');
    enviarFormulario();

    const req2 = httpMock.expectOne(diagnosticosUrl);
    expect(req2.request.method).toBe('POST');
    expect((req2.request.body as Record<string, unknown>)['nombre']).toBe('Glaucoma');
    req2.flush(
      { ...diagnosticoCreado, id: 502, nombre: 'Glaucoma', descripcion: 'Presión intraocular elevada.' },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    const exito = fixture.nativeElement.querySelector('.diagnostico-exito');
    expect(exito?.textContent).toContain('#502');
  });

  it('muestra el detail del backend ante un 403', () => {
    seleccionarPaciente();
    seleccionarConsulta();
    completarFormulario();
    enviarFormulario();

    httpMock
      .expectOne(diagnosticosUrl)
      .flush(
        { detail: 'La consulta clínica pertenece a otro oftalmólogo' },
        { status: 403, statusText: 'Forbidden' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'La consulta clínica pertenece a otro oftalmólogo',
    );
    // No se muestra el panel de éxito.
    expect(fixture.nativeElement.querySelector('.diagnostico-exito')).toBeNull();
  });

  it('evita el doble submit mientras se envía', () => {
    seleccionarPaciente();
    seleccionarConsulta();
    completarFormulario();

    enviarFormulario();
    enviarFormulario();

    const peticiones = httpMock.match((r) => r.url === diagnosticosUrl);
    expect(peticiones.length).toBe(1);

    peticiones[0].flush(diagnosticoCreado, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.diagnostico-exito')).toBeTruthy();
  });
});
