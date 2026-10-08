export interface ServicioOftalmologico {
  id?: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  duracion_estimada: number;
  estado: boolean;
}

export type ServicioOftalmologicoGuardar = Omit<ServicioOftalmologico, 'id'>;
