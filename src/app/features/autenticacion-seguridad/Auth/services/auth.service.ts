import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { MenuService } from '../../../../core/services/menu.service';
import {
  LoginRequest,
  LoginResponse,
  TenantCompany,
  TenantLoginRequest,
  MensajeRespuesta,
  PerfilUsuario,
  RecuperarPasswordRequest,
  RestablecerPasswordRequest,
  nombreRol,
} from '../models/auth.models';

const CLAVE_TOKEN = 'access_token';
const CLAVE_CORREO = 'sesion_correo';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly freshlyIssuedTenantToken = signal<string | null>(null);
  private readonly loginUrl = `${environment.apiUrl}/seguridad/login`;
  private readonly tenantUrl = `${environment.apiUrl}/seguridad/tenant`;
  private readonly recuperarPasswordUrl = `${environment.apiUrl}/seguridad/password/recuperar`;
  private readonly restablecerPasswordUrl = `${environment.apiUrl}/seguridad/password/restablecer`;

  private readonly menuService = inject(MenuService);

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

  /**
   * Registra la sesión local tras un login correcto: guarda el token y el
   * correo con el que se autenticó el usuario (dato real, no inventado) para
   * poder mostrarlo en la interfaz.
   */
  registrarSesion(accessToken: string, correo: string): void {
    try {
      localStorage.setItem(CLAVE_TOKEN, accessToken);
      localStorage.setItem(CLAVE_CORREO, correo.trim());
    } catch {
      // Almacenamiento no disponible.
    }
    this.menuService.limpiar();
  }

  logout(): void {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_CORREO);
    } catch {
      // Almacenamiento no disponible.
    }
    // El menú pertenece a la sesión: se limpia para que el siguiente usuario
    // vuelva a cargar sus permisos.
    this.menuService.limpiar();
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

  /**
   * Datos de la sesión actual para la interfaz (sidebar, inicio).
   *
   * Se derivan exclusivamente de información disponible: claims del token
   * (sub, rol_id, nombre/correo si existen) y el correo guardado al iniciar
   * sesión. Devuelve `null` si no hay token válido.
   */
  obtenerPerfilActual(): PerfilUsuario | null {
    const claims = this.leerPayloadToken();
    if (!claims) {
      return null;
    }

    const usuarioId = this.obtenerUsuarioIdActual();
    const rolId = this.numeroPositivo(claims['rol_id']);

    const nombreClaim = this.leerTextoClaim(claims, [
      'nombre',
      'nombres',
      'nombre_completo',
      'name',
      'full_name',
    ]);
    const correoClaim = this.leerTextoClaim(claims, ['correo', 'email', 'mail']);
    const correoGuardado = this.leerCorreoGuardado();
    const correo = correoClaim ?? correoGuardado;

    const nombre = nombreClaim;
    const nombreMostrar = nombre ?? correo ?? 'Sesión activa';
    const rolNombre = nombreRol(rolId);

    return {
      usuarioId,
      rolId,
      rolNombre,
      correo,
      nombre,
      nombreMostrar,
      iniciales: this.calcularIniciales(nombreMostrar),
    };
  }

  private leerCorreoGuardado(): string | null {
    try {
      const valor = localStorage.getItem(CLAVE_CORREO);
      return valor && valor.trim() ? valor.trim() : null;
    } catch {
      return null;
    }
  }

  private leerTextoClaim(
    claims: Record<string, unknown>,
    claves: ReadonlyArray<string>,
  ): string | null {
    for (const clave of claves) {
      const valor = claims[clave];
      if (typeof valor === 'string' && valor.trim()) {
        return valor.trim();
      }
    }
    return null;
  }

  private calcularIniciales(valor: string): string {
    const partes = valor
      .split(/[\s._@-]+/)
      .map((parte) => parte.trim())
      .filter(Boolean);
    if (partes.length === 0) {
      return 'US';
    }
    const primera = partes[0].charAt(0);
    const segunda = partes.length > 1 ? partes[1].charAt(0) : partes[0].charAt(1);
    return `${primera}${segunda}`.toUpperCase();
  }

  private leerPayloadToken(): Record<string, unknown> | null {
    let token: string | null = null;
    try {
      token = localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
    return this.decodeToken(token);
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
