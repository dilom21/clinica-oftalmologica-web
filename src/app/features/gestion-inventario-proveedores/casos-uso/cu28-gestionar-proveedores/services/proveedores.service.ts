import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import {
  FiltrosProveedores,
  Proveedor,
  ProveedorActualizar,
  ProveedorGuardar,
} from '../models/proveedores.models';

/**
 * Cliente HTTP de CU28. El token tenant lo agrega `authInterceptor`, así que
 * cada clínica solo ve y modifica sus propios proveedores.
 */
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/proveedores/`;

  listar(filtros: FiltrosProveedores): Observable<Proveedor[]> {
    let params = new HttpParams().set('estado', String(filtros.estado));
    const busqueda = filtros.busqueda?.trim();
    if (busqueda) params = params.set('busqueda', busqueda);
    if (filtros.skip !== undefined) params = params.set('skip', filtros.skip);
    if (filtros.limit !== undefined) params = params.set('limit', filtros.limit);
    return this.http.get<Proveedor[]>(this.apiUrl, { params });
  }

  crear(datos: ProveedorGuardar): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.apiUrl, datos);
  }

  actualizar(id: number, datos: ProveedorActualizar): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.apiUrl}${id}`, datos);
  }

  /** Baja lógica: el backend conserva la fila porque las compras la referencian. */
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }

  reactivar(id: number): Observable<Proveedor> {
    return this.actualizar(id, { estado: true });
  }
}
