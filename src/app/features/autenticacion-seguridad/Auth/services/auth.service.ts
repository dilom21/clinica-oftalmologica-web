import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { defer, Observable, Subscription, tap } from 'rxjs';
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
/**
 * Identidad de la empresa de la sesión vigente. Se guarda en `sessionStorage`
 * (por pestaña, sobrevive a F5) solo para presentación: nunca sustituye la
 * validación del tenant que hace el backend en cada solicitud.
 */
const CLAVE_EMPRESA = 'sesion_empresa';

/** Estado de resolución de la empresa del JWT tenant vigente. */
export type EstadoEmpresaSesion = 'sin-tenant' | 'verificando' | 'listo' | 'error';

/**
 * Empresa autenticada. `codigo` y `tenantId` provienen de los claims del JWT y
 * `nombre` del catálogo público de empresas; ambos los emite el backend.
 */
export interface EmpresaSesion {
  codigo: string;
  nombre: string;
  tenantId: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly revisionSesionSignal = signal(0);
  private readonly revisionPerfilSignal = signal(0);
  private tokenObservado = this.leerToken();
  private correoObservado = this.leerCorreoGuardado();
  private correoPerfil = this.correoObservado;
  private generacionEmpresa = 0;
  private destruido = false;
  readonly revisionSesion = this.revisionSesionSignal.asReadonly();
  readonly revisionPerfil = this.revisionPerfilSignal.asReadonly();
  private readonly freshlyIssuedTenantToken = signal<string | null>(null);
  /** Empresa resuelta para el JWT tenant vigente; se comparte con toda la UI. */
  private readonly empresaSignal = signal<EmpresaSesion | null>(null);
  private readonly estadoEmpresaSignal = signal<EstadoEmpresaSesion>('sin-tenant');
  /**
   * Catálogo público de empresas. Se reutiliza durante la sesión para resolver
   * el nombre de la empresa sin repetir `GET /seguridad/tenant/empresas` en
   * cada navegación. Es información pública (la muestra el propio login), no
   * un dato privado de la empresa.
   */
  private catalogoEmpresas: TenantCompany[] | null = null;
  private suscripcionEmpresa: Subscription | null = null;

  readonly empresa = this.empresaSignal.asReadonly();
  readonly estadoEmpresa = this.estadoEmpresaSignal.asReadonly();
  readonly empresaNombre = computed(() => this.empresaSignal()?.nombre ?? null);
  private readonly loginUrl = `${environment.apiUrl}/seguridad/login`;
  private readonly tenantUrl = `${environment.apiUrl}/seguridad/tenant`;
  private readonly recuperarPasswordUrl = `${environment.apiUrl}/seguridad/password/recuperar`;
  private readonly restablecerPasswordUrl = `${environment.apiUrl}/seguridad/password/restablecer`;

  private readonly menuService = inject(MenuService);
  private readonly ventana = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly http: HttpClient) {
    const sincronizarStorage = (evento: StorageEvent) => {
      if (evento.key !== CLAVE_TOKEN && evento.key !== CLAVE_CORREO && evento.key !== null) return;
      const revision = this.revisionSesionSignal();
      this.sincronizarSesion();
      if (
        (revision !== this.revisionSesionSignal() || this.menuService.estado() === 'inicial') &&
        this.contextoDeToken(this.leerToken())
      ) {
        this.menuService.cargar();
      }
    };
    this.ventana?.addEventListener('storage', sincronizarStorage);
    this.destroyRef.onDestroy(() => {
      this.destruido = true;
      this.generacionEmpresa++;
      this.suscripcionEmpresa?.unsubscribe();
      this.ventana?.removeEventListener('storage', sincronizarStorage);
    });
  }

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, datos);
  }

  companies(): Observable<TenantCompany[]> {
    return defer(() => {
      const token = this.leerToken();
      const revision = this.revisionSesionSignal();
      return this.http.get<TenantCompany[]>(`${this.tenantUrl}/empresas`).pipe(
        tap((empresas) => {
          if (
            !this.destruido &&
            token === this.leerToken() &&
            revision === this.revisionSesionSignal()
          ) {
            this.catalogoEmpresas = empresas ?? [];
          }
        }),
      );
    });
  }

  tenantLogin(datos: TenantLoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.tenantUrl}/login`, datos);
  }

  // Decoding a JWT is not signature verification. The API remains the authority.
  tenantCode(token = this.leerToken()): string | null {
    return this.contextoDeToken(token)?.codigo ?? null;
  }

  /**
   * Identidad tenant afirmada por el JWT: código de empresa y `tenant_id`. Solo
   * se acepta un token tenant vigente; la firma la valida el backend en cada
   * solicitud, así que esto no sustituye ninguna verificación de seguridad.
   */
  private contextoDeToken(token: string | null): { codigo: string; tenantId: number } | null {
    const claims = this.decodeToken(token);
    if (!claims) {
      return null;
    }
    const codigo = claims['empresa_codigo'];
    const tenantId = claims['tenant_id'];
    const expiracion = claims['exp'];
    if (
      claims['token_type'] !== 'tenant' ||
      typeof codigo !== 'string' ||
      !codigo.trim() ||
      typeof expiracion !== 'number' ||
      !Number.isFinite(expiracion) ||
      expiracion <= Date.now() / 1000 ||
      !Number.isInteger(tenantId) ||
      (tenantId as number) <= 0
    ) {
      return null;
    }
    return { codigo: codigo.trim(), tenantId: tenantId as number };
  }

  acceptTenantToken(token: string, selectedCode: string): boolean {
    if (this.tenantCode(token) !== selectedCode) return false;
    localStorage.setItem(CLAVE_TOKEN, token);
    this.sincronizarSesion();
    if (this.leerToken() !== token) return false;
    this.freshlyIssuedTenantToken.set(token);
    this.inicializarContextoEmpresa();
    return true;
  }

  hasFreshTenantToken(token: string | null): boolean {
    return (
      !!token &&
      token === this.tokenObservado &&
      token === this.leerToken() &&
      this.freshlyIssuedTenantToken() === token
    );
  }

  sincronizarSesion(): void {
    const token = this.leerToken();
    if (this.destruido) return;
    if (token === this.tokenObservado) {
      this.sincronizarPerfil();
      return;
    }
    const anterior = this.decodeToken(this.tokenObservado);
    const actual = this.decodeToken(token);
    const mismaIdentidad =
      !!anterior &&
      !!actual &&
      anterior['sub'] != null &&
      anterior['sub'] === actual['sub'] &&
      anterior['tenant_id'] === actual['tenant_id'] &&
      anterior['empresa_codigo'] === actual['empresa_codigo'];
    const correo = this.leerCorreoGuardado();
    this.correoPerfil = correo !== this.correoObservado || mismaIdentidad ? correo : null;
    this.correoObservado = correo;
    this.tokenObservado = token;
    this.revisionSesionSignal.update((revision) => revision + 1);
    this.revisionPerfilSignal.update((revision) => revision + 1);
    this.freshlyIssuedTenantToken.set(null);
    this.limpiarEmpresa();
    this.menuService.sincronizarSesion();
    this.resolverContextoActual();
  }

  private sincronizarPerfil(): void {
    const correo = this.leerCorreoGuardado();
    if (correo === this.correoObservado) return;
    this.correoObservado = correo;
    this.correoPerfil = correo;
    this.revisionPerfilSignal.update((revision) => revision + 1);
  }

  esSesionActual(revision: number): boolean {
    return (
      !this.destruido &&
      revision === this.revisionSesionSignal() &&
      this.tokenObservado === this.leerToken()
    );
  }

  empresaCoincideConSesion(): boolean {
    const claims = this.contextoDeToken(this.leerToken());
    const empresa = this.empresaSignal();
    return (
      this.esSesionActual(this.revisionSesionSignal()) &&
      this.estadoEmpresaSignal() === 'listo' &&
      !!claims &&
      !!empresa &&
      empresa.codigo === claims.codigo &&
      empresa.tenantId === claims.tenantId
    );
  }

  /**
   * Resuelve UNA vez por sesión la empresa que respalda el JWT tenant.
   *
   * Orden de resolución, sin peticiones de más:
   * 1. contexto ya validado para el token vigente;
   * 2. empresa restaurada de `sessionStorage` tras F5, solo si su `codigo` y
   *    `tenant_id` coinciden con los del JWT actual;
   * 3. catálogo público ya consultado en esta sesión (el login lo carga);
   * 4. `GET /seguridad/tenant/empresas`, una única vez y compartido.
   *
   * Es idempotente: las nuevas instancias del sidebar no repiten la consulta.
   */
  inicializarContextoEmpresa(): void {
    this.sincronizarSesion();
    this.resolverContextoActual();
  }

  private resolverContextoActual(): void {
    if (this.destruido) return;
    const claims = this.contextoDeToken(this.leerToken());
    if (!claims) {
      this.limpiarEmpresa();
      return;
    }

    const actual = this.empresaSignal();
    if (
      actual &&
      this.estadoEmpresaSignal() === 'listo' &&
      actual.codigo === claims.codigo &&
      actual.tenantId === claims.tenantId
    ) {
      return;
    }

    if (this.estadoEmpresaSignal() === 'verificando') {
      return;
    }

    const guardada = this.leerEmpresaGuardada();
    if (guardada && guardada.codigo === claims.codigo && guardada.tenantId === claims.tenantId) {
      this.empresaSignal.set(guardada);
      this.estadoEmpresaSignal.set('listo');
      return;
    }

    if (this.catalogoEmpresas) {
      this.resolverEmpresa(this.catalogoEmpresas, claims);
      return;
    }

    this.estadoEmpresaSignal.set('verificando');
    this.suscripcionEmpresa?.unsubscribe();
    const revision = this.revisionSesionSignal();
    const generacion = ++this.generacionEmpresa;
    this.suscripcionEmpresa = this.companies().subscribe({
      next: (empresas) => {
        if (!this.contextoActual(revision, generacion)) return;
        this.suscripcionEmpresa = null;
        if (!this.contextoDeToken(this.leerToken())) {
          this.limpiarEmpresa();
          return;
        }
        this.resolverEmpresa(empresas ?? [], claims);
      },
      error: () => {
        if (!this.contextoActual(revision, generacion)) return;
        this.suscripcionEmpresa = null;
        this.empresaSignal.set(null);
        this.estadoEmpresaSignal.set('error');
      },
    });
  }

  private contextoActual(revision: number, generacion: number): boolean {
    if (!this.esSesionActual(revision)) {
      this.sincronizarSesion();
      return false;
    }
    return generacion === this.generacionEmpresa;
  }

  /** Reintenta la resolución de la empresa tras un fallo del catálogo. */
  reintentarContextoEmpresa(): void {
    if (this.estadoEmpresaSignal() === 'error') {
      this.estadoEmpresaSignal.set('sin-tenant');
    }
    this.inicializarContextoEmpresa();
  }

  /**
   * Limpia la identidad de la empresa en memoria y en `sessionStorage`
   * (cierre de sesión / cambio de empresa). El catálogo público se conserva
   * porque no contiene datos de ninguna sesión.
   */
  limpiarEmpresa(): void {
    this.generacionEmpresa++;
    this.suscripcionEmpresa?.unsubscribe();
    this.suscripcionEmpresa = null;
    this.empresaSignal.set(null);
    this.estadoEmpresaSignal.set('sin-tenant');
    try {
      sessionStorage.removeItem(CLAVE_EMPRESA);
    } catch {
      // Almacenamiento no disponible.
    }
  }

  private resolverEmpresa(
    catalogo: TenantCompany[],
    claims: { codigo: string; tenantId: number },
  ): void {
    const nombre = catalogo.find((item) => item.codigo === claims.codigo)?.nombre?.trim();
    if (!nombre) {
      this.catalogoEmpresas = null;
      this.empresaSignal.set(null);
      this.estadoEmpresaSignal.set('error');
      return;
    }
    const contexto: EmpresaSesion = {
      codigo: claims.codigo,
      nombre,
      tenantId: claims.tenantId,
    };
    this.empresaSignal.set(contexto);
    this.estadoEmpresaSignal.set('listo');
    this.guardarEmpresa(contexto);
  }

  private guardarEmpresa(empresa: EmpresaSesion): void {
    try {
      sessionStorage.setItem(CLAVE_EMPRESA, JSON.stringify(empresa));
    } catch {
      // Almacenamiento no disponible.
    }
  }

  private leerEmpresaGuardada(): EmpresaSesion | null {
    try {
      const crudo = sessionStorage.getItem(CLAVE_EMPRESA);
      if (!crudo) {
        return null;
      }
      const valor = JSON.parse(crudo) as Partial<EmpresaSesion> | null;
      if (
        !valor ||
        typeof valor.codigo !== 'string' ||
        !valor.codigo.trim() ||
        typeof valor.nombre !== 'string' ||
        !valor.nombre.trim() ||
        !Number.isInteger(valor.tenantId) ||
        (valor.tenantId as number) <= 0
      ) {
        return null;
      }
      return {
        codigo: valor.codigo.trim(),
        nombre: valor.nombre.trim(),
        tenantId: valor.tenantId as number,
      };
    } catch {
      return null;
    }
  }

  private leerToken(): string | null {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
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
    this.sincronizarSesion();
    // Deriva la empresa del token recién guardado: si no es tenant, no queda
    // ninguna identidad de empresa de una sesión anterior.
    this.inicializarContextoEmpresa();
  }

  logout(): void {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_CORREO);
    } catch {
      // Almacenamiento no disponible.
    }
    // El menú y la empresa pertenecen a la sesión: se limpian para que la
    // siguiente sesión no herede permisos ni identidad de la anterior.
    this.sincronizarSesion();
    this.menuService.limpiar();
    this.limpiarEmpresa();
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
    const correoGuardado = this.tokenObservado === this.leerToken() ? this.correoPerfil : null;
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
      const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
      const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
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
