export interface ProveedorDatos {
  razon_social: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  contacto: string | null;
}

export interface Proveedor extends ProveedorDatos {
  id: number;
  estado: boolean | null;
}

export interface ProveedoresPagina {
  items: Proveedor[];
  total: number;
  pagina: number;
  tamanio: number;
}

export interface ProveedorOperacion {
  mensaje: string;
  proveedor: Proveedor;
}

export type ProveedorCambios = Partial<ProveedorDatos & { estado: boolean }>;