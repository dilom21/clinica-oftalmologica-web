export interface CategoriaCrear { nombre: string; descripcion?: string | null; }
export type CategoriaActualizar = CategoriaCrear;
export interface CategoriaRespuesta extends CategoriaCrear { id: number; estado: boolean; fecha_creacion: string; }

export interface ProductoCrear { categoria_id: number; codigo: string; nombre: string; descripcion?: string | null; unidad_medida?: string; stock_minimo?: number; }
export type ProductoActualizar = ProductoCrear;
export interface ProductoRespuesta extends ProductoCrear { id: number; estado: boolean; fecha_creacion: string; fecha_actualizacion: string; }

export interface LoteCrear { producto_id: number; numero_lote: string; fecha_fabricacion?: string | null; fecha_vencimiento?: string | null; observaciones?: string | null; }
export interface LoteActualizar { numero_lote: string; fecha_fabricacion?: string | null; fecha_vencimiento?: string | null; observaciones?: string | null; }
export interface LoteRespuesta extends LoteCrear { id: number; estado: boolean; fecha_creacion: string; }
export interface EstadoActualizar { estado: boolean; }
