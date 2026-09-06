export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  protegido: boolean;
  fecha_creacion: string;
}

export interface Funcion {
  id: number;
  modulo_id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface Modulo {
  id: number;
  nombre: string;
  funciones: Funcion[];
}

export interface Accion {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface PermisoRol {
  funcion_id: number;
  accion_id: number;
}

export interface PermisoRolRespuesta {
  rol_id: number;
  funcion_id: number;
  funcion_nombre: string;
  modulo_id: number;
  modulo_nombre: string;
  accion_id: number;
  accion_nombre: string;
}

export interface RolCrear {
  nombre: string;
  descripcion: string | null;
  permisos: PermisoRol[];
}

export interface RolActualizar {
  nombre: string;
  descripcion: string | null;
  permisos: PermisoRol[];
}

export type SeleccionPermisos = Record<number, number>;
