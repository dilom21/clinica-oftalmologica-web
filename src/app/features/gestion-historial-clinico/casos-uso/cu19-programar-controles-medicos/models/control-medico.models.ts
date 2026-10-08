import { formatearFechaCita } from '../../../../agenda-citas/casos-uso/cu10-gestionar-citas/models/citas.models';

export type EstadoControlMedico = 'PROGRAMADO' | 'REALIZADO' | 'CANCELADO';

export const ESTADOS_CONTROL_MEDICO: readonly EstadoControlMedico[] = [
  'PROGRAMADO',
  'REALIZADO',
  'CANCELADO',
];
export const MOTIVO_CONTROL_MAX_LENGTH = 255;

export interface ControlMedicoCrear {
  fecha_programada: string;
  motivo: string;
  observaciones?: string | null;
}

export interface ControlMedicoActualizar {
  fecha_programada?: string;
  motivo?: string;
  observaciones?: string | null;
  estado?: EstadoControlMedico;
}

/** Conserva la nulabilidad de los controles registrados antes de CU19. */
export interface ControlMedicoRespuesta {
  id: number;
  consulta_clinica_id: number | null;
  paciente_id: number;
  oftalmologo_id: number;
  fecha_programada: string;
  motivo: string | null;
  observaciones: string | null;
  estado: EstadoControlMedico | null;
}

export interface ControlesFiltros {
  paciente_id?: number;
  consulta_clinica_id?: number;
  estado?: EstadoControlMedico;
}

/** Las fechas DATE se muestran sin convertirlas a la zona horaria del navegador. */
export function formatearFechaControl(fecha: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? formatearFechaCita(fecha) : '—';
}

export function fechaActualClinica(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function esFechaControlValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}
