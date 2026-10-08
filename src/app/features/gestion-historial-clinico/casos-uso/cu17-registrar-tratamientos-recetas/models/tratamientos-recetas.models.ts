/**
 * Modelos CU17 - Registrar tratamientos, indicaciones y recetas.
 *
 * Reflejan el contrato real del backend (FastAPI):
 *  - POST /historial-clinico/consultas/{consulta_id}/tratamientos  -> 201
 *  - GET  /historial-clinico/consultas/{consulta_id}/tratamientos  -> 200
 *  - POST /historial-clinico/consultas/{consulta_id}/indicaciones  -> 201
 *  - GET  /historial-clinico/consultas/{consulta_id}/indicaciones  -> 200
 *  - POST /historial-clinico/consultas/{consulta_id}/recetas       -> 201
 *  - GET  /historial-clinico/consultas/{consulta_id}/recetas       -> 200
 *  - GET  /historial-clinico/recetas/{receta_id}                   -> 200
 *
 * Los schemas de creación usan `extra="forbid"`: enviar cualquier propiedad no
 * declarada (`consulta_clinica_id`, `oftalmologo_id`, `usuario_id`, `estado`,
 * `fecha_emision`, `receta_id`, ...) provoca 422. El `consulta_id` viaja
 * siempre en la URL y la autoría/estado los resuelve el backend.
 */

// ---------------------------------------------------------------------------
// Tratamientos
// ---------------------------------------------------------------------------

export interface TratamientoCrear {
  descripcion: string;
  observaciones: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface TratamientoRespuesta {
  id: number;
  consulta_clinica_id: number;
  descripcion: string;
  observaciones: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: boolean;
}

// ---------------------------------------------------------------------------
// Indicaciones
// ---------------------------------------------------------------------------

export interface IndicacionCrear {
  descripcion: string;
}

export interface IndicacionRespuesta {
  id: number;
  consulta_clinica_id: number;
  descripcion: string;
  fecha_registro: string;
  /** El backend puede no exponer estado; se trata como opcional. */
  estado?: boolean;
}

// ---------------------------------------------------------------------------
// Recetas y sus detalles
// ---------------------------------------------------------------------------

export interface DetalleRecetaCrear {
  medicamento: string;
  presentacion: string | null;
  dosis: string | null;
  frecuencia: string | null;
  duracion: string | null;
  indicaciones: string | null;
}

export interface DetalleRecetaRespuesta extends DetalleRecetaCrear {
  id: number;
  receta_id: number;
}

export interface RecetaCrear {
  observaciones: string | null;
  /** Debe existir al menos un detalle válido. */
  detalles: DetalleRecetaCrear[];
}

export interface RecetaRespuesta {
  id: number;
  consulta_clinica_id: number;
  observaciones: string | null;
  fecha_emision: string;
  estado: boolean;
  detalles: DetalleRecetaRespuesta[];
}

// ---------------------------------------------------------------------------
// Helpers de presentación compartidos por los componentes de CU17
// ---------------------------------------------------------------------------

/**
 * Formatea una fecha clínica. Acepta tanto `YYYY-MM-DD` como instantes ISO
 * completos y devuelve un guion cuando el valor es vacío o inválido.
 */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) {
    return '—';
  }
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha;
    return `${dia}/${mes}/${anio}`;
  }
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(valor);
}

/** Formatea fecha y hora clínica; devuelve un guion si el valor no es válido. */
export function formatearFechaHora(fecha: string | null | undefined): string {
  if (!fecha) {
    return '—';
  }
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(valor);
}
