import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  AgendaRespuesta,
  DisponibilidadRespuesta,
  OftalmologoAgenda,
} from '../models/agenda.models';

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly agendaCitasUrl = `${environment.apiUrl}/agenda-citas`;

  constructor(private readonly http: HttpClient) {}

  listarOftalmologos(): Observable<OftalmologoAgenda[]> {
    return this.http.get<OftalmologoAgenda[]>(`${this.agendaCitasUrl}/oftalmologos`);
  }

  obtenerDisponibilidad(oftalmologoId: number, fecha: string): Observable<DisponibilidadRespuesta> {
    const params = new HttpParams()
      .set('oftalmologo_id', String(oftalmologoId))
      .set('fecha', fecha);
    return this.http.get<DisponibilidadRespuesta>(`${this.agendaCitasUrl}/disponibilidad`, {
      params,
    });
  }

  obtenerAgenda(oftalmologoId: number, fecha: string): Observable<AgendaRespuesta> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<AgendaRespuesta>(
      `${this.agendaCitasUrl}/oftalmologos/${oftalmologoId}/agenda`,
      { params },
    );
  }
}
