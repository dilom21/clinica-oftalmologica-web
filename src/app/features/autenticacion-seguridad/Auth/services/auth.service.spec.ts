import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService tenant separation', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); });
  it('requests only the public minimal selector contract and tenant login payload', () => {
    const auth = TestBed.inject(AuthService); const http = TestBed.inject(HttpTestingController);
    auth.companies().subscribe((companies) => expect(companies).toEqual([{ codigo: 'B', nombre: 'B' }]));
    http.expectOne(`${environment.apiUrl}/seguridad/tenant/empresas`).flush([{ codigo: 'B', nombre: 'B' }]);
    auth.tenantLogin({ empresa_codigo: 'B', correo: 'u@example.com', password: 'p' }).subscribe();
    expect(http.expectOne(`${environment.apiUrl}/seguridad/tenant/login`).request.body).toEqual({ empresa_codigo: 'B', correo: 'u@example.com', password: 'p' });
  });
  it('only accepts an unexpired tenant response matching the selected company; logout retains SaaS', () => {
    const auth = TestBed.inject(AuthService);
    const jwt = (code: string, type: string, exp: number) => `a.${btoa(JSON.stringify({ empresa_codigo: code, token_type: type, tenant_id: 3, exp }))}.c`;
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
    expect(TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/seguridad/login`).request.body).toEqual({ correo: 'u@example.com', password: 'p' });
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
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
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
    http.expectOne(empresasUrl).flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);

    expect(auth.acceptTenantToken(jwtTenant('MEDICO-OCULAR', 9), 'MEDICO-OCULAR')).toBe(true);
    http.expectNone(empresasUrl);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
    expect(auth.estadoEmpresa()).toBe('listo');
  });

  it('restaura la empresa tras F5 sin consultar el catálogo', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    localStorage.setItem('access_token', jwtTenant('MEDICO-OCULAR', 9));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular', tenantId: 9 }),
    );

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
    http.expectOne(empresasUrl).flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);
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
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    localStorage.setItem('access_token', jwtTenant('VISION-CLARA', 5));
    sessionStorage.setItem(
      'sesion_empresa',
      JSON.stringify({ codigo: 'VISION-CLARA', nombre: 'Visión Clara', tenantId: 5 }),
    );
    auth.inicializarContextoEmpresa();
    expect(auth.empresaNombre()).toBe('Visión Clara');

    expect(auth.acceptTenantToken(jwtTenant('MEDICO-OCULAR', 9), 'MEDICO-OCULAR')).toBe(true);
    http.expectOne(empresasUrl).flush([{ codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' }]);
    expect(auth.empresaNombre()).toBe('Centro Médico Ocular');
    expect(sessionStorage.getItem('sesion_empresa')).toContain('MEDICO-OCULAR');

    auth.logout();
    expect(auth.empresa()).toBeNull();
    expect(sessionStorage.getItem('sesion_empresa')).toBeNull();
  });
});
