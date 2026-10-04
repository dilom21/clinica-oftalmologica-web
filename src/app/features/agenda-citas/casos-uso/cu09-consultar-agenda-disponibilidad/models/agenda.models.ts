export interface OftalmologoAgenda {
  id: number;
  matricula: string;
  nombres: string;
  apellidos: string;
  especialidad: string | null;
}

export interface IntervaloHorario {
  hora_inicio: string;
  hora_fin: string;
}

export interface DisponibilidadRespuesta {
  oftalmologo: OftalmologoAgenda;
  fecha: string;
  tiene_horario: boolean;
  horarios_base: IntervaloHorario[];
  intervalos_disponibles: IntervaloHorario[];
}

export interface CitaAgenda {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  motivo: string | null;
}

export interface AgendaRespuesta {
  oftalmologo: OftalmologoAgenda;
  fecha: string;
  tiene_horario: boolean;
  horarios_base: IntervaloHorario[];
  citas: CitaAgenda[];
}
