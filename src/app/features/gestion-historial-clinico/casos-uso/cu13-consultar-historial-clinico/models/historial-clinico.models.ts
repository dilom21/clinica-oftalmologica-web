export interface AntecedenteClinico {
  id: number;
  tipo: string;
  descripcion: string;
  fecha_registro: string;
}

export interface HistorialClinicoDetalle {
  id: number;
  fecha_apertura: string;
  observaciones_generales: string | null;
  antecedentes: AntecedenteClinico[];
}

export interface HistorialClinicoRespuesta {
  paciente: PacienteHistorial;
  historial: HistorialClinicoDetalle | null;
}

export interface PacienteHistorial {
  id: number;
  usuario_id: number | null;
  nombres: string;
  apellidos: string;
  ci: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  contacto_emergencia: string;
  fecha_registro: string;
  direccion: string;
  estado: boolean;
}
