import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, Subscription } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { AuthService } from './auth.service';
import { TenantCompany } from '../models/auth.models';
import { MenuService } from '../../../../core/services/menu.service';

describe('AuthService tenant separation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });
  it('requests only the public minimal selector contract and tenant login payload', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth
      .companies()
      .subscribe((companies) => expect(companies).toEqual([{ codigo: 'B', nombre: 'B' }]));
    http
      .expectOne(`${environment.apiUrl}/seguridad/tenant/empresas`)
      .flush([{ codigo: 'B', nombre: 'B' }]);
    auth.tenantLogin({ empresa_codigo: 'B', correo: 'u@example.com', password: 'p' }).subscribe();
    expect(http.expectOne(`${environment.apiUrl}/seguridad/tenant/login`).request.body).toEqual({
      empresa_codigo: 'B',
      correo: 'u@example.com',
      password: 'p',
    });
  });
  it('only accepts an unexpired tenant response matching the selected company; logout retains SaaS', () => {
    const auth = TestBed.inject(AuthService);
    const jwt = (code: string, type: string, exp: number) =>
      `a.${btoa(JSON.stringify({ empresa_codigo: code, token_type: type, tenant_id: 3, exp }))}.c`;
    const future = Math.floor(Date.now() / 1000) + 300;
    localStorage.setItem('saas_access_token', 'saas');
    expect(auth.acceptTenantToken(jwt('A', 'tenant', future), 'B')).toBe(false);
    expect(auth.acceptTenantToken(jwt('B', 'saas_admin', future), 'B')).toBe(false);
    expect(auth.acceptTenantToken(jwt('B', 'tenant', 1), 'B')).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(auth.acceptTenantToken(jwt('B', 'tenant', future), 'B')).toBe(true);
    // El catálogo no estaba cacheado en este escenario: se resuelve una vez.
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/seguridad/tenant/empresas`)
      .flush([{ codigo: 'B', nombre: 'Empresa B' }]);
    expect(auth.hasFreshTenantToken(jwt('B', 'tenant', future))).toBe(true);
    auth.logout();
    expect(auth.hasFreshTenantToken(jwt('B', 'tenant', future))).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('saas_access_token')).toBe('saas');
  });
  it('retains the legacy endpoint contract', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ correo: 'u@example.com', password: 'p' }).subscribe();
    expect(
      TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/seguridad/login`)
        .request.body,
    ).toEqual({ correo: 'u@example.com', password: 'p' });
  });
});

/**
 * Contexto de empresa compartido: se resuelve una vez por sesión y se valida
 * contra el JWT tenant vigente. Nunca sustituye la validación del backend.
 */
describe('AuthService empresa context', () => {
  const empresasUrl = `${environment.apiUrl}/seguridad/tenant/empresas`;
  const jwtTenant = (codigo: string, tenantId: number, segundosDeVida = 300): string =>
    `a.${btoa(
      JSON.stringify({
        empresa_codigo: codigo,
        token_type: 'tenant',
        tenant_id: tenantId,
        exp: Math.floor(Date.now() / 1000) + segundosDeVida,
      }),
    )}.c`;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('resuelve la empresa una sola vez aunque se recree el sidebar', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    localStorage.setItem('access_token', jwtTenant('MEDICO-OCULAR', 9));

    auth.inicializarContextoEmpresa();
    expect(auth.estadoEmpresa()).toBe('verificando');
    http
      .expectOne(empresasUrl)
      .flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);

    expect(auth.empresa()).toEqual({
      codigo: 'MEDICO-OCULAR',
      nombre: 'Centro Médico Ocular',
      tenantId: 9,
    });
    expect(auth.estadoEmpresa()).toBe('listo');

    // Nuevas instancias del sidebar (cambio de módulo): sin peticiones.
    auth.inicializarContextoEmpresa();
    auth.inicializarContextoEmpresa();
    http.expectNone(empresasUrl);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
  });

  it('se identifica en el login con el catálogo ya cargado, sin repetirlo', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    auth.companies().subscribe();
    http
      .expectOne(empresasUrl)
      .flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);

    expect(auth.acceptTenantToken(jwtTenant('MEDICO-OCULAR', 9), 'MEDICO-OCULAR')).toBe(true);
    http.expectNone(empresasUrl);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
    expect(auth.estadoEmpresa()).toBe('listo');
  });

  it('restaura la empresa tras F5 sin consultar el catálogo', () => {
    localStorage.setItem('access_token', jwtTenant('MEDICO-OCULAR', 9));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular', tenantId: 9 }),
    );
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    auth.inicializarContextoEmpresa();
    http.expectNone(empresasUrl);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
  });

  it('descarta la empresa guardada que no coincide con el JWT vigente', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    localStorage.setItem('access_token', jwtTenant('MEDICO-OCULAR', 9));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'VISION-CLARA', nombre: 'Visión Clara', tenantId: 5 }),
    );

    auth.inicializarContextoEmpresa();
    http
      .expectOne(empresasUrl)
      .flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
  });

  it('rechaza un JWT vencido o ajeno al tenant sin mostrar empresa', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    localStorage.setItem('access_token', jwtTenant('MEDICO-OCULAR', 9, -60));
    auth.inicializarContextoEmpresa();
    http.expectNone(empresasUrl);
    expect(auth.empresa()).toBeNull();
    expect(auth.estadoEmpresa()).toBe('sin-tenant');

    localStorage.setItem('access_token', 'a.' + btoa(JSON.stringify({ sub: 7, rol_id: 1 })) + '.c');
    auth.inicializarContextoEmpresa();
    http.expectNone(empresasUrl);
    expect(auth.empresa()).toBeNull();
  });

  it('cambia de empresa sin arrastrar la identidad anterior y limpia al salir', () => {
    localStorage.setItem('access_token', jwtTenant('VISION-CLARA', 5));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'VISION-CLARA', nombre: 'Visión Clara', tenantId: 5 }),
    );
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.inicializarContextoEmpresa();
    expect(auth.empresaNombre()).toBe('Visión Clara');

    expect(auth.acceptTenantToken(jwtTenant('MEDICO-OCULAR', 9), 'MEDICO-OCULAR')).toBe(true);
    http
      .expectOne(empresasUrl)
      .flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
    expect(sessionStorage.getItem('sesion_empresa')).toContain('MEDICO-OCULAR');

    auth.logout();
    expect(auth.empresa()).toBeNull();
    expect(sessionStorage.getItem('sesion_empresa')).toBeNull();
  });
});

describe('AuthService — revisión de sesión entre pestañas', () => {
  const empresasUrl = `${environment.apiUrl}/seguridad/tenant/empresas`;
  const menuUrl = `${environment.apiUrl}/seguridad/menu`;
  const token = (
    codigo: string,
    tenantId: number,
    usuario = 1,
    rol = 1,
    exp = Math.floor(Date.now() / 1000) + 600,
  ) =>
    `a.${btoa(JSON.stringify({ token_type: 'tenant', empresa_codigo: codigo, tenant_id: tenantId, sub: usuario, rol_id: rol, exp }))}.c`;
  const tokenA = token('A', 1);
  const catalogo = [
    { codigo: 'A', nombre: 'Empresa A' },
    { codigo: 'B', nombre: 'Empresa B' },
  ];
  const emitir = (key: string | null = 'access_token', newValue: string | null = null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  let auth: AuthService, menu: MenuService, http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('access_token', tokenA);
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'A', nombre: 'Empresa A', tenantId: 1 }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    menu = TestBed.inject(MenuService);
    http = TestBed.inject(HttpTestingController);
    auth.inicializarContextoEmpresa();
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('limpia A antes de resolver B, lee el token real y recarga el menú de B', () => {
    auth.acceptTenantToken(tokenA, 'A');
    menu.cargar();
    http.expectOne(menuUrl).flush([{ id: 1, nombre: 'Área A', funciones: [] }]);
    const revision = auth.revisionSesion();
    const tokenB = token('B', 2);
    localStorage.setItem('access_token', tokenB);
    emitir('access_token', tokenA);
    expect(auth.revisionSesion()).toBe(revision + 1);
    expect(auth.esSesionActual(revision)).toBe(false);
    expect(auth.empresa()).toBeNull();
    expect(auth.empresaCoincideConSesion()).toBe(false);
    expect(sessionStorage.getItem('sesion_empresa')).toBeNull();
    expect(menu.modulos()).toEqual([]);
    expect(auth.hasFreshTenantToken(tokenA)).toBe(false);
    http.expectOne(empresasUrl).flush(catalogo);
    http.expectOne(menuUrl).flush([{ id: 2, nombre: 'Área B', funciones: [] }]);
    expect(auth.empresaNombre()).toBe('Empresa B');
    expect(auth.empresaCoincideConSesion()).toBe(true);
    expect(menu.modulos()[0].nombre).toBe('Área B');
    expect(localStorage.getItem('access_token')).toBe(tokenB);
  });

  it('cambiar usuario y rol en la misma empresa invalida identidad, freshness y permisos', () => {
    auth.acceptTenantToken(tokenA, 'A');
    menu.cargar();
    http.expectOne(menuUrl).flush([{ id: 1, nombre: 'Permiso anterior', funciones: [] }]);
    const revision = auth.revisionSesion();
    localStorage.setItem('access_token', token('A', 1, 2, 4));
    emitir();
    expect(auth.revisionSesion()).toBe(revision + 1);
    expect(auth.empresa()).toBeNull();
    expect(menu.modulos()).toEqual([]);
    expect(auth.hasFreshTenantToken(tokenA)).toBe(false);
    http.expectOne(empresasUrl).flush(catalogo);
    http.expectOne(menuUrl).flush([]);
    expect(auth.empresaNombre()).toBe('Empresa A');
    expect(auth.obtenerUsuarioIdActual()).toBe(2);
    expect(auth.obtenerRolIdActual()).toBe(4);
  });

  it('detecta el cambio antes del evento y el evento posterior todavía carga el menú pendiente', () => {
    const revision = auth.revisionSesion();
    localStorage.setItem('access_token', token('B', 2));
    expect(auth.esSesionActual(revision)).toBe(false);
    expect(auth.empresaCoincideConSesion()).toBe(false);
    expect(auth.revisionSesion()).toBe(revision);
    auth.sincronizarSesion();
    const nuevaRevision = auth.revisionSesion();
    http.expectOne(empresasUrl).flush(catalogo);
    emitir('access_token', tokenA);
    http.expectOne(menuUrl).flush([]);
    expect(auth.revisionSesion()).toBe(nuevaRevision);
    emitir();
    auth.sincronizarSesion();
    auth.inicializarContextoEmpresa();
    http.expectNone(menuUrl);
    http.expectNone(empresasUrl);
    expect(auth.empresaNombre()).toBe('Empresa B');
  });

  it('cancela empresas y menú pendientes de A al cambiar a B', () => {
    auth.limpiarEmpresa();
    auth.inicializarContextoEmpresa();
    menu.cargar();
    const anteriorEmpresa = http.expectOne(empresasUrl),
      anteriorMenu = http.expectOne(menuUrl);
    localStorage.setItem('access_token', token('B', 2));
    emitir();
    expect(anteriorEmpresa.cancelled).toBe(true);
    expect(anteriorMenu.cancelled).toBe(true);
    http.expectOne(empresasUrl).flush(catalogo);
    http.expectOne(menuUrl).flush([]);
    expect(auth.empresaNombre()).toBe('Empresa B');
  });

  it('descarta callbacks de empresa obsoletos por revisión y por generación', () => {
    const callbacks: Array<{
      next: (empresas: TenantCompany[]) => void;
      error: (error: unknown) => void;
    }> = [];
    vi.spyOn(auth, 'companies').mockImplementation(
      () =>
        ({
          subscribe: (observer: (typeof callbacks)[number]) => {
            callbacks.push(observer);
            return new Subscription();
          },
        }) as unknown as Observable<TenantCompany[]>,
    );
    auth.limpiarEmpresa();
    auth.inicializarContextoEmpresa();
    localStorage.setItem('access_token', token('B', 2));
    auth.sincronizarSesion();
    callbacks[1].next(catalogo);
    callbacks[0].next([{ codigo: 'A', nombre: 'Nombre obsoleto' }]);
    callbacks[0].error(new Error('obsoleto'));
    expect(auth.empresaNombre()).toBe('Empresa B');
    expect(auth.estadoEmpresa()).toBe('listo');
    auth.limpiarEmpresa();
    auth.inicializarContextoEmpresa();
    const anterior = callbacks[2];
    auth.limpiarEmpresa();
    auth.inicializarContextoEmpresa();
    callbacks[3].next(catalogo);
    anterior.error(new Error('generación antigua'));
    expect(auth.empresaNombre()).toBe('Empresa B');
    expect(auth.estadoEmpresa()).toBe('listo');
  });

  it('un error del catálogo B no conserva A y permite reintentar para B', () => {
    localStorage.setItem('access_token', token('B', 2));
    emitir();
    http.expectOne(empresasUrl).flush({}, { status: 500, statusText: 'Error' });
    http.expectOne(menuUrl).flush([]);
    expect(auth.empresaNombre()).toBeNull();
    expect(auth.estadoEmpresa()).toBe('error');
    expect(sessionStorage.getItem('sesion_empresa')).toBeNull();
    auth.reintentarContextoEmpresa();
    http.expectOne(empresasUrl).flush(catalogo);
    expect(auth.empresaNombre()).toBe('Empresa B');
    expect(auth.empresaCoincideConSesion()).toBe(true);
  });

  it('descarta un catálogo cacheado sin B para que el reintento pueda consultar el catálogo actualizado', () => {
    auth.companies().subscribe();
    http.expectOne(empresasUrl).flush([catalogo[0]]);
    localStorage.setItem('access_token', token('B', 2));
    emitir();
    http.expectOne(menuUrl).flush([]);
    expect(auth.estadoEmpresa()).toBe('error');
    expect(auth.empresa()).toBeNull();
    auth.reintentarContextoEmpresa();
    http.expectOne(empresasUrl).flush(catalogo);
    expect(auth.empresaNombre()).toBe('Empresa B');
  });

  it('logout o clear remotos invalidan todo sin borrar la sesión SaaS', () => {
    localStorage.setItem('saas_access_token', 'sesion-saas');
    menu.cargar();
    http.expectOne(menuUrl).flush([{ id: 1, nombre: 'Área A', funciones: [] }]);
    const revision = auth.revisionSesion();
    localStorage.removeItem('access_token');
    emitir(null);
    expect(auth.revisionSesion()).toBe(revision + 1);
    expect(auth.empresa()).toBeNull();
    expect(auth.estadoEmpresa()).toBe('sin-tenant');
    expect(menu.modulos()).toEqual([]);
    expect(menu.estado()).toBe('inicial');
    expect(sessionStorage.getItem('sesion_empresa')).toBeNull();
    expect(localStorage.getItem('saas_access_token')).toBe('sesion-saas');
    http.expectNone(menuUrl);
    http.expectNone(empresasUrl);
  });

  it('ignora eventos ajenos y tokens tenant vencidos o con expiración no finita', () => {
    const revision = auth.revisionSesion();
    emitir('tema', 'oscuro');
    expect(auth.revisionSesion()).toBe(revision);
    expect(auth.empresaNombre()).toBe('Empresa A');
    localStorage.setItem('access_token', token('B', 2, 1, 1, 1));
    emitir();
    expect(auth.empresa()).toBeNull();
    http.expectNone(empresasUrl);
    http.expectNone(menuUrl);
    const infinito = `a.${btoa('{"token_type":"tenant","empresa_codigo":"B","tenant_id":2,"exp":1e999}')}.c`;
    expect(auth.acceptTenantToken(infinito, 'B')).toBe(false);
  });

  it('acceptTenantToken seguido de registrarSesion conserva freshness y no duplica la resolución', () => {
    const tokenB = token('B', 2);
    expect(auth.acceptTenantToken(tokenB, 'B')).toBe(true);
    const revision = auth.revisionSesion();
    auth.registrarSesion(tokenB, 'usuario@ejemplo.test');
    expect(auth.revisionSesion()).toBe(revision);
    expect(auth.hasFreshTenantToken(tokenB)).toBe(true);
    http.expectOne(empresasUrl).flush(catalogo);
    http.expectNone(menuUrl);
    expect(auth.empresaNombre()).toBe('Empresa B');
    expect(auth.obtenerPerfilActual()?.correo).toBe('usuario@ejemplo.test');
  });

  it('un evento de correo refresca el perfil sin invalidar sesión ni menú', () => {
    auth.registrarSesion(tokenA, 'anterior@ejemplo.test');
    menu.cargar();
    http.expectOne(menuUrl).flush([]);
    const revision = auth.revisionSesion(),
      perfil = auth.revisionPerfil();
    localStorage.setItem('sesion_correo', 'actual@ejemplo.test');
    emitir('sesion_correo', 'anterior@ejemplo.test');
    expect(auth.revisionPerfil()).toBe(perfil + 1);
    expect(auth.revisionSesion()).toBe(revision);
    expect(auth.obtenerPerfilActual()?.correo).toBe('actual@ejemplo.test');
    expect(menu.estado()).toBe('listo');
    http.expectNone(menuUrl);
    http.expectNone(empresasUrl);
  });

  it('no atribuye el correo anterior al usuario B mientras llega su evento de perfil', () => {
    auth.registrarSesion(tokenA, 'anterior@ejemplo.test');
    localStorage.setItem('access_token', token('B', 2, 2));
    emitir();
    expect(auth.obtenerPerfilActual()?.correo).toBeNull();
    http.expectOne(empresasUrl).flush(catalogo);
    http.expectOne(menuUrl).flush([]);
    const revision = auth.revisionSesion(),
      perfil = auth.revisionPerfil();
    localStorage.setItem('sesion_correo', 'actual@ejemplo.test');
    emitir('sesion_correo', 'anterior@ejemplo.test');
    expect(auth.revisionPerfil()).toBe(perfil + 1);
    expect(auth.revisionSesion()).toBe(revision);
    expect(auth.obtenerPerfilActual()?.correo).toBe('actual@ejemplo.test');
    expect(auth.empresaNombre()).toBe('Empresa B');
    http.expectNone(menuUrl);
    http.expectNone(empresasUrl);
  });

  it('al destruir el servicio retira el listener y cancela las solicitudes pendientes', () => {
    auth.limpiarEmpresa();
    auth.inicializarContextoEmpresa();
    const pendiente = http.expectOne(empresasUrl);
    TestBed.resetTestingModule();
    expect(pendiente.cancelled).toBe(true);
    const revision = auth.revisionSesion();
    localStorage.setItem('access_token', token('B', 2));
    emitir();
    expect(auth.revisionSesion()).toBe(revision);
  });
});
