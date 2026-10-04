export interface ServicioOftalmologico {
  id?: number;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  duracion_estimada: number | null;
  estado: boolean | null;
}