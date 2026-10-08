import { ConsultaClinicaOftalmologo } from '../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { ServicioOftalmologico } from '../../../../../interfaces/servicio-oftalmologico.interface';

/** Snapshot returned with a clinical record; legacy rows may preserve null catalog data. */
export type ServicioCatalogo = Omit<
  ServicioOftalmologico,
  'id' | 'descripcion' | 'precio_base' | 'duracion_estimada' | 'estado'
> & {
  id: number;
  descripcion: string | null;
  precio_base: number | null;
  duracion_estimada: number | null;
  estado: boolean | null;
};

export interface ServicioRealizadoGuardar {
  servicio_id: number;
  paciente_id: number;
  consulta_clinica_id: number | null;
  precio_aplicado?: number | null;
  fecha_realizacion?: string | null;
  observaciones: string | null;
}

export interface ServicioRealizadoLineaGuardar {
  servicio_id: number;
  precio_aplicado?: number | null;
  observaciones: string | null;
}

export interface ServiciosRealizadosLoteGuardar {
  paciente_id: number;
  consulta_clinica_id: number | null;
  fecha_realizacion: string;
  servicios: ServicioRealizadoLineaGuardar[];
}

export interface ServicioRealizado {
  id: number;
  servicio_id: number;
  paciente_id: number;
  consulta_clinica_id: number | null;
  oftalmologo_id: number;
  fecha_realizacion: string | null;
  precio_aplicado: number | null;
  observaciones: string | null;
  estado: boolean | null;
  servicio: ServicioCatalogo;
  paciente: { id: number; nombres: string; apellidos: string };
  oftalmologo: ConsultaClinicaOftalmologo;
}

export interface ServiciosRealizadosPagina {
  items: ServicioRealizado[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ServiciosRealizadosFiltros {
  paciente_id?: number;
  servicio_id?: number;
  consulta_clinica_id?: number;
  oftalmologo_id?: number;
  estado?: boolean;
  desde?: string;
  hasta?: string;
  page?: number;
  page_size?: number;
}
