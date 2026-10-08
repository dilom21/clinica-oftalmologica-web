export interface AnalisisConsultaIa {
  resumen_clinico: string;
  hallazgos_relevantes: string[];
  aspectos_a_evaluar: string[];
  hipotesis_orientativas: string[];
  advertencia: string;
}

export interface MejoraDiagnosticoIa {
  nombre: string;
  descripcion_original: string;
  descripcion_mejorada: string;
  advertencia: string;
}

export interface MejoraDiagnosticoPayload {
  nombre: string;
  descripcion: string;
}
