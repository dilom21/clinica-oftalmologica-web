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