export interface Pagina<T> { items: T[]; total: number; pagina: number; tamanio: number; }
export interface ProveedorCompra { id: number; razon_social: string; nit: string | null; estado: boolean | null; }
export interface ProductoCompra { id: number; codigo: string; nombre: string; unidad_medida: string; }
export interface LoteCompra {
  id: number; producto_id: number; numero_lote: string;
  fecha_fabricacion: string | null; fecha_vencimiento: string | null;
}
export interface DetalleCompraCrear {
  producto_id: number; lote_id?: number; numero_lote?: string;
  fecha_fabricacion?: string; fecha_vencimiento?: string;
  cantidad: number; costo_unitario: string; observaciones?: string;
}
export interface CompraCrear {
  proveedor_id: number; numero_documento?: string; moneda: string;
  observaciones?: string; detalles: DetalleCompraCrear[];
}
export interface CompraResumen {
  id: number; empresa_id: number; proveedor_id: number; proveedor_razon_social: string;
  usuario_id: number; numero_documento: string | null;
  fecha_compra: string; fecha_recepcion: string | null; moneda: string;
  estado: 'BORRADOR' | 'CONFIRMADA' | 'RECIBIDA' | 'ANULADA';
  observaciones: string | null; total: string;
}
export interface DetalleCompraRespuesta {
  id: number; producto_id: number; producto_nombre: string;
  lote_id: number; numero_lote: string; fecha_fabricacion: string | null;
  fecha_vencimiento: string | null; cantidad: number; costo_unitario: string;
  subtotal: string; observaciones: string | null;
}
export interface Compra extends CompraResumen { detalles: DetalleCompraRespuesta[]; }
export interface CompraOperacion { mensaje: string; compra: Compra; }
export interface LineaCompra {
  clave: number; producto: ProductoCompra; numeroLote: string;
  vencimiento: string | null; datos: DetalleCompraCrear;
}
