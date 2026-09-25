import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  HistorialCitasFiltros,
  HistorialCitasRespuesta,
} from '../models/historial-citas.models';

@Injectable({ providedIn: 'root' })
export class HistorialCitasService {
  private readonly http = inject(HttpClient);
  private readonly historialUrl = `${environment.apiUrl}/agenda-citas/historial`;

  consultar(filtros: HistorialCitasFiltros): Observable<HistorialCitasRespuesta> {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }

    return this.http.get<HistorialCitasRespuesta>(this.historialUrl, { params });
  }
}
