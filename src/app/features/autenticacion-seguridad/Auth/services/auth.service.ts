import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  TenantCompany,
  TenantLoginRequest,
  MensajeRespuesta,
  RecuperarPasswordRequest,
  RestablecerPasswordRequest,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly freshlyIssuedTenantToken = signal<string | null>(null);
  private readonly loginUrl = `${environment.apiUrl}/seguridad/login`;
  private readonly tenantUrl = `${environment.apiUrl}/seguridad/tenant`;
  private readonly recuperarPasswordUrl = `${environment.apiUrl}/seguridad/password/recuperar`;
  private readonly restablecerPasswordUrl = `${environment.apiUrl}/seguridad/password/restablecer`;

  constructor(private readonly http: HttpClient) {}

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, datos);
  }

  companies(): Observable<TenantCompany[]> {
    return this.http.get<TenantCompany[]>(`${this.tenantUrl}/empresas`);
  }

  tenantLogin(datos: TenantLoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.tenantUrl}/login`, datos);
  }

  // Decoding a JWT is not signature verification. The API remains the authority.
  tenantCode(token = localStorage.getItem('access_token')): string | null {
    const claims = this.decodeToken(token);
    return claims?.['token_type'] === 'tenant' &&
      typeof claims['empresa_codigo'] === 'string' && claims['empresa_codigo'].length > 0 &&
      typeof claims['exp'] === 'number' && claims['exp'] > Date.now() / 1000 &&
      Number.isInteger(claims['tenant_id']) && (claims['tenant_id'] as number) > 0
      ? claims['empresa_codigo'] as string : null;
  }

  acceptTenantToken(token: string, selectedCode: string): boolean {
    if (this.tenantCode(token) !== selectedCode) return false;
    localStorage.setItem('access_token', token);
    this.freshlyIssuedTenantToken.set(token);
    return true;
  }

  hasFreshTenantToken(token: string | null): boolean {
    return !!token && this.freshlyIssuedTenantToken() === token;
  }

  recuperarPassword(datos: RecuperarPasswordRequest): Observable<MensajeRespuesta> {
    return this.http.post<MensajeRespuesta>(this.recuperarPasswordUrl, datos);
  }

  restablecerPassword(datos: RestablecerPasswordRequest): Observable<MensajeRespuesta> {
    return this.http.post<MensajeRespuesta>(this.restablecerPasswordUrl, datos);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.freshlyIssuedTenantToken.set(null);
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
    return this.decodeToken(localStorage.getItem('access_token'));
  }

  private decodeToken(token: string | null): Record<string, unknown> | null {
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
