import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnalisisConsultaIa,
  MejoraDiagnosticoIa,
  MejoraDiagnosticoPayload,
} from './ia-clinica.models';

@Injectable({ providedIn: 'root' })
export class IaClinicaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ia/consultas`;

  analizarConsulta(consultaId: number): Observable<AnalisisConsultaIa> {
    return this.http.post<AnalisisConsultaIa>(`${this.baseUrl}/${consultaId}/analizar`, null);
  }

  mejorarRedaccionDiagnostico(
    consultaId: number,
    payload: MejoraDiagnosticoPayload,
  ): Observable<MejoraDiagnosticoIa> {
    return this.http.post<MejoraDiagnosticoIa>(
      `${this.baseUrl}/${consultaId}/mejorar-redaccion-diagnostico`,
      { nombre: payload.nombre, descripcion: payload.descripcion },
    );
  }
}
