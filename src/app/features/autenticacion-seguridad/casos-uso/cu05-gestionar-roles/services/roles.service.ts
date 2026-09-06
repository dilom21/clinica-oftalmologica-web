import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  Accion,
  Modulo,
  PermisoRolRespuesta,
  Rol,
  RolActualizar,
  RolCrear,
} from '../models/roles.models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly rolesUrl = `${environment.apiUrl}/seguridad/roles`;
  private readonly modulosFuncionesUrl = `${environment.apiUrl}/seguridad/modulos-funciones`;
  private readonly accionesUrl = `${environment.apiUrl}/seguridad/acciones`;

  constructor(private readonly http: HttpClient) {}

  listarRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.rolesUrl);
  }

  obtenerRol(rolId: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.rolesUrl}/${rolId}`);
  }

  obtenerPermisosRol(rolId: number): Observable<PermisoRolRespuesta[]> {
    return this.http.get<PermisoRolRespuesta[]>(`${this.rolesUrl}/${rolId}/permisos`);
  }

  crearRol(datos: RolCrear): Observable<Rol> {
    return this.http.post<Rol>(this.rolesUrl, datos);
  }

  actualizarRol(rolId: number, datos: RolActualizar): Observable<Rol> {
    return this.http.put<Rol>(`${this.rolesUrl}/${rolId}`, datos);
  }

  desactivarRol(rolId: number): Observable<Rol> {
    return this.http.delete<Rol>(`${this.rolesUrl}/${rolId}`);
  }

  listarModulosFunciones(): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(this.modulosFuncionesUrl);
  }

  listarAcciones(): Observable<Accion[]> {
    return this.http.get<Accion[]>(this.accionesUrl);
  }
}
