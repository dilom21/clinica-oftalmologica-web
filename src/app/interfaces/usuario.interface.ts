export interface Usuario {
  id?: number;
  correo: string;
  password_hash: string;
  estado?: boolean;
  rol_id: number;
}