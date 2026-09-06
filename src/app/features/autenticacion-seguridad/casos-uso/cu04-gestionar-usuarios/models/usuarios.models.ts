export interface RolUsuario {
  id: number;
  nombre: string;
}

export interface Usuario {
  id: number;
  correo: string;
  estado: boolean;
  fecha_creacion: string;
  rol_id: number;
  /** El backend incluye el rol anidado; se mantiene nullable solo como defensa. */
  rol: RolUsuario | null;
}

export interface UsuarioCrear {
  correo: string;
  password: string;
  rol_id: number;
}

export interface UsuarioActualizar {
  correo?: string;
  password?: string;
  rol_id?: number;
}

export interface UsuarioEstadoActualizar {
  estado: boolean;
}

export type FiltroEstadoUsuario = 'todos' | 'activos' | 'inactivos';
