import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  FiltrosInventario,
  LotesProducto,
  PaginaAlertas,
  PaginaInventario,
} from '../models/inventario.models';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/inventario-proveedores`;

  consultar(filtros: FiltrosInventario = {}): Observable<PaginaInventario> {
    return this.http.get<PaginaInventario>(`${this.url}/inventario`, {
      params: this.parametros(filtros),
    });
  }

  alertas(filtros: FiltrosInventario = {}): Observable<PaginaAlertas> {
    return this.http.get<PaginaAlertas>(`${this.url}/alertas`, {
      params: this.parametros(filtros),
    });
  }

  lotes(productoId: number, diasVencimiento = 30): Observable<LotesProducto> {
    return this.http.get<LotesProducto>(`${this.url}/productos/${productoId}/lotes`, {
      params: new HttpParams().set('dias_vencimiento', diasVencimiento),
    });
  }

  private parametros(filtros: FiltrosInventario): HttpParams {
    let params = new HttpParams();
    for (const clave of [
      'q',
      'categoria',
      'stock',
      'vencimiento',
      'dias_vencimiento',
      'page',
      'page_size',
    ] as const) {
      const valor = filtros[clave];
      if (valor !== undefined && valor !== null && valor !== '')
        params = params.set(clave, String(valor));
    }
    return params;
  }
}
