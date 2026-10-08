export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RecuperarPasswordRequest {
  correo: string;
}

export interface RestablecerPasswordRequest {
  token: string;
  nueva_password: string;
}

export interface MensajeRespuesta {
  mensaje: string;
}

export const ID_ROL_USUARIO = {
  ADMINISTRADOR: 1,
  OFTALMOLOGO: 2,
  RECEPCIONISTA: 3,
  PACIENTE: 4,
} as const;

export type IdRolUsuario =
  (typeof ID_ROL_USUARIO)[keyof typeof ID_ROL_USUARIO];

/** Nombre legible de cada rol, alineado con `ID_ROL_USUARIO`. */
export const NOMBRE_ROL_USUARIO: Readonly<Record<number, string>> = {
  [ID_ROL_USUARIO.ADMINISTRADOR]: 'Administrador',
  [ID_ROL_USUARIO.OFTALMOLOGO]: 'Oftalmólogo',
  [ID_ROL_USUARIO.RECEPCIONISTA]: 'Recepcionista',
  [ID_ROL_USUARIO.PACIENTE]: 'Paciente',
};

/** Devuelve el nombre del rol o un texto neutro si no se reconoce. */
export function nombreRol(rolId: number | null): string {
  if (rolId === null) {
    return 'Usuario';
  }
  return NOMBRE_ROL_USUARIO[rolId] ?? 'Usuario';
}

/** Datos de sesión mostrables en la interfaz (derivados del token + login). */
export interface PerfilUsuario {
  usuarioId: number | null;
  rolId: number | null;
  rolNombre: string;
  correo: string | null;
  nombre: string | null;
  nombreMostrar: string;
  iniciales: string;
}