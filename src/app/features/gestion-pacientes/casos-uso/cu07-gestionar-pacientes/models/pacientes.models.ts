export interface Paciente {
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

export interface PacienteCrear {
  nombres: string;
  apellidos: string;
  ci: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  contacto_emergencia: string;
  direccion: string;
}

export interface PacienteActualizar {
  nombres: string;
  apellidos: string;
  ci: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  contacto_emergencia: string;
  direccion: string;
}
