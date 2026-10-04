import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, type Observable } from 'rxjs';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { Paciente } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { ConsultaClinicaRespuesta } from '../../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { ConsultaClinicaService } from '../../../cu15-registrar-consulta-clinica/services/consulta-clinica.service';
import { DiagnosticoRespuesta } from '../../../cu16-registrar-diagnostico/models/diagnostico.models';
import { DiagnosticoService } from '../../../cu16-registrar-diagnostico/services/diagnostico.service';
import {
  IndicacionRespuesta,
  RecetaRespuesta,
  TratamientoRespuesta,
} from '../../../cu17-registrar-tratamientos-recetas/models/tratamientos-recetas.models';
import { TratamientosRecetasService } from '../../../cu17-registrar-tratamientos-recetas/services/tratamientos-recetas.service';
import {
  ExamenOftalmologicoRespuesta,
  ResultadoExamenRespuesta,
} from '../../../cu18-registrar-examenes/models/examenes.models';
import { ExamenesService } from '../../../cu18-registrar-examenes/services/examenes.service';
import { ConsultaClinicaCard } from '../../components/consulta-clinica-card/consulta-clinica-card';
import { HistorialMetricas } from '../../components/historial-metricas/historial-metricas';
import {
  ConsultaConDiagnosticos,
  HistorialClinicoDetalle,
  MetricasHistorial,
  PacienteHistorial,
} from '../../models/historial-clinico.models';
import { HistorialClinicoService } from '../../services/historial-clinico.service';

type TabHistorial = 'resumen' | 'consultas' | 'antecedentes';
type ContextoError =
  | 'historial'
  | 'consultas'
  | 'diagnosticos'
  | 'tratamientos'
  | 'indicaciones'
  | 'recetas'
  | 'examenes'
  | 'resultados';

interface TabItem {
  id: TabHistorial;
  etiqueta: string;
}

/**
 * CU13 - Consultar historial clínico.
 *
 * Vista consolidada del expediente del paciente: reutiliza los endpoints de
 * historial (CU13), consultas (CU15) y diagnósticos (CU16) sin modificar sus
 * contratos. Los errores se aíslan por contexto para que un fallo parcial no
 * inutilice el resto de la pantalla.
 */
@Component({
  selector: 'app-consultar-historial-clinico',
  imports: [Sidebar, HistorialMetricas, ConsultaClinicaCard],
  templateUrl: './consultar-historial-clinico.html',
  styleUrl: './consultar-historial-clinico.css',
})
export class ConsultarHistorialClinico implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  // Selección de paciente.
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly buscarTermino = signal('');
  protected readonly pacienteId = signal<number | null>(null);
  protected readonly cargandoPacientes = signal(true);
  protected readonly errorCargaPacientes = signal(false);

  // Historial clínico del paciente seleccionado.
  protected readonly pacienteSeleccionado = signal<PacienteHistorial | null>(null);
  protected readonly historial = signal<HistorialClinicoDetalle | null>(null);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal<string | null>(null);

  // Consultas clínicas (con sus diagnósticos).
  protected readonly consultas = signal<ConsultaConDiagnosticos[]>([]);
  protected readonly cargandoConsultas = signal(false);
  protected readonly errorConsultas = signal<string | null>(null);

  // Navegación interna.
  protected readonly tabActiva = signal<TabHistorial>('resumen');
  protected readonly tabs: ReadonlyArray<TabItem> = [
    { id: 'resumen', etiqueta: 'Resumen' },
    { id: 'consultas', etiqueta: 'Consultas' },
    { id: 'antecedentes', etiqueta: 'Antecedentes' },
  ];

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);
  private readonly consultaClinicaService = inject(ConsultaClinicaService);
  private readonly diagnosticoService = inject(DiagnosticoService);
  private readonly tratamientosRecetasService = inject(TratamientosRecetasService);
  private readonly examenesService = inject(ExamenesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pacientesFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    if (!termino) {
      return this.pacientes();
    }
    return this.pacientes().filter((paciente) =>
      `${paciente.nombres} ${paciente.apellidos} ${paciente.ci}`
        .toLowerCase()
        .includes(termino),
    );
  });

  protected readonly metricas = computed<MetricasHistorial>(() => ({
    consultas: this.consultas().length,
    diagnosticos: this.consultas().reduce(
      (total, item) => total + item.diagnosticos.length,
      0,
    ),
    antecedentes: this.historial()?.antecedentes.length ?? 0,
    fechaApertura: this.historial()?.fecha_apertura ?? null,
  }));

  protected readonly ultimaConsulta = computed<ConsultaConDiagnosticos | null>(
    () => this.consultas()[0] ?? null,
  );

  ngOnInit(): void {
    this.cargarPacientes();
  }

  private cargarPacientes(): void {
    this.cargandoPacientes.set(true);
    this.errorCargaPacientes.set(false);

    this.pacientesService.listarPacientes().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.cargandoPacientes.set(false);
      },
      error: () => {
        this.pacientes.set([]);
        this.cargandoPacientes.set(false);
        this.errorCargaPacientes.set(true);
      },
    });
  }

  protected seleccionarPaciente(paciente: Paciente): void {
    if (this.pacienteId() === paciente.id) {
      return;
    }
    this.pacienteId.set(paciente.id);
    this.buscarTermino.set('');
    this.errorHistorial.set(null);
    this.historial.set(null);
    this.pacienteSeleccionado.set(null);
    this.consultarHistorial(paciente.id);
  }

  protected limpiarSeleccion(): void {
    this.pacienteId.set(null);
    this.pacienteSeleccionado.set(null);
    this.historial.set(null);
    this.errorHistorial.set(null);
    this.reiniciarConsultas();
  }

  protected onBuscar(event: Event): void {
    this.buscarTermino.set((event.target as HTMLInputElement).value);
  }

  protected esPacienteActivo(paciente: Paciente): boolean {
    return this.pacienteId() === paciente.id;
  }

  protected cambiarTab(tab: TabHistorial): void {
    this.tabActiva.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, indice: number): void {
    const total = this.tabs.length;
    let siguiente = indice;
    switch (event.key) {
      case 'ArrowRight':
        siguiente = (indice + 1) % total;
        break;
      case 'ArrowLeft':
        siguiente = (indice - 1 + total) % total;
        break;
      case 'Home':
        siguiente = 0;
        break;
      case 'End':
        siguiente = total - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const destino = this.tabs[siguiente].id;
    this.cambiarTab(destino);
    document.getElementById(`historial-tab-${destino}`)?.focus();
  }

  protected reintentarPacientes(): void {
    this.cargarPacientes();
  }

  protected reintentarHistorial(): void {
    const id = this.pacienteId();
    if (id !== null) {
      this.consultarHistorial(id);
    }
  }

  protected reintentarConsultas(): void {
    const id = this.pacienteId();
    if (id !== null) {
      this.cargarConsultas(id);
    }
  }

  protected reintentarRegistros(consultaId: number): void {
    this.cargarRegistros([consultaId]);
  }

  /**
   * Se invoca al abrir la sección de exámenes: carga una sola vez los
   * resultados de todos los exámenes de la consulta, aislando sus errores.
   */
  protected solicitarResultadosExamenes(consultaId: number): void {
    const item = this.consultas().find((entrada) => entrada.consulta.id === consultaId);
    if (!item || item.resultadosSolicitados || item.examenes.length === 0) {
      return;
    }
    this.cargarResultadosExamenes(consultaId);
  }

  protected reintentarResultadosExamenes(consultaId: number): void {
    this.cargarResultadosExamenes(consultaId);
  }

  private cargarResultadosExamenes(consultaId: number): void {
    const item = this.consultas().find((entrada) => entrada.consulta.id === consultaId);
    if (!item) {
      return;
    }

    this.consultas.update((lista) =>
      lista.map((entrada) =>
        entrada.consulta.id === consultaId
          ? {
              ...entrada,
              resultadosSolicitados: true,
              cargandoResultados: true,
              errorResultados: null,
            }
          : entrada,
      ),
    );

    forkJoin(
      item.examenes.map((examen) =>
        this.examenesService.listarResultados(examen.id).pipe(
          map((resultados) => ({
            id: examen.id,
            resultados,
            error: null as string | null,
          })),
          catchError((error: unknown) =>
            of({
              id: examen.id,
              resultados: [] as ResultadoExamenRespuesta[],
              error: this.extraerError(error, 'resultados'),
            }),
          ),
        ),
      ),
    ).subscribe((resultados) => {
      const mapa: Record<number, ResultadoExamenRespuesta[]> = {};
      let primerError: string | null = null;

      for (const resultado of resultados) {
        mapa[resultado.id] = resultado.resultados;
        if (resultado.error && !primerError) {
          primerError = resultado.error;
        }
      }

      this.consultas.update((lista) =>
        lista.map((entrada) =>
          entrada.consulta.id === consultaId
            ? {
                ...entrada,
                resultadosPorExamen: mapa,
                cargandoResultados: false,
                errorResultados: primerError,
              }
            : entrada,
        ),
      );
    });
  }

  // --- Carga del historial y de las consultas -----------------------------

  private consultarHistorial(pacienteId: number): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.reiniciarConsultas();

    this.historialClinicoService
      .obtenerHistorialClinico(pacienteId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.historial.set(null);
          this.pacienteSeleccionado.set(null);
          this.errorHistorial.set(this.extraerError(resultado.error, 'historial'));
        } else {
          this.pacienteSeleccionado.set(resultado.paciente);
          this.historial.set(resultado.historial);
          this.cargarConsultas(pacienteId);
        }
        this.cargandoHistorial.set(false);
      });
  }

  private cargarConsultas(pacienteId: number): void {
    this.cargandoConsultas.set(true);
    this.errorConsultas.set(null);

    this.consultaClinicaService
      .listarConsultas({ paciente_id: pacienteId })
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.consultas.set([]);
          this.cargandoConsultas.set(false);
          this.errorConsultas.set(this.extraerError(resultado.error, 'consultas'));
          return;
        }

        const ordenadas = [...resultado].sort(
          (a, b) => this.tiempo(b.fecha_consulta) - this.tiempo(a.fecha_consulta),
        );
        this.consultas.set(
          ordenadas.map((consulta) => ({
            consulta,
            diagnosticos: [],
            cargandoDiagnosticos: true,
            errorDiagnosticos: null,
            tratamientos: [],
            cargandoTratamientos: true,
            errorTratamientos: null,
            indicaciones: [],
            cargandoIndicaciones: true,
            errorIndicaciones: null,
            recetas: [],
            cargandoRecetas: true,
            errorRecetas: null,
            examenes: [],
            cargandoExamenes: true,
            errorExamenes: null,
            resultadosPorExamen: {},
            cargandoResultados: false,
            errorResultados: null,
            resultadosSolicitados: false,
          })),
        );
        this.cargandoConsultas.set(false);
        this.cargarRegistros(ordenadas.map((consulta) => consulta.id));
      });
  }

  /**
   * Carga los registros clínicos de cada consulta: diagnósticos (CU16) y
   * tratamientos, indicaciones y recetas (CU17).
   *
   * Cada petición se aísla con `catchError`, de modo que el fallo de un recurso
   * no afecta a los demás ni al resto del historial.
   */
  private cargarRegistros(ids: number[]): void {
    if (ids.length === 0) {
      return;
    }

    this.consultas.update((lista) =>
      lista.map((item) =>
        ids.includes(item.consulta.id) ? this.marcarRegistrosCargando(item) : item,
      ),
    );

    forkJoin(ids.map((id) => this.cargarRegistrosDeConsulta(id))).subscribe(
      (resultados) => {
        const porId = new Map(resultados.map((resultado) => [resultado.id, resultado]));
        this.consultas.update((lista) =>
          lista.map((item) => {
            const resultado = porId.get(item.consulta.id);
            return resultado ? { ...item, ...resultado.registros } : item;
          }),
        );
      },
    );
  }

  private marcarRegistrosCargando(
    item: ConsultaConDiagnosticos,
  ): ConsultaConDiagnosticos {
    return {
      ...item,
      cargandoDiagnosticos: true,
      errorDiagnosticos: null,
      cargandoTratamientos: true,
      errorTratamientos: null,
      cargandoIndicaciones: true,
      errorIndicaciones: null,
      cargandoRecetas: true,
      errorRecetas: null,
      cargandoExamenes: true,
      errorExamenes: null,
    };
  }

  private cargarRegistrosDeConsulta(
    consultaId: number,
  ): Observable<{ id: number; registros: Partial<ConsultaConDiagnosticos> }> {
    return forkJoin({
      diagnosticos: this.diagnosticoService.listarDiagnosticos(consultaId).pipe(
        map((datos) => ({ datos, error: null as string | null })),
        catchError((error: unknown) =>
          of({
            datos: [] as DiagnosticoRespuesta[],
            error: this.extraerError(error, 'diagnosticos'),
          }),
        ),
      ),
      tratamientos: this.tratamientosRecetasService.listarTratamientos(consultaId).pipe(
        map((datos) => ({ datos, error: null as string | null })),
        catchError((error: unknown) =>
          of({
            datos: [] as TratamientoRespuesta[],
            error: this.extraerError(error, 'tratamientos'),
          }),
        ),
      ),
      indicaciones: this.tratamientosRecetasService.listarIndicaciones(consultaId).pipe(
        map((datos) => ({ datos, error: null as string | null })),
        catchError((error: unknown) =>
          of({
            datos: [] as IndicacionRespuesta[],
            error: this.extraerError(error, 'indicaciones'),
          }),
        ),
      ),
      recetas: this.tratamientosRecetasService.listarRecetas(consultaId).pipe(
        map((datos) => ({ datos, error: null as string | null })),
        catchError((error: unknown) =>
          of({
            datos: [] as RecetaRespuesta[],
            error: this.extraerError(error, 'recetas'),
          }),
        ),
      ),
      examenes: this.examenesService.listarExamenes(consultaId).pipe(
        map((datos) => ({ datos, error: null as string | null })),
        catchError((error: unknown) =>
          of({
            datos: [] as ExamenOftalmologicoRespuesta[],
            error: this.extraerError(error, 'examenes'),
          }),
        ),
      ),
    }).pipe(
      map((respuesta) => ({
        id: consultaId,
        registros: {
          diagnosticos: respuesta.diagnosticos.datos,
          errorDiagnosticos: respuesta.diagnosticos.error,
          cargandoDiagnosticos: false,
          tratamientos: respuesta.tratamientos.datos,
          errorTratamientos: respuesta.tratamientos.error,
          cargandoTratamientos: false,
          indicaciones: respuesta.indicaciones.datos,
          errorIndicaciones: respuesta.indicaciones.error,
          cargandoIndicaciones: false,
          recetas: respuesta.recetas.datos,
          errorRecetas: respuesta.recetas.error,
          cargandoRecetas: false,
          examenes: respuesta.examenes.datos,
          errorExamenes: respuesta.examenes.error,
          cargandoExamenes: false,
        },
      })),
    );
  }

  private reiniciarConsultas(): void {
    this.consultas.set([]);
    this.cargandoConsultas.set(false);
    this.errorConsultas.set(null);
    this.tabActiva.set('resumen');
  }

  // --- Formato ------------------------------------------------------------

  protected iniciales(paciente: Paciente): string {
    return `${paciente.nombres.charAt(0)}${paciente.apellidos.charAt(0)}`.toUpperCase();
  }

  protected formatearFecha(fecha: string): string {
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(valor);
  }

  protected formatearFechaHora(fecha: string): string {
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(valor);
  }

  protected nombreOftalmologo(consulta: ConsultaClinicaRespuesta): string {
    const oftalmologo = consulta.oftalmologo;
    if (!oftalmologo) {
      return 'Oftalmólogo no asignado';
    }
    return `${oftalmologo.nombres} ${oftalmologo.apellidos}`.trim() || 'Oftalmólogo no asignado';
  }

  // --- Sesión / layout ----------------------------------------------------

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // --- Errores ------------------------------------------------------------

  private tiempo(fecha: string): number {
    const valor = new Date(fecha).getTime();
    return Number.isNaN(valor) ? 0 : valor;
  }

  private extraerError(err: unknown, contexto: ContextoError): string {
    const objeto =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: { detail?: unknown } })
        : null;
    const detail = objeto?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    switch (objeto?.status) {
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para consultar el historial clínico.';
      case 404:
        if (contexto === 'historial') {
          return 'El paciente solicitado no fue encontrado.';
        }
        break;
      case 422:
        if (contexto === 'historial') {
          return 'El identificador del paciente no es válido.';
        }
        break;
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
    }

    switch (contexto) {
      case 'consultas':
        return 'No se pudieron cargar las consultas clínicas del paciente.';
      case 'diagnosticos':
        return 'No se pudieron cargar los diagnósticos de la consulta.';
      case 'tratamientos':
        return 'No se pudieron cargar los tratamientos de la consulta.';
      case 'indicaciones':
        return 'No se pudieron cargar las indicaciones de la consulta.';
      case 'recetas':
        return 'No se pudieron cargar las recetas de la consulta.';
      case 'examenes':
        return 'No se pudieron cargar los exámenes de la consulta.';
      case 'resultados':
        return 'No se pudieron cargar los resultados de los exámenes.';
      default:
        return 'No se pudo consultar el historial clínico. Inténtalo nuevamente.';
    }
  }
}
