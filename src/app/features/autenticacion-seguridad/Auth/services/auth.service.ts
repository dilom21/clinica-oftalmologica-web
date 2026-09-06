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

  obtenerUsuarioIdActual(): number | null {
    const claims = this.leerPayloadToken();
    if (!claims) {
      return null;
    }
    for (const clave of ['sub', 'user_id', 'usuario_id', 'id']) {
      const numero = this.numeroPositivo(claims[clave]);
      if (numero !== null) {
        return numero;
      }
    }
    return null;
  }

  obtenerRolIdActual(): number | null {
    const claims = this.leerPayloadToken();
    return claims ? this.numeroPositivo(claims['rol_id']) : null;
  }

  private leerPayloadToken(): Record<string, unknown> | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }
    try {
      const segmento = token.split('.')[1];
      if (!segmento) {
        return null;
      }
      const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
      const binario = atob(base64);
      const bytes = Uint8Array.from(binario, (caracter) =>
        caracter.charCodeAt(0),
      );
      const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<
        string,
        unknown
      >;
      return claims && typeof claims === 'object' ? claims : null;
    } catch {
      return null;
    }
  }

  private numeroPositivo(valor: unknown): number | null {
    if (valor === null || valor === undefined) {
      return null;
    }
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  }
}