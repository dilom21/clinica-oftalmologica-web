import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  BitacoraFiltros,
  BitacoraPaginadaRespuesta,
} from '../models/bitacora.models';

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private readonly bitacoraUrl = `${environment.apiUrl}/seguridad/bitacora`;

  constructor(private readonly http: HttpClient) {}

  consultar(
    filtros: BitacoraFiltros,
    page: number,
    pageSize: number,
  ): Observable<BitacoraPaginadaRespuesta> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    params = params.set('page', page).set('page_size', pageSize);
    return this.http.get<BitacoraPaginadaRespuesta>(this.bitacoraUrl, { params });
  }
}