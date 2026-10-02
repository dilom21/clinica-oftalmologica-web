/**
 * Modelos CU16 - Registrar diagnóstico.
 *
 * Reflejan el contrato real del backend (FastAPI):
 *  - POST /historial-clinico/consultas/{consulta_id}/diagnosticos  -> 201
 *  - GET  /historial-clinico/consultas/{consulta_id}/diagnosticos  -> 200
 *
 * El schema `DiagnosticoCrear` usa `extra="forbid"`: enviar cualquier
 * propiedad no declarada (por ejemplo `consulta_clinica_id`, `oftalmologo_id`)
 * provoca 422.
 */

export interface DiagnosticoCrear {
  nombre: string;
  descripcion?: string | null;
}

export interface DiagnosticoRespuesta {
  id: number;
  consulta_clinica_id: number;
  nombre: string;
  descripcion: string | null;
  fecha_diagnostico: string;
  estado: boolean;
}

/** Límite real del backend para `nombre`. */
export const NOMBRE_DIAGNOSTICO_MAX_LENGTH = 150;