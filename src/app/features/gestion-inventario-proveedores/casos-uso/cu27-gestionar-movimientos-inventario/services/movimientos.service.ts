import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ExistenciaRespuesta,
  MovimientoManualCrear,
  MovimientoRespuesta,
} from '../models/movimientos.models';

export interface FiltroMovimientos {
  loteId?: number;
  skip?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class MovimientosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/inventario-proveedores`;

  registrarMovimiento(datos: MovimientoManualCrear): Observable<MovimientoRespuesta> {
    return this.http.post<MovimientoRespuesta>(`${this.url}/movimientos`, datos);
  }

  listarMovimientos(filtro: FiltroMovimientos = {}): Observable<MovimientoRespuesta[]> {
    let params = new HttpParams();
    if (filtro.loteId !== undefined) params = params.set('lote_id', String(filtro.loteId));
    if (filtro.skip !== undefined) params = params.set('skip', String(filtro.skip));
    if (filtro.limit !== undefined) params = params.set('limit', String(filtro.limit));
    return this.http.get<MovimientoRespuesta[]>(`${this.url}/movimientos`, { params });
  }

  consultarExistencia(loteId: number): Observable<ExistenciaRespuesta> {
    return this.http.get<ExistenciaRespuesta>(`${this.url}/existencias/${loteId}`);
  }
}
