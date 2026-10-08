/**
 * Modelos de CU10 - Gestionar citas médicas.
 * Reflejan exactamente los DTO reales del backend (FastAPI):
 *  - GET/POST    /agenda-citas/citas
 *  - GET/PUT     /agenda-citas/citas/{cita_id}
 *  - PATCH       /agenda-citas/citas/{cita_id}/estado
 */

export interface OftalmologoCita {
  id: number;
  matricula: string;
  nombres: string;
  apellidos: string;
  especialidad: string | null;
}

/** Forma mínima de paciente usada para resolver nombres en la UI. */
export interface PacienteCatalogo {
  id: number;
  nombres: string;
  apellidos: string;
  ci: string | null;
}

export interface IntervaloCita {
  hora_inicio: string;
  hora_fin: string;
}

export interface DisponibilidadCita {
  oftalmologo: OftalmologoCita;
  fecha: string;
  tiene_horario: boolean;
  horarios_base: IntervaloCita[];
  intervalos_disponibles: IntervaloCita[];
}

/** Una cita tal como la devuelve CitaResponse del backend. */
export interface CitaMedica {
  id: number;
  paciente_id: number;
  oftalmologo_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  observaciones: string | null;
  estado: string;
  fecha_registro: string | null;
  fecha_actualizacion: string | null;
}

/** Body de POST /agenda-citas/citas (CitaCreate). */
export interface CitaCrear {
  paciente_id: number;
  oftalmologo_id: number;
  fecha: string;
  hora_inicio: string;
  motivo?: string | null;
  observaciones?: string | null;
}

/** Body de PUT /agenda-citas/citas/{id} (CitaUpdate). */
export interface CitaActualizar {
  fecha?: string | null;
  hora_inicio?: string | null;
  motivo?: string | null;
  observaciones?: string | null;
}

export interface FiltrosCitas {
  fecha?: string;
  paciente_id?: number | null;
  oftalmologo_id?: number | null;
  estado?: string | null;
}

export type EstadoCita =
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'EN_ESPERA'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'NO_ASISTIO';

export const ESTADOS_CITA: readonly EstadoCita[] = [
  'PROGRAMADA',
  'CONFIRMADA',
  'EN_ESPERA',
  'ATENDIDA',
  'CANCELADA',
  'NO_ASISTIO',
];

export const ESTADOS_CITA_TERMINALES: ReadonlySet<string> = new Set([
  'ATENDIDA',
  'CANCELADA',
  'NO_ASISTIO',
]);

/** Estados desde los que todavía es razonable reprogramar/cancelar. */
export function esEstadoCitaTerminal(estado: string): boolean {
  return ESTADOS_CITA_TERMINALES.has(estado);
}

export function etiquetaEstadoCita(estado: string): string {
  const etiquetas: Record<string, string> = {
    PROGRAMADA: 'Programada',
    CONFIRMADA: 'Confirmada',
    EN_ESPERA: 'En espera',
    ATENDIDA: 'Atendida',
    CANCELADA: 'Cancelada',
    NO_ASISTIO: 'No asistió',
  };
  return etiquetas[estado] ?? estado;
}

export function claseEstadoCita(estado: string): string {
  return `cita-estado--${estado.toLowerCase()}`;
}

export function formatearHoraCita(hora: string): string {
  return hora.length >= 5 ? hora.slice(0, 5) : hora;
}

export function formatearFechaCita(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) {
    return fecha;
  }
  return `${dia}/${mes}/${anio}`;
}

export function fechaActualInput(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Convierte una fecha ISO 'YYYY-MM-DD' a Date local (sin desfase UTC). */
function fechaDesdeInput(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, (mes ?? 1) - 1, dia ?? 1);
}

export function sumarDias(fecha: string, dias: number): string {
  const fechaDate = fechaDesdeInput(fecha);
  fechaDate.setDate(fechaDate.getDate() + dias);
  const anio = fechaDate.getFullYear();
  const mes = String(fechaDate.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaDate.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Ej.: '7 de septiembre de 2026'. */
export function formatearFechaLarga(fecha: string): string {
  if (!fecha) {
    return '';
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaDesdeInput(fecha));
}

/** Ej.: 'lunes, 7 de septiembre de 2026'. */
export function formatearFechaLargaConDia(fecha: string): string {
  if (!fecha) {
    return '';
  }
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaDesdeInput(fecha));
}

/** Ej.: '07 SEPTIEMBRE 2026' (usado en el selector principal). */
const MESES_ANIO = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatearFechaSelector(fecha: string): string {
  if (!fecha) {
    return '';
  }
  const fechaDate = fechaDesdeInput(fecha);
  const dia = String(fechaDate.getDate()).padStart(2, '0');
  const mes = MESES_ANIO[fechaDate.getMonth()] ?? '';
  return `${dia} ${mes.toUpperCase()} ${fechaDate.getFullYear()}`;
}

/**
 * Duración oficial de una cita médica, en minutos.
 *
 * Debe coincidir con `DURACION_CITA_MINUTOS` del backend FastAPI: el backend
 * genera los turnos de disponibilidad con este paso y calcula
 * `hora_fin = hora_inicio + DURACION_CITA_MINUTOS` al registrar la cita.
 */
export const DURACION_CITA_MINUTOS = 30;

/** Etiqueta corta de la duración oficial ('30 min'), lista para mostrar en la UI. */
export const ETIQUETA_DURACION_CITA = `${DURACION_CITA_MINUTOS} min`;

/**
 * Opciones reservables que se ofrecen al registrar o reprogramar una cita.
 *
 * El backend ya entrega `intervalos_disponibles` como turnos individuales de
 * `DURACION_CITA_MINUTOS` (30 min), por ejemplo:
 *   { "hora_inicio": "08:00:00", "hora_fin": "08:30:00" }
 *   { "hora_inicio": "08:30:00", "hora_fin": "09:00:00" }
 *
 * Por eso estos turnos se usan directamente: NO se vuelven a dividir ni se
 * exige una duración distinta a la del backend. Cada turno se conserva tal
 * cual (mismas claves `hora_inicio` / `hora_fin` que espera la API) y solo se
 * ordena cronológicamente para presentarlo en el selector de horarios.
 */
export function horariosReservables(intervalos: IntervaloCita[]): IntervaloCita[] {
  return [...intervalos].sort(
    (a, b) => minutosDesdeMedianoche(a.hora_inicio) - minutosDesdeMedianoche(b.hora_inicio),
  );
}

function minutosDesdeMedianoche(hora: string): number {
  const [horas = '0', minutos = '0'] = hora.split(':');
  return Number(horas) * 60 + Number(minutos);
}
