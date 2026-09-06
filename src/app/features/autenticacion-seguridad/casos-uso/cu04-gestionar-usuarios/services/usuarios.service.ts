import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  Usuario,
  UsuarioActualizar,
  UsuarioCrear,
  UsuarioEstadoActualizar,
} from '../models/usuarios.models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly usuariosUrl = `${environment.apiUrl}/seguridad/usuarios`;

  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.usuariosUrl);
  }

  obtenerUsuario(usuarioId: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.usuariosUrl}/${usuarioId}`);
  }

  crearUsuario(datos: UsuarioCrear): Observable<Usuario> {
    return this.http.post<Usuario>(this.usuariosUrl, datos);
  }

  actualizarUsuario(
    usuarioId: number,
    datos: UsuarioActualizar,
  ): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.usuariosUrl}/${usuarioId}`, datos);
  }

  actualizarEstadoUsuario(usuarioId: number, estado: boolean): Observable<Usuario> {
    const cuerpo: UsuarioEstadoActualizar = { estado };
    return this.http.patch<Usuario>(
      `${this.usuariosUrl}/${usuarioId}/estado`,
      cuerpo,
    );
  }
}
