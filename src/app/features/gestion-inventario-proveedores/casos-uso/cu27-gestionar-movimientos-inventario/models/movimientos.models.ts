export type TipoManual =
  | 'STOCK_INICIAL'
  | 'SALIDA_USO'
  | 'AJUSTE_ENTRADA'
  | 'AJUSTE_SALIDA'
  | 'SALIDA_VENCIMIENTO';

export type TipoMovimiento = TipoManual | 'ENTRADA_COMPRA' | 'DEVOLUCION_ENTRADA' | 'DEVOLUCION_PROVEEDOR';

export interface MovimientoManualCrear {
  lote_id: number;
  tipo: TipoManual;
  cantidad: number;
  observaciones?: string | null;
}

export interface MovimientoRespuesta {
  id: number;
  inventario_id: number;
  lote_id: number;
  usuario_id: number | null;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  fecha_hora: string;
  observaciones: string | null;
  referencia_tipo: string | null;
  referencia_id: number | null;
}

export interface ExistenciaRespuesta {
  lote_id: number;
  inventario_id: number | null;
  stock_actual: number;
  stock_reservado: number;
  stock_disponible: number;
}
