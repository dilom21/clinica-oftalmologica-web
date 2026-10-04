import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConsultaClinicaOftalmologo } from '../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import {
  ControlMedicoActualizar,
  ControlMedicoCrear,
  ControlMedicoRespuesta,
  ControlesFiltros,
} from '../models/control-medico.models';

@Injectable({ providedIn: 'root' })
export class ControlMedicoService {
  private readonly baseUrl = `${environment.apiUrl}/historial-clinico`;

  constructor(private readonly http: HttpClient) {}

  obtenerOftalmologoActual(): Observable<ConsultaClinicaOftalmologo | null> {
    return this.http.get<ConsultaClinicaOftalmologo | null>(
      `${this.baseUrl}/controles/oftalmologo-actual`,
    );
  }

  programarControl(consultaId: number, datos: ControlMedicoCrear): Observable<ControlMedicoRespuesta> {
    return this.http.post<ControlMedicoRespuesta>(
      `${this.baseUrl}/consultas/${consultaId}/controles`, datos,
    );
  }

  listarControlesConsulta(consultaId: number): Observable<ControlMedicoRespuesta[]> {
    return this.http.get<ControlMedicoRespuesta[]>(
      `${this.baseUrl}/consultas/${consultaId}/controles`,
    );
  }

  listarControles(filtros: ControlesFiltros): Observable<ControlMedicoRespuesta[]> {
    let params = new HttpParams();
    if (filtros.paciente_id !== undefined) params = params.set('paciente_id', filtros.paciente_id);
    if (filtros.consulta_clinica_id !== undefined) params = params.set('consulta_clinica_id', filtros.consulta_clinica_id);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<ControlMedicoRespuesta[]>(`${this.baseUrl}/controles`, { params });
  }

  obtenerControl(controlId: number): Observable<ControlMedicoRespuesta> {
    return this.http.get<ControlMedicoRespuesta>(`${this.baseUrl}/controles/${controlId}`);
  }

  actualizarControl(controlId: number, datos: ControlMedicoActualizar): Observable<ControlMedicoRespuesta> {
    return this.http.put<ControlMedicoRespuesta>(`${this.baseUrl}/controles/${controlId}`, datos);
  }
}
