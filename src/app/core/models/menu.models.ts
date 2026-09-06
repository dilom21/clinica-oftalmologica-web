export interface MenuFuncion {
  id: number;
  nombre: string;
  accion_id: number;
  accion_nombre: string;
}

export interface MenuModulo {
  id: number;
  nombre: string;
  funciones: MenuFuncion[];
}
