import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { EstadoCuentaRespuesta } from '../models/estado-cuenta.models';

@Injectable({ providedIn: 'root' })
export class EstadoCuentaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pagos/administrativos/estado-cuenta`;

  consultar(pacienteId: number): Observable<EstadoCuentaRespuesta> {
    return this.http.get<EstadoCuentaRespuesta>(`${this.baseUrl}/${pacienteId}`);
  }
}
