import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CategoriaActualizar, CategoriaCrear, CategoriaRespuesta, EstadoActualizar, LoteActualizar, LoteCrear, LoteRespuesta, ProductoActualizar, ProductoCrear, ProductoRespuesta } from '../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/inventario-proveedores`;
  private params(incluirInactivos: boolean, filtro?: [string, number]): HttpParams {
    let p = new HttpParams().set('incluir_inactivos', String(incluirInactivos));
    return filtro ? p.set(filtro[0], String(filtro[1])) : p;
  }
  listarCategorias(incluirInactivos = false): Observable<CategoriaRespuesta[]> { return this.http.get<CategoriaRespuesta[]>(`${this.url}/categorias`, { params: this.params(incluirInactivos) }); }
  obtenerCategoria(id: number): Observable<CategoriaRespuesta> { return this.http.get<CategoriaRespuesta>(`${this.url}/categorias/${id}`); }
  crearCategoria(data: CategoriaCrear): Observable<CategoriaRespuesta> { return this.http.post<CategoriaRespuesta>(`${this.url}/categorias`, data); }
  actualizarCategoria(id: number, data: CategoriaActualizar): Observable<CategoriaRespuesta> { return this.http.put<CategoriaRespuesta>(`${this.url}/categorias/${id}`, data); }
  cambiarEstadoCategoria(id: number, estado: boolean): Observable<CategoriaRespuesta> { return this.http.patch<CategoriaRespuesta>(`${this.url}/categorias/${id}/estado`, { estado } satisfies EstadoActualizar); }
  listarProductos(categoriaId?: number, incluirInactivos = false): Observable<ProductoRespuesta[]> { return this.http.get<ProductoRespuesta[]>(`${this.url}/productos`, { params: this.params(incluirInactivos, categoriaId === undefined ? undefined : ['categoria_id', categoriaId]) }); }
  obtenerProducto(id: number): Observable<ProductoRespuesta> { return this.http.get<ProductoRespuesta>(`${this.url}/productos/${id}`); }
  crearProducto(data: ProductoCrear): Observable<ProductoRespuesta> { return this.http.post<ProductoRespuesta>(`${this.url}/productos`, data); }
  actualizarProducto(id: number, data: ProductoActualizar): Observable<ProductoRespuesta> { return this.http.put<ProductoRespuesta>(`${this.url}/productos/${id}`, data); }
  cambiarEstadoProducto(id: number, estado: boolean): Observable<ProductoRespuesta> { return this.http.patch<ProductoRespuesta>(`${this.url}/productos/${id}/estado`, { estado } satisfies EstadoActualizar); }
  listarLotes(productoId?: number, incluirInactivos = false): Observable<LoteRespuesta[]> { return this.http.get<LoteRespuesta[]>(`${this.url}/lotes`, { params: this.params(incluirInactivos, productoId === undefined ? undefined : ['producto_id', productoId]) }); }
  obtenerLote(id: number): Observable<LoteRespuesta> { return this.http.get<LoteRespuesta>(`${this.url}/lotes/${id}`); }
  crearLote(data: LoteCrear): Observable<LoteRespuesta> { return this.http.post<LoteRespuesta>(`${this.url}/lotes`, data); }
  actualizarLote(id: number, data: LoteActualizar): Observable<LoteRespuesta> { return this.http.put<LoteRespuesta>(`${this.url}/lotes/${id}`, data); }
  cambiarEstadoLote(id: number, estado: boolean): Observable<LoteRespuesta> { return this.http.patch<LoteRespuesta>(`${this.url}/lotes/${id}/estado`, { estado } satisfies EstadoActualizar); }
}
