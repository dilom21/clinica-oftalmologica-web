import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { RegistroNavegador } from '../../../../../../core/components/registro-navegador/registro-navegador';
import { DiagnosticoRespuesta } from '../../../cu16-registrar-diagnostico/models/diagnostico.models';
import { IndicacionList } from '../../../cu17-registrar-tratamientos-recetas/components/indicacion-list/indicacion-list';
import { RecetaCard } from '../../../cu17-registrar-tratamientos-recetas/components/receta-card/receta-card';
import { TratamientoList } from '../../../cu17-registrar-tratamientos-recetas/components/tratamiento-list/tratamiento-list';
import { ExamenCard } from '../../../cu18-registrar-examenes/components/examen-card/examen-card';
import { ResultadoExamenRespuesta } from '../../../cu18-registrar-examenes/models/examenes.models';
import { ConsultaConDiagnosticos } from '../../models/historial-clinico.models';
import { DiagnosticoChip } from '../diagnostico-chip/diagnostico-chip';
import {
  NavegacionClinica,
  SeccionClinica,
} from '../navegacion-clinica/navegacion-clinica';

const SECCION_INICIAL = 'diagnosticos';

/**
 * Tarjeta clínica de una consulta (CU15) con su detalle expandible.
 *
 * El detalle usa una navegación secundaria: diagnósticos (CU16), tratamientos,
 * indicaciones y recetas (CU17) y exámenes con resultados (CU18). Sólo se
 * muestra una sección a la vez, ocupando todo el ancho disponible.
 */
@Component({
  selector: 'app-consulta-clinica-card',
  imports: [
    DiagnosticoChip,
    TratamientoList,
    IndicacionList,
    RecetaCard,
    ExamenCard,
    NavegacionClinica,
    RegistroNavegador,
  ],
  templateUrl: './consulta-clinica-card.html',
  styleUrl: './consulta-clinica-card.css',
})
export class ConsultaClinicaCard {
  readonly registro = input.required<ConsultaConDiagnosticos>();
  readonly reintentarRegistros = output<number>();
  readonly solicitarResultadosExamenes = output<number>();
  readonly reintentarResultadosExamenes = output<number>();

  protected readonly abierto = signal(false);
  protected readonly seccionActiva = signal<string>(SECCION_INICIAL);
  protected readonly diagnosticoActual = signal(0);
  protected readonly tratamientoActual = signal(0);
  protected readonly indicacionActual = signal(0);
  protected readonly recetaActual = signal(0);
  protected readonly examenActual = signal(0);

  /**
   * Reinicia la navegación al cambiar de consulta. Una recarga de los datos de
   * la misma consulta no altera la sección ni los índices ya elegidos.
   */
  private readonly consultaId = computed(() => this.registro().consulta.id);

  private readonly reiniciarAlCambiarConsulta = effect(() => {
    this.consultaId();
    untracked(() => this.reiniciarNavegacion());
  });

  protected readonly secciones = computed<ReadonlyArray<SeccionClinica>>(() => {
    const item = this.registro();
    return [
      {
        id: 'diagnosticos',
        etiqueta: 'Diagnósticos',
        icono: 'diagnostico',
        contador: this.contador(
          item.cargandoDiagnosticos,
          item.errorDiagnosticos,
          item.diagnosticos.length,
        ),
      },
      {
        id: 'tratamientos',
        etiqueta: 'Tratamientos',
        icono: 'tratamiento',
        contador: this.contador(
          item.cargandoTratamientos,
          item.errorTratamientos,
          item.tratamientos.length,
        ),
      },
      {
        id: 'indicaciones',
        etiqueta: 'Indicaciones',
        icono: 'indicacion',
        contador: this.contador(
          item.cargandoIndicaciones,
          item.errorIndicaciones,
          item.indicaciones.length,
        ),
      },
      {
        id: 'recetas',
        etiqueta: 'Recetas',
        icono: 'receta',
        contador: this.contador(
          item.cargandoRecetas,
          item.errorRecetas,
          item.recetas.length,
        ),
      },
      {
        id: 'examenes',
        etiqueta: 'Exámenes',
        icono: 'examen',
        contador: this.contador(
          item.cargandoExamenes,
          item.errorExamenes,
          item.examenes.length,
        ),
      },
    ];
  });

  protected readonly diagnosticoPrincipal = computed<DiagnosticoRespuesta | null>(() => {
    const lista = this.registro().diagnosticos;
    if (lista.length === 0) {
      return null;
    }
    return lista.find((item) => item.estado) ?? lista[0];
  });

  protected readonly diagnosticosExtra = computed(() =>
    Math.max(this.registro().diagnosticos.length - 1, 0),
  );

  protected readonly detalleId = computed(
    () => `consulta-detalle-${this.registro().consulta.id}`,
  );

  protected readonly examenSeleccionado = computed(
    () => this.registro().examenes[this.examenActual()] ?? null,
  );

  /** `null` mientras los resultados del examen no se hayan cargado. */
  protected readonly resultadosDelExamen = computed<
    ReadonlyArray<ResultadoExamenRespuesta> | null
  >(() => {
    const examen = this.examenSeleccionado();
    if (!examen) {
      return null;
    }
    return this.registro().resultadosPorExamen[examen.id] ?? null;
  });

  // --- Interacción --------------------------------------------------------

  protected alternarDetalle(): void {
    if (!this.abierto()) {
      this.reiniciarNavegacion();
    }
    this.abierto.update((valor) => !valor);
  }

  protected cambiarSeccion(id: string): void {
    this.seccionActiva.set(id);
    if (id === 'examenes') {
      this.solicitarResultadosExamenes.emit(this.registro().consulta.id);
    }
  }

  protected anteriorDiagnostico(): void {
    this.retroceder(this.diagnosticoActual);
  }

  protected siguienteDiagnostico(): void {
    this.avanzar(this.diagnosticoActual, this.registro().diagnosticos.length);
  }

  protected anteriorTratamiento(): void {
    this.retroceder(this.tratamientoActual);
  }

  protected siguienteTratamiento(): void {
    this.avanzar(this.tratamientoActual, this.registro().tratamientos.length);
  }

  protected anteriorIndicacion(): void {
    this.retroceder(this.indicacionActual);
  }

  protected siguienteIndicacion(): void {
    this.avanzar(this.indicacionActual, this.registro().indicaciones.length);
  }

  protected anteriorReceta(): void {
    this.retroceder(this.recetaActual);
  }

  protected siguienteReceta(): void {
    this.avanzar(this.recetaActual, this.registro().recetas.length);
  }

  protected anteriorExamen(): void {
    this.retroceder(this.examenActual);
  }

  protected siguienteExamen(): void {
    this.avanzar(this.examenActual, this.registro().examenes.length);
  }

  protected reintentar(): void {
    this.reintentarRegistros.emit(this.registro().consulta.id);
  }

  protected reintentarResultados(): void {
    this.reintentarResultadosExamenes.emit(this.registro().consulta.id);
  }

  // --- Helpers de vista ---------------------------------------------------

  protected nombreOftalmologo(): string {
    const oftalmologo = this.registro().consulta.oftalmologo;
    if (!oftalmologo) {
      return 'Oftalmólogo no asignado';
    }
    return `${oftalmologo.nombres} ${oftalmologo.apellidos}`.trim() || 'Oftalmólogo no asignado';
  }

  protected etiquetaEstado(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  protected diaConsulta(): string {
    const fecha = this.fechaConsulta();
    if (!fecha) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(fecha);
  }

  protected mesAnioConsulta(): string {
    const fecha = this.fechaConsulta();
    if (!fecha) {
      return '';
    }
    return new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' })
      .format(fecha)
      .replace('.', '')
      .toUpperCase();
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

  // --- Internos -----------------------------------------------------------

  private contador(
    cargando: boolean,
    error: string | null,
    total: number,
  ): number | null {
    if (cargando || error) {
      return null;
    }
    return total;
  }

  private fechaConsulta(): Date | null {
    const valor = new Date(this.registro().consulta.fecha_consulta);
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  private avanzar(indice: ReturnType<typeof signal<number>>, total: number): void {
    indice.update((actual) => Math.min(actual + 1, total - 1));
  }

  private retroceder(indice: ReturnType<typeof signal<number>>): void {
    indice.update((actual) => Math.max(actual - 1, 0));
  }

  private reiniciarNavegacion(): void {
    this.seccionActiva.set(SECCION_INICIAL);
    this.diagnosticoActual.set(0);
    this.tratamientoActual.set(0);
    this.indicacionActual.set(0);
    this.recetaActual.set(0);
    this.examenActual.set(0);
  }
}
