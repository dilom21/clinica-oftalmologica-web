export interface OftalmologoConfiguracion {
  id: number;
  matricula: string;
  nombres: string;
  apellidos: string;
  especialidad: string | null;
}

export interface HorarioOftalmologo {
  id: number;
  oftalmologo_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  estado: boolean;
}

export interface HorarioOftalmologoGuardar {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface BloqueoHorario {
  id: number;
  oftalmologo_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  estado: boolean;
  fecha_registro: string | null;
}

export interface BloqueoHorarioGuardar {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
}

export interface ConfiguracionDisponibilidad {
  oftalmologo: OftalmologoConfiguracion;
  horarios: HorarioOftalmologo[];
  bloqueos: BloqueoHorario[];
}

export interface DiaSemana {
  numero: number;
  nombre: string;
}

export const DIAS_SEMANA: DiaSemana[] = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' },
  { numero: 7, nombre: 'Domingo' },
];

export function nombreDiaSemana(diaSemana: number): string {
  const dia = DIAS_SEMANA.find((d) => d.numero === diaSemana);
  return dia?.nombre ?? `Día ${diaSemana}`;
}
