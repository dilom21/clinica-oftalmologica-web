import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../../environments/environment';
import { ConsultarHistorialClinico } from './consultar-historial-clinico';
import { SeguimientoControles } from '../../../cu19-programar-controles-medicos/components/seguimiento-controles/seguimiento-controles';

@Component({
  selector: 'app-seguimiento-controles',
  template: '',
})
class SeguimientoControlesStub {
  @Input({ required: true }) pacienteId!: number;
}

describe('ConsultarHistorialClinico (CU13)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<ConsultarHistorialClinico>;

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

  const pacienteAna = { ...pacienteJuan, id: 2, nombres: 'Ana', apellidos: 'Ríos', ci: '7654321' };

  function historialDe(paciente: typeof pacienteJuan, antecedentes: unknown[] = []) {
    return {
      paciente,
      historial: {
        id: 10,
        fecha_apertura: '2026-01-02',
        observaciones_generales: 'Sin alergias conocidas',
        antecedentes,
      },
    };
  }

  const antecedente = {
    id: 100,
    tipo: 'ALERGIA',
    descripcion: 'Penicilina',
    fecha_registro: '2026-01-03',
  };

  const consultaReciente = {
    id: 900,
    historial_clinico_id: 10,
    cita_id: null,
    oftalmologo: { id: 2, matricula: 'MP-1', nombres: 'Ana', apellidos: 'Pérez', especialidad: null },
    fecha_consulta: '2026-10-03T10:00:00',
    motivo_consulta: 'Visión borrosa y cansancio visual',
    anamnesis: 'Paciente refiere visión borrosa.',
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
    descripcion: 'Pruebas',
    fecha_diagnostico: '2026-10-03T10:30:00',
    estado: true,
  };

  const tratamientoLubricante = {
    id: 601,
    consulta_clinica_id: 900,
    descripcion: 'Lubricante ocular',
    observaciones: 'Aplicar de noche',
    fecha_inicio: '2026-10-01',
    fecha_fin: '2026-10-30',
    estado: true,
  };

  const indicacionReposo = {
    id: 701,
    consulta_clinica_id: 900,
    descripcion: 'Evitar esfuerzo visual prolongado',
    fecha_registro: '2026-10-03T10:15:00',
  };

  const indicacionesMultiples = [
    indicacionReposo,
    { ...indicacionReposo, id: 702, descripcion: 'Usar lágrimas artificiales' },
    { ...indicacionReposo, id: 703, descripcion: 'Control en siete días' },
    { ...indicacionReposo, id: 704, descripcion: 'Evitar exposición al polvo' },
  ];

  const recetaTobramicina = {
    id: 801,
    consulta_clinica_id: 900,
    observaciones: 'Aplicar en el ojo derecho',
    fecha_emision: '2026-10-03T10:20:00',
    estado: true,
    detalles: [
      {
        id: 901,
        receta_id: 801,
        medicamento: 'Tobramicina',
        presentacion: 'Solución oftálmica 0.3%',
        dosis: '1 gota',
        frecuencia: 'Cada 8 horas',
        duracion: '7 días',
        indicaciones: 'No suspender antes del alta',
      },
    ],
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

  const diagnosticoGlaucoma = {
    ...diagnosticoCatarata,
    id: 501,
    nombre: 'Glaucoma',
  };

  const tratamientoControl = {
    ...tratamientoLubricante,
    id: 602,
    descripcion: 'Control de presión intraocular',
  };

  const recetaLatanoprost = {
    ...recetaTobramicina,
    id: 802,
    observaciones: 'Aplicar por la noche',
    detalles: recetaTobramicina.detalles.map((detalle) => ({
      ...detalle,
      id: 902,
      receta_id: 802,
      medicamento: 'Latanoprost',
    })),
  };

  beforeEach(async () => {
    localStorage.setItem('access_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [ConsultarHistorialClinico],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    })
      .overrideComponent(ConsultarHistorialClinico, {
        remove: { imports: [SeguimientoControles] },
        add: { imports: [SeguimientoControlesStub] },
      })
      .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConsultarHistorialClinico);
    fixture.detectChanges();

    httpMock.match((r) => r.url === menuUrl).forEach((r) => r.flush([]));
    httpMock.expectOne((r) => r.url === pacientesUrl).flush([pacienteJuan, pacienteAna]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
  });

  // --- Helpers -----------------------------------------------------------

  function seleccionarPaciente(indice: number): void {
    const botones = fixture.nativeElement.querySelectorAll(
      '.selector__paciente',
    ) as NodeListOf<HTMLButtonElement>;
    botones[indice].click();
    fixture.detectChanges();
  }

  function irATab(indice: number): void {
    const tabs = fixture.nativeElement.querySelectorAll(
      '.tabs__tab',
    ) as NodeListOf<HTMLButtonElement>;
    tabs[indice].click();
    fixture.detectChanges();
  }

  function responderHistorial(pacienteId: number, respuesta: object): void {
    httpMock
      .expectOne((r) => r.url === `${apiUrl}/historial-clinico/${pacienteId}`)
      .flush(respuesta);
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

  type RecursoSpec =
    | 'diagnosticos'
    | 'tratamientos'
    | 'indicaciones'
    | 'recetas'
    | 'examenes';

  const ETIQUETA_RECURSO: Record<RecursoSpec, string> = {
    diagnosticos: 'Error al cargar diagnósticos',
    tratamientos: 'Error al cargar tratamientos',
    indicaciones: 'Error al cargar indicaciones',
    recetas: 'Error al cargar recetas',
    examenes: 'Error al cargar exámenes',
  };

  /**
   * Resuelve los registros clínicos de una consulta. La pantalla pide los cuatro
   * recursos (diagnósticos CU16 + CU17) en paralelo, por lo que el helper los
   * responde siempre. `errores` permite forzar el fallo de recursos concretos.
   */
  function responderRegistros(
    consultaId: number,
    datos: {
      diagnosticos?: unknown[];
      tratamientos?: unknown[];
      indicaciones?: unknown[];
      recetas?: unknown[];
      examenes?: unknown[];
      status?: number;
      errores?: Partial<Record<RecursoSpec, number>>;
    } = {},
  ): void {
    const {
      diagnosticos = [],
      tratamientos = [],
      indicaciones = [],
      recetas = [],
      examenes = [],
      status = 200,
      errores = {},
    } = datos;

    const recursos: ReadonlyArray<[RecursoSpec, unknown[]]> = [
      ['diagnosticos', diagnosticos],
      ['tratamientos', tratamientos],
      ['indicaciones', indicaciones],
      ['recetas', recetas],
      ['examenes', examenes],
    ];

    for (const [recurso, cuerpo] of recursos) {
      const peticion = httpMock.expectOne(
        (r) => r.url === `${consultasUrl}/${consultaId}/${recurso}`,
      );
      const estado = errores[recurso] ?? status;
      if (estado >= 400) {
        peticion.flush({ detail: ETIQUETA_RECURSO[recurso] }, {
          status: estado,
          statusText: 'Error',
        });
      } else {
        peticion.flush(cuerpo);
      }
    }

    fixture.detectChanges();
  }

  function responderDiagnosticos(
    consultaId: number,
    diagnosticos: unknown[],
    status = 200,
  ): void {
    responderRegistros(consultaId, { diagnosticos, status });
  }

  /** Responde los resultados (CU18) de un examen concreto. */
  function responderResultados(
    examenId: number,
    resultados: unknown[] = [],
    status = 200,
  ): void {
    const peticion = httpMock.expectOne(
      (r) => r.url === `${apiUrl}/historial-clinico/examenes/${examenId}/resultados`,
    );
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

  /** Selecciona el primer paciente resolviendo historial, consultas y registros. */
  function seleccionarJuanConDatos(
    consultas: unknown[] = [consultaReciente, consultaAntigua],
    registrosPorConsulta: Record<
      number,
      {
        diagnosticos?: unknown[];
        tratamientos?: unknown[];
        indicaciones?: unknown[];
        recetas?: unknown[];
      }
    > = {
      900: {
        diagnosticos: [diagnosticoCatarata],
        tratamientos: [tratamientoLubricante],
        indicaciones: [indicacionReposo],
        recetas: [recetaTobramicina],
      },
      700: {},
    },
  ): void {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas(consultas, 1);
    for (const [id, datos] of Object.entries(registrosPorConsulta)) {
      responderRegistros(Number(id), datos);
    }
  }

  function textoCuerpo(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function tarjetasConsulta(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll('.consulta-card');
  }

  function abrirDetalleConsulta(indice: number): void {
    const tarjeta = tarjetasConsulta()[indice];
    (tarjeta.querySelector('.consulta-card__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function detalleConsulta(indice: number): HTMLElement {
    return tarjetasConsulta()[indice].querySelector(
      '.consulta-card__detalle',
    ) as HTMLElement;
  }

  /** Activa una sección de la navegación clínica secundaria. */
  function irASeccion(indice: number, etiqueta: string): void {
    const detalle = detalleConsulta(indice);
    const tabs = detalle.querySelectorAll(
      '.navegacion-clinica__tab',
    ) as NodeListOf<HTMLButtonElement>;
    const tab = Array.from(tabs).find((boton) =>
      (boton.textContent ?? '').trim().startsWith(etiqueta),
    );
    if (!tab) {
      throw new Error(`No se encontró la sección ${etiqueta}`);
    }
    tab.click();
    fixture.detectChanges();
  }

  /** Etiquetas de las secciones visibles en la navegación secundaria. */
  function etiquetasSecciones(indice: number): string[] {
    return Array.from(
      detalleConsulta(indice).querySelectorAll('.navegacion-clinica__tab'),
    ).map((tab) => (tab.textContent ?? '').trim());
  }

  function navegadorDe(detalle: HTMLElement, etiqueta: string): HTMLElement {
    const navegadores = Array.from(
      detalle.querySelectorAll('app-registro-navegador'),
    ) as HTMLElement[];
    const navegador = navegadores.find(
      (elemento) => elemento.querySelector('h4')?.textContent?.trim() === etiqueta,
    );
    if (!navegador) {
      throw new Error(`No se encontró el navegador de ${etiqueta}`);
    }
    return navegador;
  }

  function botonNavegacion(
    navegador: HTMLElement,
    etiqueta: 'Anterior' | 'Siguiente',
  ): HTMLButtonElement {
    return navegador.querySelector(
      `button[aria-label="${etiqueta}"]`,
    ) as HTMLButtonElement;
  }

  // --- Pruebas -----------------------------------------------------------

  it('carga la lista de pacientes al iniciar (CU13 existente)', () => {
    const botones = fixture.nativeElement.querySelectorAll('.selector__paciente');
    expect(botones.length).toBe(2);
    expect(textoCuerpo()).toContain('Juan Quispe');
    expect(textoCuerpo()).toContain('CI 1234567');
  });

  it('renders one controls follow-up bound to the selected patient', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan));
    responderConsultas([], 1);

    const seguimiento = fixture.debugElement.query(By.directive(SeguimientoControlesStub));
    expect(seguimiento?.componentInstance.pacienteId).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('app-seguimiento-controles').length).toBe(1);
  });

  it('al seleccionar un paciente carga su historial y sus consultas', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));

    const peticionConsultas = httpMock.expectOne((r) => r.url === consultasUrl);
    expect(peticionConsultas.request.method).toBe('GET');
    expect(peticionConsultas.request.params.get('paciente_id')).toBe('1');
    peticionConsultas.flush([consultaReciente, consultaAntigua]);
    fixture.detectChanges();

    responderDiagnosticos(900, [diagnosticoCatarata]);
    responderDiagnosticos(700, []);

    expect(fixture.nativeElement.querySelector('.paciente-card__nombre')?.textContent).toContain(
      'Juan',
    );

    irATab(1);
    const tarjetas = fixture.nativeElement.querySelectorAll('.consulta-card');
    expect(tarjetas.length).toBe(2);
  });

  it('ordena las consultas de más reciente a más antigua', () => {
    seleccionarJuanConDatos();
    irATab(1);

    const tarjetas = fixture.nativeElement.querySelectorAll(
      '.consulta-card',
    ) as NodeListOf<HTMLElement>;
    expect(tarjetas[0].textContent).toContain('Visión borrosa y cansancio visual');
    expect(tarjetas[1].textContent).toContain('Control de rutina');
    // El badge del tab muestra el total de consultas.
    expect(fixture.nativeElement.querySelector('.tabs__badge')?.textContent).toContain('2');
  });

  it('carga los diagnósticos de cada consulta', () => {
    seleccionarJuanConDatos();

    const nodos = fixture.nativeElement.querySelectorAll(
      '.consulta-card__diagnostico-nombre',
    ) as NodeListOf<HTMLElement>;
    const nombres = Array.from(nodos).map((nodo) => nodo.textContent?.trim());
    expect(nombres).toContain('Catarata');
  });

  it('muestra un estado vacío cuando el paciente no tiene consultas', () => {
    seleccionarPaciente(1);
    responderHistorial(2, historialDe(pacienteAna));
    responderConsultas([], 2);

    expect(fixture.nativeElement.querySelector('.paciente-card__nombre')?.textContent).toContain(
      'Ana',
    );
    irATab(1);
    expect(textoCuerpo()).toContain('Sin consultas clínicas registradas');
  });

  it('muestra un estado vacío cuando una consulta no tiene diagnósticos', () => {
    seleccionarJuanConDatos();
    irATab(1);

    const primeraTarjeta = (
      fixture.nativeElement.querySelectorAll('.consulta-card') as NodeListOf<HTMLElement>
    )[1];
    (primeraTarjeta.querySelector('.consulta-card__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const tarjeta = (
      fixture.nativeElement.querySelectorAll('.consulta-card') as NodeListOf<HTMLElement>
    )[1];
    expect(tarjeta.querySelector('.consulta-card__detalle')?.textContent).toContain(
      'Sin diagnósticos registrados',
    );
  });

  it('un error al cargar diagnósticos no inutiliza el resto del historial', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente, consultaAntigua], 1);
    responderDiagnosticos(900, [], 500);
    responderDiagnosticos(700, [diagnosticoCatarata]);

    irATab(1);

    // La consulta con error muestra su estado en el encabezado compacto.
    let tarjetas = fixture.nativeElement.querySelectorAll(
      '.consulta-card',
    ) as NodeListOf<HTMLElement>;
    expect(tarjetas[0].textContent).toContain('No disponible');

    // Al expandir, aparece el mensaje y la acción de reintento.
    (tarjetas[0].querySelector('.consulta-card__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    tarjetas = fixture.nativeElement.querySelectorAll(
      '.consulta-card',
    ) as NodeListOf<HTMLElement>;
    // El mensaje mostrado es el `detail` devuelto por el backend.
    expect(tarjetas[0].textContent).toContain('Error al cargar diagnósticos');
    expect(tarjetas[0].querySelector('.consulta-card__reintentar')).toBeTruthy();

    // La otra consulta conserva sus diagnósticos cargados.
    expect(tarjetas[1].textContent).toContain('Catarata');

    // El historial y las métricas siguen visibles.
    expect(fixture.nativeElement.querySelector('.paciente-card')).toBeTruthy();
    const nodos = fixture.nativeElement.querySelectorAll(
      '.metricas__valor',
    ) as NodeListOf<HTMLElement>;
    const valores = Array.from(nodos).map((nodo) => nodo.textContent?.trim());
    expect(valores[1]).toBe('1');
  });

  it('al cambiar de paciente se limpia el estado anterior', () => {
    seleccionarJuanConDatos();
    irATab(1);
    expect(textoCuerpo()).toContain('Catarata');

    seleccionarPaciente(1);
    responderHistorial(2, historialDe(pacienteAna));
    responderConsultas([], 2);

    expect(textoCuerpo()).not.toContain('Catarata');
    expect(fixture.nativeElement.querySelector('.paciente-card__nombre')?.textContent).toContain(
      'Ana',
    );
    // Vuelve al tab Resumen y no quedan consultas del paciente previo.
    expect(
      fixture.nativeElement.querySelector('.tabs__tab--activa')?.textContent,
    ).toContain('Resumen');
    expect(fixture.nativeElement.querySelectorAll('.consulta-card').length).toBe(0);
  });

  it('las métricas resumen consultas, diagnósticos y antecedentes', () => {
    seleccionarJuanConDatos();

    expect(fixture.nativeElement.querySelectorAll('.metricas__item').length).toBe(4);
    const nodos = fixture.nativeElement.querySelectorAll(
      '.metricas__valor',
    ) as NodeListOf<HTMLElement>;
    const valores = Array.from(nodos).map((nodo) => nodo.textContent?.trim());
    expect(valores[0]).toBe('2'); // consultas
    expect(valores[1]).toBe('1'); // diagnósticos
    expect(valores[2]).toBe('1'); // antecedentes
  });

  it('muestra los antecedentes como tarjetas y su estado vacío cuando no hay', () => {
    seleccionarJuanConDatos();
    irATab(2);
    expect(fixture.nativeElement.querySelectorAll('.antecedente').length).toBe(1);
    expect(textoCuerpo()).toContain('ALERGIA');
    expect(textoCuerpo()).toContain('Penicilina');

    seleccionarPaciente(1);
    responderHistorial(2, historialDe(pacienteAna, []));
    responderConsultas([], 2);
    irATab(2);
    expect(textoCuerpo()).toContain('Sin antecedentes clínicos registrados');
  });

  // --- Integración CU17 dentro de CU13 ------------------------------------

  it('muestra los tratamientos registrados de la consulta', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Tratamientos');

    const detalle = detalleConsulta(0);
    expect(detalle.textContent).toContain('Lubricante ocular');
    expect(detalle.textContent).toContain('Aplicar de noche');
    expect(detalle.querySelectorAll('.tratamiento').length).toBe(1);
  });

  it('muestra las indicaciones registradas de la consulta', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    const detalle = detalleConsulta(0);
    expect(detalle.textContent).toContain('Evitar esfuerzo visual prolongado');
    expect(detalle.querySelectorAll('.indicacion').length).toBe(1);
  });

  it('muestra solo una de cuatro indicaciones y permite avanzar y retroceder', () => {
    seleccionarJuanConDatos([consultaReciente], {
      900: { indicaciones: indicacionesMultiples },
    });
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    let navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    expect(navegador.querySelectorAll('.indicacion').length).toBe(1);
    expect(navegador.textContent).toContain('Evitar esfuerzo visual prolongado');
    expect(navegador.textContent).not.toContain('Usar lágrimas artificiales');
    expect(navegador.querySelector('.registro-navegador__contador')?.textContent).toContain(
      '1 / 4',
    );
    expect(botonNavegacion(navegador, 'Anterior').disabled).toBe(true);
    expect(botonNavegacion(navegador, 'Siguiente').disabled).toBe(false);

    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();
    navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    expect(navegador.querySelectorAll('.indicacion').length).toBe(1);
    expect(navegador.textContent).toContain('Usar lágrimas artificiales');
    expect(navegador.textContent).not.toContain('Evitar esfuerzo visual prolongado');
    expect(navegador.querySelector('.registro-navegador__contador')?.textContent).toContain(
      '2 / 4',
    );

    botonNavegacion(navegador, 'Anterior').click();
    fixture.detectChanges();
    navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    expect(navegador.textContent).toContain('Evitar esfuerzo visual prolongado');
    expect(botonNavegacion(navegador, 'Anterior').disabled).toBe(true);
  });

  it('deshabilita siguiente al llegar al último registro', () => {
    seleccionarJuanConDatos([consultaReciente], {
      900: { indicaciones: indicacionesMultiples.slice(0, 2) },
    });
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    let navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();
    navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');

    expect(navegador.querySelector('.registro-navegador__contador')?.textContent).toContain(
      '2 / 2',
    );
    expect(botonNavegacion(navegador, 'Anterior').disabled).toBe(false);
    expect(botonNavegacion(navegador, 'Siguiente').disabled).toBe(true);
  });

  it('mantiene un índice independiente para cada sección clínica', () => {
    seleccionarJuanConDatos([consultaReciente], {
      900: {
        diagnosticos: [diagnosticoCatarata, diagnosticoGlaucoma],
        tratamientos: [tratamientoLubricante, tratamientoControl],
        indicaciones: indicacionesMultiples.slice(0, 2),
        recetas: [recetaTobramicina, recetaLatanoprost],
      },
    });
    irATab(1);
    abrirDetalleConsulta(0);

    const selectoresPorSeccion: ReadonlyArray<[string, string]> = [
      ['Diagnósticos', '.diagnostico-chip'],
      ['Tratamientos', '.tratamiento'],
      ['Indicaciones', '.indicacion'],
      ['Recetas', '.receta'],
    ];

    // Cada sección muestra un único registro a la vez.
    for (const [etiqueta, selector] of selectoresPorSeccion) {
      irASeccion(0, etiqueta);
      expect(
        detalleConsulta(0).querySelectorAll(selector).length,
      ).toBe(1);
    }

    // Se avanza sólo en indicaciones...
    irASeccion(0, 'Indicaciones');
    botonNavegacion(
      navegadorDe(detalleConsulta(0), 'Indicaciones'),
      'Siguiente',
    ).click();
    fixture.detectChanges();
    expect(
      navegadorDe(detalleConsulta(0), 'Indicaciones').querySelector(
        '.registro-navegador__contador',
      )?.textContent,
    ).toContain('2 / 2');

    // ...y el resto conserva su propio índice.
    for (const etiqueta of ['Diagnósticos', 'Tratamientos', 'Recetas']) {
      irASeccion(0, etiqueta);
      expect(
        navegadorDe(detalleConsulta(0), etiqueta).querySelector(
          '.registro-navegador__contador',
        )?.textContent,
      ).toContain('1 / 2');
    }
  });

  it('reinicia los índices al cambiar de consulta y al volver a abrir el detalle', () => {
    seleccionarJuanConDatos(
      [consultaReciente, consultaAntigua],
      {
        900: { indicaciones: indicacionesMultiples.slice(0, 2) },
        700: {
          indicaciones: [
            { ...indicacionReposo, id: 705, consulta_clinica_id: 700 },
            { ...indicacionReposo, id: 706, consulta_clinica_id: 700 },
          ],
        },
      },
    );
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    let navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();
    expect(
      navegadorDe(detalleConsulta(0), 'Indicaciones').querySelector(
        '.registro-navegador__contador',
      )?.textContent,
    ).toContain('2 / 2');

    abrirDetalleConsulta(1);
    irASeccion(1, 'Indicaciones');
    expect(
      navegadorDe(detalleConsulta(1), 'Indicaciones').querySelector(
        '.registro-navegador__contador',
      )?.textContent,
    ).toContain('1 / 2');

    abrirDetalleConsulta(0);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');
    expect(
      navegadorDe(detalleConsulta(0), 'Indicaciones').querySelector(
        '.registro-navegador__contador',
      )?.textContent,
    ).toContain('1 / 2');
  });

  it('omite contador y flechas cuando una sección tiene un solo registro', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    const navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    expect(navegador.querySelectorAll('.indicacion').length).toBe(1);
    expect(navegador.querySelector('.registro-navegador__contador')).toBeNull();
    expect(navegador.querySelector('button[aria-label="Anterior"]')).toBeNull();
    expect(navegador.querySelector('button[aria-label="Siguiente"]')).toBeNull();
  });

  it('conserva el estado vacío sin crear un navegador de indicaciones', () => {
    seleccionarJuanConDatos([consultaReciente], { 900: {} });
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    const detalle = detalleConsulta(0);
    expect(detalle.textContent).toContain('Sin indicaciones registradas');
    const navegadores = Array.from(
      detalle.querySelectorAll('app-registro-navegador'),
    ) as HTMLElement[];
    expect(
      navegadores.some(
        (elemento) => elemento.querySelector('h4')?.textContent?.trim() === 'Indicaciones',
      ),
    ).toBe(false);
  });

  it('mantiene la sección y los índices cuando se recargan los registros', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      indicaciones: indicacionesMultiples.slice(0, 2),
      errores: { recetas: 500 },
    });
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Indicaciones');

    const navegador = navegadorDe(detalleConsulta(0), 'Indicaciones');
    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();
    expect(
      navegadorDe(detalleConsulta(0), 'Indicaciones').querySelector(
        '.registro-navegador__contador',
      )?.textContent,
    ).toContain('2 / 2');

    // El reintento se lanza desde la sección que falló.
    irASeccion(0, 'Recetas');
    const reintentar = detalleConsulta(0).querySelector(
      '.consulta-card__reintentar',
    ) as HTMLButtonElement;
    reintentar.click();
    fixture.detectChanges();
    responderRegistros(900, {
      indicaciones: indicacionesMultiples.slice(0, 2),
      recetas: [recetaTobramicina],
    });

    // Sigue siendo la misma consulta: se conserva la sección y el índice.
    expect(detalleConsulta(0).textContent).toContain('Receta #801');
    irASeccion(0, 'Indicaciones');
    expect(
      navegadorDe(detalleConsulta(0), 'Indicaciones').querySelector(
        '.registro-navegador__contador',
      )?.textContent,
    ).toContain('2 / 2');
  });

  it('muestra las recetas registradas y el detalle de sus medicamentos', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Recetas');

    const detalle = detalleConsulta(0);
    expect(detalle.textContent).toContain('Receta #801');
    expect(detalle.textContent).toContain('1 medicamento');

    const toggle = detalle.querySelector('.receta__toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    fixture.detectChanges();

    const detalleActualizado = detalleConsulta(0);
    expect(detalleActualizado.textContent).toContain('Aplicar en el ojo derecho');
    expect(detalleActualizado.textContent).toContain('Tobramicina');
    expect(detalleActualizado.textContent).toContain('Solución oftálmica 0.3%');
    expect(detalleActualizado.textContent).toContain('Cada 8 horas');
  });

  it('un error al cargar recetas no destruye las demás secciones', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      tratamientos: [tratamientoLubricante],
      indicaciones: [indicacionReposo],
      errores: { recetas: 500 },
    });

    irATab(1);
    abrirDetalleConsulta(0);

    // La sección inicial (Diagnósticos) sigue mostrando datos reales.
    expect(detalleConsulta(0).textContent).toContain('Catarata');

    irASeccion(0, 'Recetas');
    expect(detalleConsulta(0).textContent).toContain('Error al cargar recetas');
    expect(detalleConsulta(0).querySelector('.consulta-card__reintentar')).toBeTruthy();

    // El resto de secciones no se ve afectado por el error de recetas.
    irASeccion(0, 'Tratamientos');
    expect(detalleConsulta(0).textContent).toContain('Lubricante ocular');

    irASeccion(0, 'Indicaciones');
    expect(detalleConsulta(0).textContent).toContain('Evitar esfuerzo visual prolongado');
  });

  it('reintentar vuelve a solicitar los registros de la consulta', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, { errores: { recetas: 500 } });

    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Recetas');

    const reintentar = detalleConsulta(0).querySelector(
      '.consulta-card__reintentar',
    ) as HTMLButtonElement;
    reintentar.click();
    fixture.detectChanges();

    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      tratamientos: [tratamientoLubricante],
      indicaciones: [indicacionReposo],
      recetas: [recetaTobramicina],
    });

    // Al reintentar, la navegación vuelve a Diagnósticos.
    irASeccion(0, 'Recetas');
    expect(detalleConsulta(0).textContent).not.toContain('Error al cargar recetas');
    expect(detalleConsulta(0).textContent).toContain('Receta #801');

    irASeccion(0, 'Tratamientos');
    expect(detalleConsulta(0).textContent).toContain('Lubricante ocular');
  });

  it('al cambiar de paciente se limpian los registros del anterior', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Tratamientos');
    expect(detalleConsulta(0).textContent).toContain('Lubricante ocular');

    seleccionarPaciente(1);
    responderHistorial(2, historialDe(pacienteAna));
    responderConsultas([], 2);

    expect(textoCuerpo()).not.toContain('Lubricante ocular');
    expect(tarjetasConsulta().length).toBe(0);
  });

  // --- Navegación clínica secundaria (CU13 + CU18) -------------------------

  it('muestra una segunda barra de navegación al expandir la consulta', () => {
    seleccionarJuanConDatos();
    irATab(1);

    expect(fixture.nativeElement.querySelector('.navegacion-clinica')).toBeNull();

    abrirDetalleConsulta(0);
    expect(detalleConsulta(0).querySelector('.navegacion-clinica')).toBeTruthy();
  });

  it('la navegación secundaria contiene las cinco secciones clínicas', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);

    const etiquetas = etiquetasSecciones(0).map((texto) => texto.replace(/\s+/g, ''));
    expect(etiquetas.length).toBe(5);
    expect(etiquetas[0]).toContain('Diagnósticos');
    expect(etiquetas[1]).toContain('Tratamientos');
    expect(etiquetas[2]).toContain('Indicaciones');
    expect(etiquetas[3]).toContain('Recetas');
    expect(etiquetas[4]).toContain('Exámenes');
  });

  it('por defecto muestra sólo la sección de diagnósticos', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);

    const detalle = detalleConsulta(0);
    expect(detalle.querySelectorAll('.diagnostico-chip').length).toBe(1);
    expect(detalle.querySelectorAll('.tratamiento').length).toBe(0);
    expect(detalle.querySelectorAll('.indicacion').length).toBe(0);
    expect(detalle.querySelectorAll('.receta').length).toBe(0);
    expect(detalle.querySelectorAll('.examen-card').length).toBe(0);
  });

  it('sólo permanece visible la sección seleccionada', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);

    irASeccion(0, 'Tratamientos');
    let detalle = detalleConsulta(0);
    expect(detalle.querySelectorAll('.tratamiento').length).toBe(1);
    expect(detalle.querySelectorAll('.diagnostico-chip').length).toBe(0);
    expect(detalle.querySelectorAll('.indicacion').length).toBe(0);

    irASeccion(0, 'Indicaciones');
    detalle = detalleConsulta(0);
    expect(detalle.querySelectorAll('.indicacion').length).toBe(1);
    expect(detalle.querySelectorAll('.tratamiento').length).toBe(0);

    irASeccion(0, 'Recetas');
    detalle = detalleConsulta(0);
    expect(detalle.querySelectorAll('.receta').length).toBe(1);
    expect(detalle.querySelectorAll('.indicacion').length).toBe(0);
  });

  it('muestra el contador de cada sección y lo omite cuando el recurso falla', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      tratamientos: [tratamientoLubricante, tratamientoControl],
      indicaciones: indicacionesMultiples,
      recetas: [recetaTobramicina],
      errores: { examenes: 500 },
    });

    irATab(1);
    abrirDetalleConsulta(0);

    const etiquetas = etiquetasSecciones(0).map((texto) => texto.replace(/\s+/g, ''));
    expect(etiquetas[0]).toBe('Diagnósticos1');
    expect(etiquetas[1]).toBe('Tratamientos2');
    expect(etiquetas[2]).toBe('Indicaciones4');
    expect(etiquetas[3]).toBe('Recetas1');
    expect(etiquetas[4]).toBe('Exámenes');
  });

  it('al cambiar de consulta la navegación vuelve a Diagnósticos', () => {
    seleccionarJuanConDatos();
    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Recetas');
    expect(detalleConsulta(0).querySelectorAll('.receta').length).toBe(1);

    abrirDetalleConsulta(1);
    const etiquetas = etiquetasSecciones(1).map((texto) => texto.replace(/\s+/g, ''));
    expect(etiquetas[0]).toBe('Diagnósticos0');
    expect(detalleConsulta(1).querySelectorAll('.receta').length).toBe(0);
    expect(detalleConsulta(1).querySelectorAll('.diagnostico-chip').length).toBe(0);
  });

  it('muestra el examen real y sus resultados dentro de CU13', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      examenes: [examenTonometria, examenAgudeza],
    });

    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Exámenes');

    // Los resultados se solicitan al abrir la sección: uno por examen.
    responderResultados(850, [resultadoOjoDerecho, resultadoOjoIzquierdo]);
    responderResultados(860, []);

    const detalle = detalleConsulta(0);
    expect(detalle.querySelectorAll('.examen-card').length).toBe(1);
    expect(detalle.textContent).toContain('Tonometría');
    expect(detalle.textContent).toContain('2 resultados');
    expect(detalle.textContent).toContain('OD 16 mmHg');
    // Sólo se muestra un resultado a la vez.
    expect(detalle.textContent).not.toContain('OI 15 mmHg');
  });

  it('permite navegar entre los resultados de un examen', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      examenes: [examenTonometria],
    });

    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Exámenes');
    responderResultados(850, [resultadoOjoDerecho, resultadoOjoIzquierdo]);

    let navegador = navegadorDe(detalleConsulta(0), 'Resultados');
    expect(navegador.querySelectorAll('.resultado').length).toBe(1);
    expect(botonNavegacion(navegador, 'Anterior').disabled).toBe(true);

    botonNavegacion(navegador, 'Siguiente').click();
    fixture.detectChanges();
    navegador = navegadorDe(detalleConsulta(0), 'Resultados');
    expect(navegador.textContent).toContain('OI 15 mmHg');
    expect(botonNavegacion(navegador, 'Siguiente').disabled).toBe(true);
  });

  it('no vuelve a pedir los resultados al reabrir la sección de exámenes', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      examenes: [examenTonometria],
    });

    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Exámenes');
    responderResultados(850, [resultadoOjoDerecho]);

    irASeccion(0, 'Recetas');
    irASeccion(0, 'Exámenes');

    expect(
      httpMock.match(
        (r) => r.url === `${apiUrl}/historial-clinico/examenes/850/resultados`,
      ).length,
    ).toBe(0);
    expect(detalleConsulta(0).textContent).toContain('OD 16 mmHg');
  });

  it('un error al cargar resultados se muestra dentro del examen', () => {
    seleccionarPaciente(0);
    responderHistorial(1, historialDe(pacienteJuan, [antecedente]));
    responderConsultas([consultaReciente], 1);
    responderRegistros(900, {
      diagnosticos: [diagnosticoCatarata],
      examenes: [examenTonometria],
    });

    irATab(1);
    abrirDetalleConsulta(0);
    irASeccion(0, 'Exámenes');
    responderResultados(850, [], 500);

    const detalle = detalleConsulta(0);
    expect(detalle.textContent).toContain('Error al cargar resultados');
    expect(detalle.querySelector('.examen-card__reintentar')).toBeTruthy();
    // El examen sigue visible pese al error de resultados.
    expect(detalle.textContent).toContain('Tonometría');
  });
});
