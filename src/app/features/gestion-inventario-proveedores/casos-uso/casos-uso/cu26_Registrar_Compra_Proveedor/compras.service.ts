import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Compra, CompraCrear, CompraOperacion, CompraResumen, LoteCompra, Pagina, ProductoCompra, ProveedorCompra } from './compras.models';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl.replace(/\/$/, '')}/compras`;

  proveedores(pagina = 1, buscar = '') {
    return this.http.get<Pagina<ProveedorCompra>>(`${this.url}/proveedores`, { params: this.filtros(pagina, buscar) });
  }
  productos(pagina = 1, buscar = '') {
    return this.http.get<Pagina<ProductoCompra>>(`${this.url}/productos`, { params: this.filtros(pagina, buscar) });
  }
  lotes(productoId: number, pagina = 1) {
    return this.http.get<Pagina<LoteCompra>>(`${this.url}/productos/${productoId}/lotes`, { params: { pagina } });
  }
  listar(pagina = 1) {
    return this.http.get<Pagina<CompraResumen>>(`${this.url}/`, { params: { pagina } });
  }
  consultar(id: number) { return this.http.get<Compra>(`${this.url}/${id}`); }
  crear(datos: CompraCrear) { return this.http.post<CompraOperacion>(`${this.url}/`, datos); }

  private filtros(pagina: number, buscar: string) {
    let params = new HttpParams().set('pagina', pagina);
    if (buscar.trim()) params = params.set('buscar', buscar.trim());
    return params;
  }
}
