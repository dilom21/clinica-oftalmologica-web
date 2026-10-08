/**
 * Modelos CU18 - Registrar resultados de exámenes oftalmológicos.
 *
 * Reflejan el contrato del backend (FastAPI):
 *  - POST /historial-clinico/consultas/{consulta_id}/examenes
 *  - GET  /historial-clinico/consultas/{consulta_id}/examenes
 *  - POST /historial-clinico/examenes/{examen_id}/resultados
 *  - GET  /historial-clinico/examenes/{examen_id}/resultados
 *  - GET  /historial-clinico/examenes/{examen_id}
 *
 * Los esquemas de creación usan `extra="forbid"`: el `consulta_id` y el
 * `examen_id` viajan siempre en la URL y nunca en el body.
 */

// ---------------------------------------------------------------------------
// Exámenes
// ---------------------------------------------------------------------------

export interface ExamenOftalmologicoCrear {
  nombre_examen: string;
  observaciones: string | null;
}

export interface ExamenOftalmologicoRespuesta {
  id: number;
  consulta_clinica_id: number;
  nombre_examen: string;
  fecha_solicitud: string;
  observaciones: string | null;
  estado: boolean;
  /**
   * Nº de resultados cuando el backend lo entrega directamente. Si no está,
   * el contador se calcula con los resultados cargados.
   */
  cantidad_resultados?: number | null;
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export interface ResultadoExamenCrear {
  resultado: string;
  /** Opcional: no se sube ningún archivo por ahora. */
  archivo_url: string | null;
}

export interface ResultadoExamenRespuesta {
  id: number;
  examen_id: number;
  resultado: string;
  archivo_url: string | null;
  /** El backend puede nombrar la fecha de una u otra forma. */
  fecha_resultado?: string | null;
  fecha_registro?: string | null;
}

/** Respuesta de `GET /historial-clinico/examenes/{examen_id}`. */
export interface ExamenConResultadosRespuesta extends ExamenOftalmologicoRespuesta {
  resultados: ResultadoExamenRespuesta[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fecha del resultado, admitiendo los dos nombres posibles del backend. */
export function fechaDeResultado(
  resultado: ResultadoExamenRespuesta,
): string | null {
  return resultado.fecha_resultado ?? resultado.fecha_registro ?? null;
}

/**
 * Nº de resultados conocidos para un examen: usa los cargados si existen y, si
 * no, el contador que entregue el backend. Devuelve `null` si no se conoce.
 */
export function cantidadResultadosDe(
  examen: ExamenOftalmologicoRespuesta,
  resultados?: ReadonlyArray<ResultadoExamenRespuesta> | null,
): number | null {
  if (resultados) {
    return resultados.length;
  }
  const valor = examen.cantidad_resultados;
  return typeof valor === 'number' ? valor : null;
}
