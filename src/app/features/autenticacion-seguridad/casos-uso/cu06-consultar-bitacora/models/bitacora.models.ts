export interface RegistroBitacora {
  id: number;
  usuario_id: number | null;
  fecha_hora: string;
  ip: string | null;
  accion: string;
  entidad_afectada: string | null;
  id_registro_afectado: number | null;
  descripcion: string | null;
}

export interface BitacoraFiltros {
  usuario_id?: number;
  accion?: string;
  entidad_afectada?: string;
  id_registro_afectado?: number;
  desde?: string;
  hasta?: string;
}

export interface BitacoraPaginadaRespuesta {
  items: RegistroBitacora[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}