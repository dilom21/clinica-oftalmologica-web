<<<<<<< HEAD
import type { Paciente } from './pacientes.models';

export interface AntecedenteClinico {
  id: number;
  historial_clinico_id?: number;
=======
export interface AntecedenteClinico {
  id?: number;
  historial_clinico_id: number;
>>>>>>> c988c15c98221be3d61f92bb5cd58304cb990fc2
  tipo: string; // Ej: ALERGIA, ENFERMEDAD, CIRUGIA, MEDICAMENTO, etc.
  descripcion: string;
  estado?: boolean;
  fecha_registro?: string;
<<<<<<< HEAD
}

export interface HistorialClinicoDetalle {
  id: number;
  fecha_apertura: string;
  observaciones_generales: string | null;
  antecedentes: AntecedenteClinico[];
}

export interface HistorialClinicoRespuesta {
  paciente: Paciente;
  historial: HistorialClinicoDetalle | null;
}

export interface AntecedenteClinicoCrear {
  historial_clinico_id: number;
  tipo: string;
  descripcion: string;
}

export interface AntecedenteClinicoActualizar {
  tipo?: string;
  descripcion?: string;
=======
>>>>>>> c988c15c98221be3d61f92bb5cd58304cb990fc2
}