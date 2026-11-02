/** Contrato de `/proveedores` (CU28). Los opcionales viajan como `null`. */
export interface Proveedor {
  id: number;
  razon_social: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  contacto: string | null;
  estado: boolean | null;
}

export type ProveedorGuardar = Omit<Proveedor, 'id' | 'estado'>;

export type ProveedorActualizar = Partial<ProveedorGuardar> & { estado?: boolean };

export interface FiltrosProveedores {
  estado: boolean;
  busqueda?: string;
  skip?: number;
  limit?: number;
}
