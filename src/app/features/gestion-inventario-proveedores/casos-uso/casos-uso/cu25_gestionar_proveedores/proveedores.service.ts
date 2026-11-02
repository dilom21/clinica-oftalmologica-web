import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Proveedor, ProveedorCambios, ProveedorDatos, ProveedorOperacion, ProveedoresPagina } from './proveedores.models';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl.replace(/\/$/, '')}/proveedores/`;

  listar(pagina = 1, estado = true, buscar = '') {
    let params = new HttpParams().set('pagina', pagina).set('estado', estado);
    if (buscar.trim()) params = params.set('buscar', buscar.trim());
    return this.http.get<ProveedoresPagina>(this.url, { params });
  }

  consultar(id: number) {
    return this.http.get<Proveedor>(`${this.url}${id}`);
  }

  crear(datos: ProveedorDatos) {
    return this.http.post<ProveedorOperacion>(this.url, datos);
  }

  actualizar(id: number, datos: ProveedorCambios) {
    return this.http.put<ProveedorOperacion>(`${this.url}${id}`, datos);
  }

  darBaja(id: number) {
    return this.http.delete<void>(`${this.url}${id}`, { params: { confirmar: true } });
  }

  reactivar(id: number) {
    return this.actualizar(id, { estado: true });
  }
}