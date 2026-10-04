import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../../environments/environment';
import { RegistrarTratamientosRecetas } from './registrar-tratamientos-recetas';

describe('RegistrarTratamientosRecetas (CU17)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<RegistrarTratamientosRecetas>;

  const apiUrl = environment.apiUrl;
  const pacientesUrl = `${apiUrl}/pacientes`;
  const menuUrl = `${apiUrl}/seguridad/menu`;
  const consultasUrl = `${apiUrl}/historial-clinico/consultas`;

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
    cita_id: null,
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

  const tratamientoExistente = {
    id: 1,
    consulta_clinica_id: 900,
    descripcion: 'Lubricante ocular',
    observaciones: 'Aplicar de noche',
    fecha_inicio: '2026-10-01',
    fecha_fin: '2026-10-30',
    estado: true,
  };

  const indicacionExistente = {
    id: 2,
    consulta_clinica_id: 900,
    descripcion: 'No frotarse los ojos',
    fecha_registro: '2026-10-03T10:00:00',
  };

  const recetaExistente = {
    id: 3,
    consulta_clinica_id: 900,
    observaciones: 'Ojo derecho',
    fecha_emision: '2026-10-03T10:00:00',
    estado: true,
    detalles: [
      {
        id: 30,
        receta_id: 3,
        medicamento: 'Tobramicina',
        presentacion: null,
        dosis: '1 gota',
        frecuencia: 'Cada 8 horas',
        duracion: '7 días',
        indicaciones: null,
      },
    ],
  };

  beforeEach(async () => {
    localStorage.setItem('access_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [RegistrarTratamientosRecetas],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegistrarTratamientosRecetas);
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

  function escribir(
    campo: HTMLInputElement | HTMLTextAreaElement,
    valor: string,
  ): void {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function campo(panelId: string, selector: string): HTMLInputElement | HTMLTextAreaElement {
    const elemento = fixture.nativeElement.querySelector(
      `#${panelId} ${selector}`,
    ) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!elemento) {
      throw new Error(`No se encontró ${selector} en #${panelId}`);
    }
    return elemento;
  }

  function formularioDe(panelId: string): HTMLFormElement {
    const form = fixture.nativeElement.querySelector(
      `#${panelId} form`,
    ) as HTMLFormElement | null;
    if (!form) {
      throw new Error(`No se encontró el formulario del panel #${panelId}`);
    }
    return form;
  }

  function enviar(form: HTMLFormElement): void {
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function textoCuerpo(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function elegirPaciente(indice = 0): void {
    const botones = fixture.nativeElement.querySelectorAll(
      '.cu17-paciente',
    ) as NodeListOf<HTMLButtonElement>;
    botones[indice].click();
    fixture.detectChanges();
  }

  function responderHistorial(
    pacienteId: number,
    paciente: unknown,
    antecedentes: unknown[] = [],
  ): void {
    httpMock.expectOne(`${apiUrl}/historial-clinico/${pacienteId}`).flush({
      paciente,
      historial: {
        id: 10,
        fecha_apertura: '2026-01-02',
        observaciones_generales: null,
        antecedentes,
      },
    });
    fixture.detectChanges();
  }

  function responderConsultas(consultas: unknown[], pacienteId: number): void {
    httpMock
      .expectOne(
        (r) => r.url === consultasUrl && r.params.get('paciente_id') === String(pacienteId),
      )
      .flush(consultas);
    fixture.detectChanges();
  }

  function elegirConsulta(indice = 0): void {
    const botones = fixture.nativeElement.querySelectorAll(
      '.cu17-consulta button',
    ) as NodeListOf<HTMLButtonElement>;
    botones[indice].click();
    fixture.detectChanges();
  }

  interface RespuestasSecciones {
    diagnosticos?: unknown[];
    tratamientos?: unknown[];
    indicaciones?: unknown[];
    recetas?: unknown[];
    errorDiagnosticos?: number;
    errorTratamientos?: number;
    errorIndicaciones?: number;
    errorRecetas?: number;
  }

  function responderSecciones(
    consultaId: number,
    respuestas: RespuestasSecciones = {},
  ): void {
    const {
      diagnosticos = [],
      tratamientos = [],
      indicaciones = [],
      recetas = [],
      errorDiagnosticos,
      errorTratamientos,
      errorIndicaciones,
      errorRecetas,
    } = respuestas;

    const solicitudes: Array<[string, unknown[], number | undefined, string]> = [
      ['diagnosticos', diagnosticos, errorDiagnosticos, 'Error al cargar diagnósticos'],
      ['tratamientos', tratamientos, errorTratamientos, 'Error al cargar tratamientos'],
      ['indicaciones', indicaciones, errorIndicaciones, 'Error al cargar indicaciones'],
      ['recetas', recetas, errorRecetas, 'Error al cargar recetas'],
    ];

    for (const [recurso, cuerpo, estadoError, detalle] of solicitudes) {
      const req = httpMock.expectOne(`${consultasUrl}/${consultaId}/${recurso}`);
      if (estadoError) {
        req.flush({ detail: detalle }, { status: estadoError, statusText: 'Error' });
      } else {
        req.flush(cuerpo);
      }
    }

    fixture.detectChanges();
  }

  function conConsultaSeleccionada(consultaId = 900): void {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente, consultaAntigua], 1);
    elegirConsulta(0);
    responderSecciones(consultaId, {
      diagnosticos: [diagnosticoCatarata],
      tratamientos: [tratamientoExistente],
      indicaciones: [indicacionExistente],
      recetas: [recetaExistente],
    });
  }

  // --- Pacientes ----------------------------------------------------------

  it('carga la lista de pacientes al iniciar y muestra el estado sin selección', () => {
    expect(fixture.nativeElement.querySelectorAll('.cu17-paciente').length).toBe(2);
    expect(textoCuerpo()).toContain('Juan Quispe');
    expect(textoCuerpo()).toContain('Ningún paciente seleccionado');
  });

  it('filtra pacientes por nombre o CI', () => {
    const buscador = fixture.nativeElement.querySelector(
      '.cu17-busqueda input',
    ) as HTMLInputElement;

    escribir(buscador, 'Ríos');
    expect(fixture.nativeElement.querySelectorAll('.cu17-paciente').length).toBe(1);
    expect(textoCuerpo()).toContain('Ana Ríos');

    escribir(buscador, '1234567');
    expect(fixture.nativeElement.querySelectorAll('.cu17-paciente').length).toBe(1);
    expect(textoCuerpo()).toContain('Juan Quispe');
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

    expect(fixture.nativeElement.querySelectorAll('.cu17-consulta').length).toBe(2);
    expect(textoCuerpo()).toContain('Visión borrosa');
    expect(textoCuerpo()).toContain('Control de rutina');
  });

  it('ordena las consultas de la más reciente a la más antigua', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaAntigua, consultaReciente], 1);

    const fechas = Array.from(
      fixture.nativeElement.querySelectorAll('.cu17-consulta__fecha'),
    ).map((nodo) => (nodo as HTMLElement).textContent?.trim() ?? '');

    expect(fechas[0]).toContain('oct');
    expect(fechas[1]).toContain('ago');
  });

  // --- Selección de consulta ----------------------------------------------

  it('no habilita las secciones hasta seleccionar una consulta', () => {
    expect(fixture.nativeElement.querySelector('.cu17-tabs')).toBeNull();

    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    expect(fixture.nativeElement.querySelector('.cu17-tabs')).toBeNull();

    elegirConsulta(0);
    expect(fixture.nativeElement.querySelectorAll('.cu17-tabs__tab').length).toBe(3);

    // Se resuelven las peticiones disparadas por la selección de la consulta.
    responderSecciones(900, {});
  });

  it('al seleccionar una consulta carga diagnósticos y las tres secciones por separado', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    elegirConsulta(0);

    const reqDiagnosticos = httpMock.expectOne(`${consultasUrl}/900/diagnosticos`);
    const reqTratamientos = httpMock.expectOne(`${consultasUrl}/900/tratamientos`);
    const reqIndicaciones = httpMock.expectOne(`${consultasUrl}/900/indicaciones`);
    const reqRecetas = httpMock.expectOne(`${consultasUrl}/900/recetas`);

    expect(reqDiagnosticos.request.method).toBe('GET');
    expect(reqTratamientos.request.method).toBe('GET');
    expect(reqIndicaciones.request.method).toBe('GET');
    expect(reqRecetas.request.method).toBe('GET');

    reqDiagnosticos.flush([diagnosticoCatarata]);
    reqTratamientos.flush([tratamientoExistente]);
    reqIndicaciones.flush([indicacionExistente]);
    reqRecetas.flush([recetaExistente]);
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Catarata');
    expect(textoCuerpo()).toContain('Lubricante ocular');
    expect(textoCuerpo()).toContain('No frotarse los ojos');
    expect(textoCuerpo()).toContain('Receta #3');
  });

  it('muestra el contexto clínico compacto de la consulta seleccionada', () => {
    conConsultaSeleccionada();

    const contexto = fixture.nativeElement.querySelector('.contexto') as HTMLElement;
    expect(contexto).toBeTruthy();
    expect(contexto.textContent).toContain('Juan Quispe');
    expect(contexto.textContent).toContain('Ana Pérez');
    expect(contexto.textContent).toContain('Visión borrosa');
    expect(contexto.textContent).toContain('Cita #44');
    expect(contexto.textContent).toContain('Catarata');
  });

  it('permite alternar entre las secciones con los tabs', () => {
    conConsultaSeleccionada();

    const tabs = fixture.nativeElement.querySelectorAll(
      '.cu17-tabs__tab',
    ) as NodeListOf<HTMLButtonElement>;

    tabs[2].click();
    fixture.detectChanges();

    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    const panelRecetas = fixture.nativeElement.querySelector(
      '#cu17-panel-recetas',
    ) as HTMLElement;
    expect(panelRecetas.hasAttribute('hidden')).toBe(false);
  });

  // --- Tratamientos -------------------------------------------------------

  it('no registra un tratamiento sin descripción', () => {
    conConsultaSeleccionada();

    const form = formularioDe('cu17-panel-tratamientos');
    const boton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    enviar(form);

    expect(httpMock.match((r) => r.url === `${consultasUrl}/900/tratamientos`).length).toBe(0);
    expect(textoCuerpo()).toContain('Revisa los datos del tratamiento antes de continuar.');
  });

  it('rechaza un tratamiento con fecha de fin anterior a la de inicio', () => {
    conConsultaSeleccionada();

    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="descripcion"]'),
      'Tratamiento con fechas inválidas',
    );
    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="fecha_inicio"]'),
      '2026-10-10',
    );
    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="fecha_fin"]'),
      '2026-10-01',
    );

    expect(textoCuerpo()).toContain(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
    );

    enviar(formularioDe('cu17-panel-tratamientos'));
    expect(httpMock.match((r) => r.url === `${consultasUrl}/900/tratamientos`).length).toBe(0);
  });

  it('registra un tratamiento, lo añade al listado y limpia el formulario', () => {
    conConsultaSeleccionada();

    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="descripcion"]'),
      '  Atropina 1%  ',
    );
    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="fecha_inicio"]'),
      '2026-10-05',
    );
    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="fecha_fin"]'),
      '2026-10-20',
    );
    escribir(
      campo('cu17-panel-tratamientos', 'textarea[formControlName="observaciones"]'),
      'Una vez al día',
    );

    enviar(formularioDe('cu17-panel-tratamientos'));

    const req = httpMock.expectOne(`${consultasUrl}/900/tratamientos`);
    expect(req.request.method).toBe('POST');

    const body = req.request.body as Record<string, unknown>;
    expect(body).toEqual({
      descripcion: 'Atropina 1%',
      observaciones: 'Una vez al día',
      fecha_inicio: '2026-10-05',
      fecha_fin: '2026-10-20',
    });
    expect(body).not.toHaveProperty('estado');
    expect(body).not.toHaveProperty('consulta_clinica_id');

    req.flush(
      {
        id: 9,
        consulta_clinica_id: 900,
        descripcion: 'Atropina 1%',
        observaciones: 'Una vez al día',
        fecha_inicio: '2026-10-05',
        fecha_fin: '2026-10-20',
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Tratamiento registrado correctamente.');
    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-tratamientos .tratamiento').length).toBe(2);

    const descripcion = campo(
      'cu17-panel-tratamientos',
      'input[formControlName="descripcion"]',
    ) as HTMLInputElement;
    expect(descripcion.value).toBe('');
  });

  // --- Indicaciones -------------------------------------------------------

  it('no agrega una indicación vacía', () => {
    conConsultaSeleccionada();

    enviar(formularioDe('cu17-panel-indicaciones'));

    expect(httpMock.match((r) => r.url === `${consultasUrl}/900/indicaciones`).length).toBe(0);
    expect(textoCuerpo()).toContain('La descripción de la indicación es obligatoria.');
  });

  it('agrega una indicación y refresca el listado', () => {
    conConsultaSeleccionada();

    escribir(
      campo('cu17-panel-indicaciones', 'textarea[formControlName="descripcion"]'),
      '  Usar lentes de sol  ',
    );
    enviar(formularioDe('cu17-panel-indicaciones'));

    const req = httpMock.expectOne(`${consultasUrl}/900/indicaciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ descripcion: 'Usar lentes de sol' });
    expect(req.request.body).not.toHaveProperty('fecha_registro');

    req.flush(
      {
        id: 8,
        consulta_clinica_id: 900,
        descripcion: 'Usar lentes de sol',
        fecha_registro: '2026-10-04T09:00:00',
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Indicación agregada correctamente.');
    expect(textoCuerpo()).toContain('Usar lentes de sol');
    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-indicaciones .indicacion').length).toBe(2);
  });

  // --- Recetas ------------------------------------------------------------

  it('la receta comienza con un detalle de medicamento disponible', () => {
    conConsultaSeleccionada();
    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-recetas .cu17-detalle').length).toBe(1);
  });

  it('permite agregar medicamentos a la receta', () => {
    conConsultaSeleccionada();

    const agregar = fixture.nativeElement.querySelector(
      '#cu17-panel-recetas .cu17-btn--borde',
    ) as HTMLButtonElement;
    agregar.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-recetas .cu17-detalle').length).toBe(2);
  });

  it('permite eliminar un detalle antes de guardar', () => {
    conConsultaSeleccionada();

    (fixture.nativeElement.querySelector(
      '#cu17-panel-recetas .cu17-btn--borde',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    const quitar = fixture.nativeElement.querySelectorAll(
      '#cu17-panel-recetas .cu17-detalle__quitar',
    ) as NodeListOf<HTMLButtonElement>;
    quitar[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-recetas .cu17-detalle').length).toBe(1);
  });

  it('no registra la receta sin medicamento', () => {
    conConsultaSeleccionada();

    const form = formularioDe('cu17-panel-recetas');
    const boton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    enviar(form);
    expect(httpMock.match((r) => r.url === `${consultasUrl}/900/recetas`).length).toBe(0);
    expect(textoCuerpo()).toContain('Revisa los medicamentos de la receta.');
  });

  it('no permite guardar una receta sin detalles', () => {
    conConsultaSeleccionada();

    (fixture.nativeElement.querySelector(
      '#cu17-panel-recetas .cu17-detalle__quitar',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-recetas .cu17-detalle').length).toBe(0);

    enviar(formularioDe('cu17-panel-recetas'));
    expect(httpMock.match((r) => r.url === `${consultasUrl}/900/recetas`).length).toBe(0);
    expect(textoCuerpo()).toContain('Agrega al menos un medicamento para registrar la receta.');
  });

  it('registra una receta con varios medicamentos y refresca el listado', () => {
    conConsultaSeleccionada();

    (fixture.nativeElement.querySelector(
      '#cu17-panel-recetas .cu17-btn--borde',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    const medicamentos = fixture.nativeElement.querySelectorAll(
      '#cu17-panel-recetas input[formControlName="medicamento"]',
    ) as NodeListOf<HTMLInputElement>;
    escribir(medicamentos[0], 'Tobramicina');
    escribir(medicamentos[1], 'Lágrimas artificiales');
    escribir(
      campo('cu17-panel-recetas', 'textarea[formControlName="observaciones"]'),
      'Aplicar en ambos ojos',
    );

    enviar(formularioDe('cu17-panel-recetas'));

    const req = httpMock.expectOne(`${consultasUrl}/900/recetas`);
    expect(req.request.method).toBe('POST');

    const body = req.request.body as {
      observaciones: string;
      detalles: Record<string, unknown>[];
    };
    expect(body.observaciones).toBe('Aplicar en ambos ojos');
    expect(body.detalles.length).toBe(2);
    expect(body.detalles[0]['medicamento']).toBe('Tobramicina');
    expect(body.detalles[1]['medicamento']).toBe('Lágrimas artificiales');
    expect(body.detalles[0]).not.toHaveProperty('receta_id');
    expect(body).not.toHaveProperty('fecha_emision');

    req.flush(
      {
        id: 20,
        consulta_clinica_id: 900,
        observaciones: 'Aplicar en ambos ojos',
        fecha_emision: '2026-10-04T09:00:00',
        estado: true,
        detalles: [
          {
            id: 41,
            receta_id: 20,
            medicamento: 'Tobramicina',
            presentacion: null,
            dosis: null,
            frecuencia: null,
            duracion: null,
            indicaciones: null,
          },
          {
            id: 42,
            receta_id: 20,
            medicamento: 'Lágrimas artificiales',
            presentacion: null,
            dosis: null,
            frecuencia: null,
            duracion: null,
            indicaciones: null,
          },
        ],
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Receta registrada correctamente.');
    expect(textoCuerpo()).toContain('Receta #20');
    // El formulario vuelve a su estado inicial con un único detalle.
    expect(fixture.nativeElement.querySelectorAll('#cu17-panel-recetas .cu17-detalle').length).toBe(1);
  });

  // --- Aislamiento de errores ---------------------------------------------

  it('un error al cargar recetas no destruye tratamientos ni indicaciones', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    elegirConsulta(0);
    responderSecciones(900, {
      diagnosticos: [diagnosticoCatarata],
      tratamientos: [tratamientoExistente],
      indicaciones: [indicacionExistente],
      errorRecetas: 500,
    });

    expect(textoCuerpo()).toContain('Lubricante ocular');
    expect(textoCuerpo()).toContain('No frotarse los ojos');
    expect(textoCuerpo()).toContain('Error al cargar recetas');
    expect(
      fixture.nativeElement.querySelectorAll('#cu17-panel-tratamientos .tratamiento').length,
    ).toBe(1);

    // El reintento vuelve a pedir solo las recetas.
    const reintentar = fixture.nativeElement.querySelector(
      '#cu17-panel-recetas .cu17-estado--error button',
    ) as HTMLButtonElement;
    reintentar.click();
    fixture.detectChanges();
    httpMock.expectOne(`${consultasUrl}/900/recetas`).flush([recetaExistente]);
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Receta #3');
  });

  it('un error al cargar diagnósticos no impide registrar tratamientos', () => {
    elegirPaciente(0);
    responderHistorial(1, pacienteJuan);
    responderConsultas([consultaReciente], 1);
    elegirConsulta(0);
    responderSecciones(900, { errorDiagnosticos: 403 });

    expect(textoCuerpo()).toContain('Error al cargar diagnósticos');

    escribir(
      campo('cu17-panel-tratamientos', 'input[formControlName="descripcion"]'),
      'Tratamiento sin diagnóstico',
    );
    enviar(formularioDe('cu17-panel-tratamientos'));

    const req = httpMock.expectOne(`${consultasUrl}/900/tratamientos`);
    expect(req.request.method).toBe('POST');
    req.flush(
      {
        id: 11,
        consulta_clinica_id: 900,
        descripcion: 'Tratamiento sin diagnóstico',
        observaciones: null,
        fecha_inicio: null,
        fecha_fin: null,
        estado: true,
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(textoCuerpo()).toContain('Tratamiento registrado correctamente.');
  });

  it('al cambiar de paciente se limpia la consulta anterior y sus datos', () => {
    conConsultaSeleccionada();
    expect(textoCuerpo()).toContain('Lubricante ocular');

    elegirPaciente(1);
    responderHistorial(2, pacienteAna);
    responderConsultas([], 2);

    expect(textoCuerpo()).not.toContain('Lubricante ocular');
    expect(fixture.nativeElement.querySelectorAll('.cu17-consulta').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.cu17-tabs')).toBeNull();
    expect(textoCuerpo()).toContain(
      'Este paciente no tiene consultas clínicas registradas',
    );
  });
});
