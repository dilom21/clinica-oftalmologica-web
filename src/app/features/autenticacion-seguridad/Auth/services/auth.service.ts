import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  MensajeRespuesta,
  RecuperarPasswordRequest,
  RestablecerPasswordRequest,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly loginUrl = `${environment.apiUrl}/seguridad/login`;
  private readonly recuperarPasswordUrl = `${environment.apiUrl}/seguridad/password/recuperar`;
  private readonly restablecerPasswordUrl = `${environment.apiUrl}/seguridad/password/restablecer`;

  constructor(private readonly http: HttpClient) {}

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, datos);
  }

  recuperarPassword(datos: RecuperarPasswordRequest): Observable<MensajeRespuesta> {
    return this.http.post<MensajeRespuesta>(this.recuperarPasswordUrl, datos);
  }

  restablecerPassword(datos: RestablecerPasswordRequest): Observable<MensajeRespuesta> {
    return this.http.post<MensajeRespuesta>(this.restablecerPasswordUrl, datos);
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }
}