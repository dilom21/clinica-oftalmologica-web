export type EstadoStock = 'NORMAL' | 'BAJO' | 'AGOTADO' | 'SIN_UMBRAL';
export type EstadoVencimiento = 'VIGENTE' | 'PROXIMO' | 'VENCIDO' | 'SIN_FECHA';
export type TipoAlerta = 'STOCK_BAJO' | 'AGOTADO' | 'PROXIMO_VENCIMIENTO' | 'VENCIDO';

export interface FiltrosInventario {
  q?: string;
  categoria?: string;
  stock?: 'TODOS' | 'BAJO' | 'AGOTADO' | 'NORMAL';
  vencimiento?: 'TODOS' | 'PROXIMO' | 'VENCIDO' | 'SIN_FECHA';
  dias_vencimiento?: number;
  page?: number;
  page_size?: number;
}

export interface LoteInventario {
  id: number;
  codigo: string;
  existencia: number;
  fecha_vencimiento: string | null;
  estado_vencimiento: EstadoVencimiento;
}

export interface ProductoInventario {
  id: number;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  stock_actual: number;
  stock_minimo: number | null;
  estado_stock: EstadoStock;
  lotes: LoteInventario[];
}

export interface PaginaInventario {
  items: ProductoInventario[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  resumen: {
    productos: number;
    stock_bajo: number;
    agotados: number;
    lotes_proximos: number;
    lotes_vencidos: number;
  };
  fecha_corte: string;
}

export interface AlertaInventario {
  tipo: TipoAlerta;
  producto_id: number;
  producto_nombre: string;
  lote_id: number | null;
  lote_codigo: string | null;
  existencia: number;
  fecha_vencimiento: string | null;
}

export interface PaginaAlertas {
  items: AlertaInventario[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  fecha_corte: string;
}

export interface LotesProducto {
  producto_id: number;
  lotes: LoteInventario[];
  fecha_corte: string;
}
