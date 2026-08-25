export interface MenuFuncion {
  id: number;
  nombre: string;
}

export interface MenuModulo {
  id: number;
  nombre: string;
  funciones: MenuFuncion[];
}
