import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ServicioOftalmologico,
  ServicioOftalmologicoGuardar,
  ServicioUpdate,
} from '../interfaces/servicio-oftalmologico.interface';
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

  crearServicio(servicio: ServicioOftalmologicoGuardar): Observable<ServicioOftalmologico> {
    return this.http.post<ServicioOftalmologico>(this.apiUrl, servicio);
  }

  actualizarServicio(
    id: number,
    servicio: ServicioUpdate,
  ): Observable<ServicioOftalmologico> {
    return this.http.put<ServicioOftalmologico>(`${this.apiUrl}${id}`, servicio);
  }

  /** Compatibilidad con CU22: la baja es lógica y usa el PUT confirmado por CU21. */
  eliminarServicio(id: number): Observable<ServicioOftalmologico> {
    return this.actualizarServicio(id, { estado: false });
  }
}
