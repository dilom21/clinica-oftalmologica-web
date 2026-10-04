import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServicioOftalmologico } from '../interfaces/servicio-oftalmologico.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServicioOftalmologicoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/servicios-oftalmologicos/`;

  listarServicios(): Observable<ServicioOftalmologico[]> {
    return this.http.get<ServicioOftalmologico[]>(this.apiUrl);
  }

  crearServicio(servicio: ServicioOftalmologico): Observable<ServicioOftalmologico> {
    return this.http.post<ServicioOftalmologico>(this.apiUrl, servicio);
  }

  actualizarServicio(id: number, servicio: ServicioOftalmologico): Observable<ServicioOftalmologico> {
    return this.http.put<ServicioOftalmologico>(`${this.apiUrl}${id}`, servicio);
  }

  // FUNCIÓN AGREGADA PARA ELIMINAR
  eliminarServicio(id: number): Observable<ServicioOftalmologico> {
    return this.http.put<ServicioOftalmologico>(`${this.apiUrl}${id}`, { estado: false });
  }
}