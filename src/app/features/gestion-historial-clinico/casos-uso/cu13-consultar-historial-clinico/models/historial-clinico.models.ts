import type { ConsultaClinicaRespuesta } from '../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import type { DiagnosticoRespuesta } from '../../cu16-registrar-diagnostico/models/diagnostico.models';
import type {
  IndicacionRespuesta,
  RecetaRespuesta,
  TratamientoRespuesta,
} from '../../cu17-registrar-tratamientos-recetas/models/tratamientos-recetas.models';
import type {
  ExamenOftalmologicoRespuesta,
  ResultadoExamenRespuesta,
} from '../../cu18-registrar-examenes/models/examenes.models';

export interface AntecedenteClinico {
  id: number;
  tipo: string;
  descripcion: string;
  fecha_registro: string;
}

export interface HistorialClinicoDetalle {
  id: number;
  fecha_apertura: string;
  observaciones_generales: string | null;
  antecedentes: AntecedenteClinico[];
}

export interface HistorialClinicoRespuesta {
  paciente: PacienteHistorial;
  historial: HistorialClinicoDetalle | null;
}

export interface PacienteHistorial {
  id: number;
  usuario_id: number | null;
  nombres: string;
  apellidos: string;
  ci: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  contacto_emergencia: string;
  fecha_registro: string;
  direccion: string;
  estado: boolean;
}

/**
 * Recursos clínicos que se cargan por consulta de forma independiente.
 */
export type RecursoClinico =
  | 'diagnosticos'
  | 'tratamientos'
  | 'indicaciones'
  | 'recetas'
  | 'examenes';

/**
 * Vista consolidada de CU13: una consulta clínica junto con sus diagnósticos
 * (CU16), tratamientos, indicaciones, recetas (CU17) y exámenes con sus
 * resultados (CU18).
 *
 * Cada recurso se carga de forma independiente por consulta, por lo que cada
 * entrada conserva su propio estado de carga/error sin afectar al resto. Los
 * resultados de los exámenes se solicitan de forma diferida, al abrir la
 * sección de exámenes.
 */
export interface ConsultaConDiagnosticos {
  consulta: ConsultaClinicaRespuesta;
  diagnosticos: DiagnosticoRespuesta[];
  cargandoDiagnosticos: boolean;
  errorDiagnosticos: string | null;
  tratamientos: TratamientoRespuesta[];
  cargandoTratamientos: boolean;
  errorTratamientos: string | null;
  indicaciones: IndicacionRespuesta[];
  cargandoIndicaciones: boolean;
  errorIndicaciones: string | null;
  recetas: RecetaRespuesta[];
  cargandoRecetas: boolean;
  errorRecetas: string | null;
  examenes: ExamenOftalmologicoRespuesta[];
  cargandoExamenes: boolean;
  errorExamenes: string | null;
  /** Resultados por id de examen; ausente mientras no se hayan solicitado. */
  resultadosPorExamen: Record<number, ResultadoExamenRespuesta[]>;
  cargandoResultados: boolean;
  errorResultados: string | null;
  /** Evita volver a pedir los resultados cada vez que se abre la sección. */
  resultadosSolicitados: boolean;
}

/** Métricas resumidas del expediente clínico del paciente. */
export interface MetricasHistorial {
  consultas: number;
  diagnosticos: number;
  antecedentes: number;
  fechaApertura: string | null;
}
