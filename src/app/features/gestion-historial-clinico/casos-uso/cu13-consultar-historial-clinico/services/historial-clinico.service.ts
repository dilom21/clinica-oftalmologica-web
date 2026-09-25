import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { HistorialClinicoRespuesta } from '../models/historial-clinico.models';

@Injectable({ providedIn: 'root' })
export class HistorialClinicoService {
  private readonly historialClinicoUrl = `${environment.apiUrl}/historial-clinico`;

  constructor(private readonly http: HttpClient) {}

  obtenerHistorialClinico(pacienteId: number): Observable<HistorialClinicoRespuesta> {
    return this.http.get<HistorialClinicoRespuesta>(
      `${this.historialClinicoUrl}/${pacienteId}`,
    );
  }
}
