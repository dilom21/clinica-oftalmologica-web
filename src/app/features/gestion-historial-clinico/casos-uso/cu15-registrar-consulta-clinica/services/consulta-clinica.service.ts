import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ConsultaClinicaCrear,
  ConsultaClinicaRespuesta,
} from '../models/consulta-clinica.models';

export interface ConsultasFiltros {
  paciente_id?: number;
  oftalmologo_id?: number;
  estado?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ConsultaClinicaService {
  private readonly consultasUrl = `${environment.apiUrl}/historial-clinico/consultas`;

  constructor(private readonly http: HttpClient) {}

  registrarConsulta(
    datos: ConsultaClinicaCrear,
  ): Observable<ConsultaClinicaRespuesta> {
    return this.http.post<ConsultaClinicaRespuesta>(this.consultasUrl, datos);
  }

  /** Lista consultas clínicas con filtros opcionales. */
  listarConsultas(filtros: ConsultasFiltros = {}): Observable<ConsultaClinicaRespuesta[]> {
    let params = new HttpParams();
    if (filtros.paciente_id !== undefined) {
      params = params.set('paciente_id', String(filtros.paciente_id));
    }
    if (filtros.oftalmologo_id !== undefined) {
      params = params.set('oftalmologo_id', String(filtros.oftalmologo_id));
    }
    if (filtros.estado !== undefined) {
      params = params.set('estado', String(filtros.estado));
    }
    if (filtros.fecha_desde) {
      params = params.set('fecha_desde', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      params = params.set('fecha_hasta', filtros.fecha_hasta);
    }
    return this.http.get<ConsultaClinicaRespuesta[]>(this.consultasUrl, { params });
  }
}
