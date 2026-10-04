import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../../environments/environment';
import { RegistrarExamenes } from './registrar-examenes';

describe('RegistrarExamenes (CU18)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<RegistrarExamenes>;

  const apiUrl = environment.apiUrl;
  const pacientesUrl = `${apiUrl}/pacientes`;
  const menuUrl = `${apiUrl}/seguridad/menu`;
  const consultasUrl = `${apiUrl}/historial-clinico/consultas`;
  const examenesUrl = (consultaId: number) => `${consultasUrl}/${consultaId}/examenes`;
  const resultadosUrl = (examenId: number) =>
    `${apiUrl}/historial-clinico/examenes/${examenId}/resultados`;

  const pacienteJuan = {
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

  const pacienteAna = {
    ...pacienteJuan,
    id: 2,
    nombres: 'Ana',
    apellidos: 'Ríos',
    ci: '7654321',
  };

  const consultaReciente = {
    id: 900,
    historial_clinico_id: 10,
    cita_id: 44,
    oftalmologo: {
      id: 2,
      matricula: 'MP-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      especialidad: null,
    },
    fecha_consulta: '2026-10-03T10:00:00',
    motivo_consulta: 'Visión borrosa',
    anamnesis: null,
    observaciones: null,
    estado: true,
  };

  const consultaAntigua = {
    ...consultaReciente,
    id: 700,
    fecha_consulta: '2026-08-01T09:00:00',
    motivo_consulta: 'Control de rutina',
  };

  const diagnosticoCatarata = {
    id: 500,
    consulta_clinica_id: 900,
    nombre: 'Catarata',
    descripcion: null,
    fecha_diagnostico: '2026-10-03T10:30:00',
    estado: true,
  };

  const examenTonometria = {
    id: 850,
    consulta_clinica_id: 900,
    nombre_examen: 'Tonometría',
    fecha_solicitud: '2026-10-03T11:00:00',
    observaciones: 'Ojo derecho e izquierdo',
    estado: true,
  };

  const examenAgudeza = {
    ...examenTonometria,
    id: 860,
    nombre_examen: 'Agudeza visual',
    observaciones: null,
  };

  const resultadoOjoDerecho = {
    id: 950,
    examen_id: 850,
    resultado: 'OD 16 mmHg',
    archivo_url: null,
    fecha_resultado: '2026-10-03T11:30:00',
  };

  const resultadoOjoIzquierdo = {
    ...resultadoOjoDerecho,
    id: 951,
    resultado: 'OI 15 mmHg',
  };

  beforeEach(async () => {
    localStorage.setItem('access_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [RegistrarExamenes],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegistrarExamenes);
    fixture.detectChanges();

    httpMock.match((r) => r.url === menuUrl).forEach((r) => r.flush([]));
    httpMock.expectOne((r) => r.url === pacientesUrl).flush([pacienteJuan, pacienteAna]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
  });

  // --- Helpers ------------------------------------------------------------

  function textoCuerpo(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function escribir(
    elemento: HTMLInputElement | HTMLTextAreaElement,
    valor: string,
  ): void {
    elemento.value = valor;
    elemento.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function campo(selector: string): HTMLInputElement | HTMLTextAreaElement {
    const elemento = fixture.nativeElement.querySelector(
      selector,
    ) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!elemento) {
      throw new Error(`No se encontró ${selector}`);
    }
    return elemento;
  }

  function formularioDe(selector: string): HTMLFormElement {
    const form = campo(selector).closest('form') as HTMLFormElement | null;
    if (!form) {
      throw new Error(`No se encontró el formulario de ${selector}`);
    }
    return form;
  }

  function enviar(form: HTMLFormElement): void {
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function elegirPaciente(indice = 0): void {
    const botones = fixture.nativeElement.querySelectorAll(
      '.cu18-paciente',
    ) as NodeListOf<HTMLButtonElement>;
    botones[indice].click();
    fixture.detectChanges();
  }

  function responderHistorial(pacienteId: number, paciente: unknown): void {
    httpMock.expectOne(`${apiUrl}/historial-clinico/${pacienteId}`).flush({
      paciente,
      historial: {
        id: 10,
        fecha_apertura: '2026-01-02',
        observaciones_generales: null,
        antecedentes: [],
      },
    });
    fixture.detectChanges();
  }

  function responderConsultas(consultas: unknown[], pacienteId = 1): void {
    httpMock
      .expectOne(
        (r) => r.url === consultasUrl && r.params.get('paciente_id') === String(pacienteId),
      )
      .flush(consultas);
    fixture.detectChanges();
  }

  function elegirConsulta(indice = 0): void {
    const botones = fixture.nativeElement.querySelectorAll(
      '.cu18-consulta button',
    ) as NodeListOf<HTMLButtonElement>;
    botones[indice].click();
    fixture.detectChanges();
  }

  function responderDiagnosticos(consultaId: number, diagnosticos: unknown[] = []): void {
    httpMock.expectOne(`${consultasUrl}/${consultaId}/diagnosticos`).flush(diagnosticos);
    fixture.detectChanges();
  }

  function responderExamenes(
    consultaId: number,
    examenes: unknown[] = [],
    status = 200,
  ): void {
    const peticion = httpMock.expectOne(examenesUrl(consultaId));
    if (status >= 400) {
      peticion.flush(
        { detail: 'Error al cargar exámenes' },
        { status, statusText: 'Error' },
      );
    } else {
      peticion.flush(examenes);
    }
    fixture.detectChanges();
  }

  function responderResultados(
    examenId: number,
    resultados: unknown[] = [],
    status = 200,
  ): void {
    const peticion = httpMock.expectOne(resultadosUrl(examenId));
    if (status >= 400) {
      peticion.flush(
        { detail: 'Error al cargar resultados' },
        { status, statusText: 'Error' },
      );
    } else {
      peticion.flush(resultados);
    }
    fixture.detectChanges();
  }

  function conConsultaSeleccionada(
    examenes: unknown[] = [examenTonometria],
    resultadosPorExamen: Record<number, unknown[]> = { 850: [resultadoOjoDerecho] },
  ): void {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente, consultaAntigua], 1);
    elegirConsulta(0);
    responderDiagnosticos(900, [diagnosticoCatarata]);
    responderExamenes(900, examenes);
    for (const [id, resultados] of Object.entries(resultadosPorExamen)) {
      responderResultados(Number(id), resultados);
    }
  }

  function navegadorResultados(): HTMLElement {
    const navegadores = fixture.nativeElement.querySelectorAll(
      'app-registro-navegador',
    ) as NodeListOf<HTMLElement>;
    const encontrado = Array.from(navegadores).find(
      (elemento) => elemento.querySelector('h4')?.textContent?.trim() === 'Resultados',
    );
    if (!encontrado) {
      throw new Error('No se encontró el navegador de resultados');
    }
    return encontrado;
  }

  function botonNavegacion(navegador: HTMLElement, etiqueta: string): HTMLButtonElement {
    const boton = navegador.querySelector(
      `button[aria-label="${etiqueta}"]`,
    ) as HTMLButtonElement | null;
    if (!boton) {
      throw new Error(`No se encontró el botón ${etiqueta}`);
    }
    return boton;
  }

  function navegadorExamenes(): HTMLElement {
    return fixture.nativeElement.querySelector(
      '.cu18-workspace__principal app-registro-navegador',
    ) as HTMLElement;
  }

  // --- Pruebas ------------------------------------------------------------

  it('carga la lista de pacientes al iniciar', () => {
    expect(fixture.nativeElement.querySelectorAll('.cu18-paciente').length).toBe(2);
    expect(textoCuerpo()).toContain('Juan Quispe');
    expect(textoCuerpo()).toContain('Ningún paciente seleccionado');
  });

  it('al seleccionar un paciente carga su historial y sus consultas', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);

    const peticionConsultas = httpMock.expectOne(
      (r) => r.url === consultasUrl && r.params.get('paciente_id') === '1',
    );
    expect(peticionConsultas.request.method).toBe('GET');
    peticionConsultas.flush([consultaReciente, consultaAntigua]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.cu18-consulta').length).toBe(2);
    expect(textoCuerpo()).toContain('Visión borrosa');
    expect(textoCuerpo()).toContain('Control de rutina');
  });

  it('al seleccionar una consulta muestra el contexto y carga los exámenes', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    elegirConsulta(0);

    const peticionExamenes = httpMock.expectOne(examenesUrl(900));
    expect(peticionExamenes.request.method).toBe('GET');
    peticionExamenes.flush([examenTonometria]);
    fixture.detectChanges();
    responderDiagnosticos(900, [diagnosticoCatarata]);
    // El examen seleccionado carga sus resultados automáticamente.
    responderResultados(850);

    // Contexto clínico de la consulta seleccionada.
    const contexto = fixture.nativeElement.querySelector('.contexto') as HTMLElement;
    expect(contexto.textContent).toContain('Juan Quispe');
    expect(contexto.textContent).toContain('Visión borrosa');
    expect(contexto.textContent).toContain('Catarata');

    // Examen de la consulta.
    expect(textoCuerpo()).toContain('Tonometría');
    expect(textoCuerpo()).toContain('Ojo derecho e izquierdo');
  });

  it('muestra un estado vacío cuando la consulta no tiene exámenes', () => {
    conConsultaSeleccionada([], {});
    expect(textoCuerpo()).toContain('Sin exámenes registrados');
    expect(
      fixture.nativeElement.querySelector('.cu18-workspace__principal app-registro-navegador'),
    ).toBeNull();
  });

  it('carga y muestra los resultados del examen seleccionado', () => {
    conConsultaSeleccionada([examenTonometria], {
      850: [resultadoOjoDerecho, resultadoOjoIzquierdo],
    });

    expect(textoCuerpo()).toContain('2 resultados');
    expect(textoCuerpo()).toContain('OD 16 mmHg');
    // Sólo se muestra un resultado a la vez.
    expect(textoCuerpo()).not.toContain('OI 15 mmHg');
  });

  it('registra un examen, refresca la lista y limpia el formulario', () => {
    conConsultaSeleccionada();

    escribir(campo('input[formControlName="nombre_examen"]'), '  Campimetría  ');
    escribir(campo('textarea[formControlName="observaciones"]'), 'Ojo izquierdo');
    enviar(formularioDe('input[formControlName="nombre_examen"]'));

    const req = httpMock.expectOne(examenesUrl(900));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre_examen: 'Campimetría',
      observaciones: 'Ojo izquierdo',
    });

    req.flush(
      {
        id: 870,
        consulta_clinica_id: 900,
        nombre_examen: 'Campimetría',
        fecha_solicitud: '2026-10-04T09:00:00',
        observaciones: 'Ojo izquierdo',
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Examen registrado correctamente.');
    expect(textoCuerpo()).toContain('Campimetría');
    // El nuevo examen queda seleccionado y sin resultados.
    expect(textoCuerpo()).toContain('Sin resultados registrados');
    expect(
      (campo('input[formControlName="nombre_examen"]') as HTMLInputElement).value,
    ).toBe('');
  });

  it('no registra un examen sin nombre', () => {
    conConsultaSeleccionada();

    enviar(formularioDe('input[formControlName="nombre_examen"]'));

    expect(httpMock.match(examenesUrl(900)).length).toBe(0);
    expect(textoCuerpo()).toContain('El nombre del examen es obligatorio.');
  });

  it('envía observaciones en null cuando no se indican', () => {
    conConsultaSeleccionada();

    escribir(campo('input[formControlName="nombre_examen"]'), 'Tonometría de control');
    enviar(formularioDe('input[formControlName="nombre_examen"]'));

    const req = httpMock.expectOne(examenesUrl(900));
    expect(req.request.body).toEqual({
      nombre_examen: 'Tonometría de control',
      observaciones: null,
    });
    req.flush(
      {
        id: 871,
        consulta_clinica_id: 900,
        nombre_examen: 'Tonometría de control',
        fecha_solicitud: '2026-10-04T09:00:00',
        observaciones: null,
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
  });

  it('registra un resultado y lo añade al examen seleccionado', () => {
    conConsultaSeleccionada([examenTonometria], { 850: [] });

    escribir(campo('textarea[formControlName="resultado"]'), '  OD 16 mmHg  ');
    enviar(formularioDe('textarea[formControlName="resultado"]'));

    const req = httpMock.expectOne(resultadosUrl(850));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ resultado: 'OD 16 mmHg', archivo_url: null });

    req.flush(
      {
        id: 950,
        examen_id: 850,
        resultado: 'OD 16 mmHg',
        archivo_url: null,
        fecha_resultado: '2026-10-03T11:30:00',
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Resultado registrado correctamente.');
    expect(textoCuerpo()).toContain('OD 16 mmHg');
    expect(
      (campo('textarea[formControlName="resultado"]') as HTMLTextAreaElement).value,
    ).toBe('');
  });

  it('no registra un resultado vacío', () => {
    conConsultaSeleccionada([examenTonometria], { 850: [] });

    enviar(formularioDe('textarea[formControlName="resultado"]'));

    expect(httpMock.match(resultadosUrl(850)).length).toBe(0);
    expect(textoCuerpo()).toContain('El resultado es obligatorio.');
  });

  it('envía la URL del archivo cuando se indica', () => {
    conConsultaSeleccionada([examenTonometria], { 850: [] });

    escribir(campo('textarea[formControlName="resultado"]'), 'Agudeza OD 20/40');
    escribir(
      campo('input[formControlName="archivo_url"]'),
      'https://ejemplo.test/od.pdf',
    );
    enviar(formularioDe('textarea[formControlName="resultado"]'));

    const req = httpMock.expectOne(resultadosUrl(850));
    expect(req.request.body).toEqual({
      resultado: 'Agudeza OD 20/40',
      archivo_url: 'https://ejemplo.test/od.pdf',
    });

    req.flush(
      {
        id: 960,
        examen_id: 850,
        resultado: 'Agudeza OD 20/40',
        archivo_url: 'https://ejemplo.test/od.pdf',
        fecha_resultado: '2026-10-03T12:00:00',
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('od.pdf');
  });

  it('omite el archivo cuando el resultado no tiene URL', () => {
    conConsultaSeleccionada([examenTonometria], { 850: [resultadoOjoDerecho] });

    expect(textoCuerpo()).toContain('OD 16 mmHg');
    expect(fixture.nativeElement.querySelector('.resultado__archivo')).toBeNull();
  });

  it('permite navegar entre los exámenes de la consulta', () => {
    conConsultaSeleccionada([examenTonometria, examenAgudeza], {
      850: [resultadoOjoDerecho],
    });

    let navegador = navegadorExamenes();
    expect(navegador.querySelector('.registro-navegador__contador')?.textContent).toContain(
      '1 / 2',
    );
    expect(textoCuerpo()).toContain('Tonometría');
    expect(botonNavegacion(navegador, 'Anterior').disabled).toBe(true);

    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();
    // Al cambiar de examen se piden sus resultados.
    responderResultados(860, []);

    navegador = navegadorExamenes();
    expect(navegador.querySelector('.registro-navegador__contador')?.textContent).toContain(
      '2 / 2',
    );
    expect(textoCuerpo()).toContain('Agudeza visual');

    botonNavegacion(navegador, 'Anterior').click();
    fixture.detectChanges();
    expect(textoCuerpo()).toContain('Tonometría');
    expect(textoCuerpo()).toContain('OD 16 mmHg');
  });

  it('permite navegar entre los resultados de un examen', () => {
    conConsultaSeleccionada([examenTonometria], {
      850: [resultadoOjoDerecho, resultadoOjoIzquierdo],
    });

    let navegador = navegadorResultados();
    expect(navegador.querySelectorAll('.resultado').length).toBe(1);
    expect(botonNavegacion(navegador, 'Anterior').disabled).toBe(true);

    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();

    navegador = navegadorResultados();
    expect(navegador.textContent).toContain('OI 15 mmHg');
    expect(botonNavegacion(navegador, 'Siguiente').disabled).toBe(true);
  });

  it('deshabilita registrar resultado cuando no hay examen seleccionado', () => {
    conConsultaSeleccionada([], {});

    const boton = formularioDe('textarea[formControlName="resultado"]').querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });

  it('un error al cargar resultados no destruye la pantalla y se puede reintentar', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    elegirConsulta(0);
    responderDiagnosticos(900, [diagnosticoCatarata]);
    responderExamenes(900, [examenTonometria]);
    responderResultados(850, [], 500);

    expect(textoCuerpo()).toContain('Error al cargar resultados');
    expect(textoCuerpo()).toContain('Tonometría');

    const reintentar = fixture.nativeElement.querySelector(
      '.examen-card__reintentar',
    ) as HTMLButtonElement;
    expect(reintentar).toBeTruthy();

    reintentar.click();
    fixture.detectChanges();
    responderResultados(850, [resultadoOjoDerecho]);

    expect(textoCuerpo()).not.toContain('Error al cargar resultados');
    expect(textoCuerpo()).toContain('OD 16 mmHg');
  });

  it('un error al cargar exámenes no destruye el contexto de la consulta', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    elegirConsulta(0);
    responderDiagnosticos(900, [diagnosticoCatarata]);
    responderExamenes(900, [], 500);

    expect(textoCuerpo()).toContain('Error al cargar exámenes');
    // El contexto clínico sigue visible.
    const contexto = fixture.nativeElement.querySelector('.contexto') as HTMLElement;
    expect(contexto.textContent).toContain('Juan Quispe');
    expect(contexto.textContent).toContain('Catarata');
  });

  it('al cambiar de consulta se limpian los exámenes anteriores', () => {
    conConsultaSeleccionada();
    expect(textoCuerpo()).toContain('Tonometría');

    // Se vuelve a la lista para poder elegir otra consulta.
    (
      fixture.nativeElement.querySelector(
        '.cu18-panel--detalle .cu18-panel__accion',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    elegirConsulta(1);
    responderDiagnosticos(700, []);
    responderExamenes(700, []);

    expect(textoCuerpo()).not.toContain('Tonometría');
    expect(textoCuerpo()).toContain('Sin exámenes registrados');
  });
});
