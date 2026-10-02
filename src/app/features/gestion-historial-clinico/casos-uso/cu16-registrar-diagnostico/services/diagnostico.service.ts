import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { DiagnosticoCrear, DiagnosticoRespuesta } from '../models/diagnostico.models';

@Injectable({ providedIn: 'root' })
export class DiagnosticoService {
  private readonly diagnosticosBaseUrl = `${environment.apiUrl}/historial-clinico/consultas`;

  constructor(private readonly http: HttpClient) {}

  /** Registra un diagnóstico para la consulta clínica indicada. */
  registrarDiagnostico(
    consultaId: number,
    datos: DiagnosticoCrear,
  ): Observable<DiagnosticoRespuesta> {
    return this.http.post<DiagnosticoRespuesta>(
      `${this.diagnosticosBaseUrl}/${consultaId}/diagnosticos`,
      datos,
    );
  }

  /** Obtiene los diagnósticos existentes de una consulta clínica. */
  listarDiagnosticos(consultaId: number): Observable<DiagnosticoRespuesta[]> {
    return this.http.get<DiagnosticoRespuesta[]>(
      `${this.diagnosticosBaseUrl}/${consultaId}/diagnosticos`,
    );
  }
}