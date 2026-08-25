import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs'; 
import { Usuario } from '../interfaces/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = 'http://127.0.0.1:8000/usuarios-seguridad/usuarios';

  // Mensajero para actualizar la tabla
  private actualizacionSource = new Subject<void>();
  actualizacion$ = this.actualizacionSource.asObservable();

  // --- NUEVO MENSAJERO PARA LLEVAR DATOS AL FORMULARIO ---
  private usuarioEdicionSource = new Subject<any>();
  usuarioEdicion$ = this.usuarioEdicionSource.asObservable();

  constructor(private http: HttpClient) { }

  registrarUsuario(usuario: Usuario): Observable<any> {
    return this.http.post<any>(this.apiUrl, usuario);
  }

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // --- NUEVA FUNCIÓN PUT ---
  actualizarUsuario(id: number, usuario: Usuario): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, usuario);
  }

  notificarActualizacion() {
    this.actualizacionSource.next();
  }

  // --- FUNCIÓN PARA MANDAR DATOS AL FORMULARIO ---
  enviarDatosParaEdicion(usuario: any) {
    this.usuarioEdicionSource.next(usuario);
  }
}