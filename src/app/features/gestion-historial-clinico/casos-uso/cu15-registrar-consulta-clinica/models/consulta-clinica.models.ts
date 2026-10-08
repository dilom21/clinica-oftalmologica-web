/**
 * Modelos CU15 - Registrar consulta clínica.
 *
 * Reflejan el contrato real del backend (FastAPI):
 *  - POST /historial-clinico/consultas  -> 201
 *
 * El schema `ConsultaClinicaCrear` usa `extra="forbid"`: enviar cualquier
 * propiedad no declarada (por ejemplo `oftalmologo_id`) provoca 422.
 */

export interface ConsultaClinicaCrear {
  historial_clinico_id: number;
  cita_id?: number | null;
  motivo_consulta?: string | null;
  anamnesis?: string | null;
  observaciones?: string | null;
}

/** Oftalmólogo resumido devuelto dentro de la respuesta de la consulta. */
export interface ConsultaClinicaOftalmologo {
  id: number;
  matricula: string;
  nombres: string;
  apellidos: string;
  especialidad: string | null;
}

export interface ConsultaClinicaRespuesta {
  id: number;
  historial_clinico_id: number;
  cita_id: number | null;
  oftalmologo: ConsultaClinicaOftalmologo;
  fecha_consulta: string;
  motivo_consulta: string | null;
  anamnesis: string | null;
  observaciones: string | null;
  estado: boolean;
}

/** Límite real del backend para `motivo_consulta`. */
export const MOTIVO_CONSULTA_MAX_LENGTH = 255;

/**
 * Estados de cita desde los que CU15 permite iniciar una consulta.
 * Debe coincidir con el backend; no se reutiliza CU10 para no modificarlo.
 */
export const ESTADOS_CITA_INICIABLES_CU15: readonly string[] = [
  'PROGRAMADA',
  'CONFIRMADA',
  'EN_ESPERA',
];

export function esEstadoCitaIniciable(estado: string): boolean {
  return ESTADOS_CITA_INICIABLES_CU15.includes(estado);
}

export function etiquetaEstadoConsulta(estado: boolean): string {
  return estado ? 'Activa' : 'Inactiva';
}
