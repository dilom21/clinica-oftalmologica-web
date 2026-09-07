export interface AntecedenteClinico {
  id?: number;
  historial_clinico_id: number;
  tipo: string; // Ej: ALERGIA, ENFERMEDAD, CIRUGIA, MEDICAMENTO, etc.
  descripcion: string;
  estado?: boolean;
  fecha_registro?: string;
}