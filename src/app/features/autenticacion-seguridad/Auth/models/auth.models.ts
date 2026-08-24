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