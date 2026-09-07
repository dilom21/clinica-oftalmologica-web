export interface PacienteHistorial {
  id: number;
  nombres: string;
  apellidos: string;
  ci: string | null;
}

export interface CitaHistorial {
  id: number;
  paciente_id: number;
  oftalmologo_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  observaciones: string | null;
  estado: string;
  canal: string | null;
}

export interface HistorialCitasRespuesta {
  paciente: PacienteHistorial;
  citas: CitaHistorial[];
  mensaje: string | null;
}

export interface HistorialCitasFiltros {
  paciente_id?: number;
  nombre?: string;
  codigo?: string;
  identificacion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
}
