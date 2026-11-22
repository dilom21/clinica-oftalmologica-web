export type EstadoDato = 'OK' | 'ZERO' | 'SUPPRESSED' | 'PARTIAL' | 'NOT_COVERED';
export type Granularidad = 'dia' | 'semana' | 'mes';
export type EstadoCitaReporte = 'PROGRAMADA' | 'CONFIRMADA' | 'EN_ESPERA' | 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO';
export type FormatoProgresivo = 'csv' | 'xlsx' | 'pdf';

export interface FiltrosProgresivos {
  fecha_desde: string;
  fecha_hasta: string;
  granularidad: Granularidad;
  estado?: EstadoCitaReporte;
}

export interface IndicadorCatalogo {
  key: string;
  etiqueta: string;
  descripcion?: string;
  disponible: boolean;
  calificador?: string | null;
  rango_maximo_dias?: number | null;
  limitaciones: string[];
}

export interface CatalogoProgresivo {
  version: string;
  politica_privacidad: { umbral_k: number; estados: EstadoDato[] };
  indicadores: IndicadorCatalogo[];
}

export interface ValorAgregado { valor: number | null; estado_dato: EstadoDato; }
export interface IndicadorKpi extends ValorAgregado {
  indicador: string;
  etiqueta: string;
  calificador: string | null;
  advertencias: string[];
}
export interface RespuestaKpis {
  fecha_desde: string;
  fecha_hasta: string;
  zona_horaria: string;
  indicadores: IndicadorKpi[];
  distribucion_estados: IndicadorKpi[];
  advertencias: string[];
}
export interface PuntoSerie extends ValorAgregado { periodo_inicio: string; periodo_fin: string; }
export interface RespuestaSerie {
  indicador: string;
  etiqueta: string;
  granularidad: Granularidad;
  fecha_desde: string;
  fecha_hasta: string;
  zona_horaria: string;
  puntos: PuntoSerie[];
  advertencias: string[];
}
export interface RespuestaComparacion {
  indicador: string;
  actual: ValorAgregado;
  anterior: ValorAgregado;
  variacion_absoluta: number | null;
  variacion_porcentual: number | null;
  periodo_actual: [string, string];
  periodo_anterior: [string, string];
  advertencias: string[];
}

export type EstadoPronostico = 'READY' | 'INSUFFICIENT_HISTORY' | 'INSUFFICIENT_DATA' | 'FORECAST_UNAVAILABLE';
export interface MetricasPronostico { mae: number; rmse: number; wape: number | null; sesgo: number; observaciones: number; }
export interface PronosticoSemana {
  inicio_semana: string;
  fin_semana: string;
  valor_pronosticado: number;
  limite_inferior: number;
  limite_superior: number;
  calidad_datos: 'FORECAST';
}
export interface PronosticoDemanda {
  estado: EstadoPronostico;
  objetivo: 'CITAS_CREADAS';
  zona_horaria: string;
  fecha_corte: string;
  horizonte_semanas: number;
  metodo: string | null;
  version_modelo: string;
  rango_historico_inicio: string | null;
  rango_historico_fin: string | null;
  calidad_historica: Record<'semanas_ok' | 'semanas_zero' | 'semanas_suppressed' | 'semanas_partial' | 'semanas_not_covered', number>;
  metricas: MetricasPronostico | null;
  metricas_baseline: MetricasPronostico | null;
  comparacion_metodos: Array<{ metodo: string; metricas: MetricasPronostico }>;
  pronosticos: PronosticoSemana[];
  intervalo: string | null;
  advertencias: string[];
}

export interface EstadoModeloInasistencia {
  estado: 'MODEL_READY' | 'MODEL_NOT_READY' | 'LABELS_INSUFFICIENT' | 'LABELS_AMBIGUOUS' | 'TRAINING_DISABLED' | 'PREDICTION_UNAVAILABLE';
  fuente: 'CITA_ESTADO_Y_BITACORA';
  calidad: 'BLOQUEADO_POR_DATOS';
  version_regla: string;
  q09_entrenamiento: 'PROHIBIDO';
  modelo_habilitado: boolean;
  prediccion_habilitada: boolean;
  algoritmos_disponibles: string[];
  variables_permitidas: string[];
  variables_excluidas: string[];
  razones_bloqueo: string[];
  advertencias: string[];
}
