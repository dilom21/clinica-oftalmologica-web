import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Inicio } from './inicio';

/** Construye un JWT de prueba (solo el payload importa para la UI). */
function tokenCon(payload: Record<string, unknown>): string {
  const codificar = (valor: unknown): string =>
    btoa(JSON.stringify(valor))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar(payload)}.firma`;
}

describe('Inicio — panel de bienvenida', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<Inicio>;

  const menuUrl = `${environment.apiUrl}/seguridad/menu`;
  const empresasUrl = `${environment.apiUrl}/seguridad/tenant/empresas`;

  /** Catálogo público de empresas que expone el login (dos empresas reales). */
  const catalogoEmpresas = [
    { codigo: 'MEDICO-OCULAR', nombre: 'Centro Médico Ocular' },
    { codigo: 'VISION-CLARA', nombre: 'Visión Clara' },
  ];

  /** Menú realista de un oftalmólogo: 2 accesos web + 1 función oculta. */
  const menuLimitado = [
    {
      id: 2,
      nombre: 'Pacientes e Historial Clínico',
      funciones: [
        { id: 20, nombre: 'Gestionar pacientes', accion_id: 1, accion_nombre: 'ver' },
        { id: 21, nombre: 'Consultar historial clínico', accion_id: 1, accion_nombre: 'ver' },
        { id: 22, nombre: 'Gestionar perfil propio', accion_id: 1, accion_nombre: 'ver' },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
    localStorage.removeItem('sesion_correo');
    sessionStorage.removeItem('sesion_empresa');
  });

  /**
   * Monta el panel con la sesión indicada. Por defecto usa un token anterior al
   * multitenant (sin empresa), que no consulta el catálogo de empresas.
   */
  function montar(token: string = tokenCon({ sub: 7, rol_id: 2 })): void {
    localStorage.setItem('access_token', token);
    localStorage.setItem('sesion_correo', 'oftalmologo@visionclara.com');
    fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
  }

  /** Token que emite el backend al iniciar sesión dentro de una empresa. */
  function tokenTenant(codigo: string, tenantId: number, vigenciaSegundos = 3600): string {
    return tokenCon({
      sub: 7,
      rol_id: 2,
      token_type: 'tenant',
      empresa_codigo: codigo,
      tenant_id: tenantId,
      exp: Math.floor(Date.now() / 1000) + vigenciaSegundos,
    });
  }

  /** Empresa resuelta que la sesión deja guardada (sobrevive a F5). */
  function guardarEmpresa(codigo: string, nombre: string, tenantId: number): void {
    sessionStorage.setItem('sesion_empresa', JSON.stringify({ codigo, nombre, tenantId }));
  }

  function responderMenu(modulos: unknown[] = menuLimitado): void {
    httpMock.expectOne((r) => r.url === menuUrl).flush(modulos);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function textoDe(elemento: Element | null): string {
    return elemento?.textContent?.trim() ?? '';
  }

  /** Nombre de empresa mostrado junto al avatar del encabezado. */
  function empresaEnEncabezado(): string {
    return textoDe(fixture.nativeElement.querySelector('.inicio-hero__clinica'));
  }

  /** Valor de la ficha "Tu sesión" para una etiqueta concreta. */
  function datoSesion(etiqueta: string): string {
    const filas = Array.from(
      fixture.nativeElement.querySelectorAll('.inicio-dato'),
    ) as HTMLElement[];
    const fila = filas.find((item) => textoDe(item.querySelector('dt')) === etiqueta);
    return textoDe(fila?.querySelector('dd') ?? null);
  }

  function tarjetas(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll(
      '.inicio-tarjeta:not(.inicio-tarjeta--esqueleto)',
    );
  }

  it('ya no muestra el contenido de "Sistema en construcción"', () => {
    montar();
    responderMenu();

    expect(texto()).not.toContain('Sistema en construcción');
    expect(texto()).not.toContain('Módulo principal en construcción');
    expect(fixture.nativeElement.querySelector('.inicio-hero')).toBeTruthy();
  });

  it('muestra el usuario y el rol reales de la sesión', () => {
    montar();
    responderMenu();

    expect(texto()).toContain('oftalmologo@visionclara.com');
    expect(texto()).toContain('Oftalmólogo');
  });

  it('no inventa empresa ni sede cuando la sesión no pertenece a un tenant', () => {
    montar();
    responderMenu();

    // Ya no queda ninguna referencia fija a una clínica concreta.
    expect(texto()).not.toContain('Visión Clara');
    expect(empresaEnEncabezado()).toBe('Sistema clínico');
    expect(datoSesion('Empresa')).toBe('Sistema clínico');
    // La sede es una ubicación física: no se inventa ninguna.
    expect(datoSesion('Sede')).toBe('No registrada');
  });

  it('muestra un estado de carga mientras se resuelven los permisos', () => {
    montar();

    expect(fixture.nativeElement.querySelector('.sidebar__skeleton')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelectorAll('.inicio-tarjeta--esqueleto').length,
    ).toBeGreaterThan(0);

    responderMenu();

    expect(fixture.nativeElement.querySelector('.sidebar__skeleton')).toBeNull();
    expect(tarjetas().length).toBe(2);
  });

  it('solo muestra los accesos autorizados por el menú', () => {
    montar();
    responderMenu();

    expect(tarjetas().length).toBe(2);
    expect(texto()).toContain('Pacientes');
    expect(texto()).toContain('Historial clínico');
    // Módulos no habilitados para este rol.
    expect(texto()).not.toContain('Registrar consulta');
    expect(texto()).not.toContain('Tratamientos y recetas');
    expect(fixture.nativeElement.querySelectorAll('.inicio-tarjeta').length).toBe(2);
  });

  it('no muestra "Gestionar perfil propio" entre los accesos', () => {
    montar();
    responderMenu();
    expect(texto()).not.toContain('Gestionar perfil propio');
  });

  it('los botones del hero respetan los permisos', () => {
    montar();
    responderMenu();

    const botones = fixture.nativeElement.querySelectorAll(
      '.inicio-hero__boton',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(botones.length).toBe(2);
    expect(botones[0].textContent).toContain('Ver pacientes');
    expect(botones[1].textContent).toContain('Ver historial');
  });

  it('lista los módulos habilitados con su número de opciones', () => {
    montar();
    responderMenu();

    const modulos = fixture.nativeElement.querySelectorAll(
      '.inicio-modulo',
    ) as NodeListOf<HTMLElement>;
    expect(modulos.length).toBe(1);
    expect(modulos[0].textContent).toContain('Pacientes e Historial Clínico');
    expect(modulos[0].textContent).toContain('2 opciones');
  });

  it('muestra un error controlado si falla la carga de permisos', () => {
    montar();
    httpMock
      .expectOne((r) => r.url === menuUrl)
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(texto()).toContain('No se pudieron cargar tus módulos habilitados.');
    expect(tarjetas().length).toBe(0);

    (
      fixture.nativeElement.querySelector(
        '.inicio-estado--error .inicio-btn',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    responderMenu();
    expect(tarjetas().length).toBe(2);
  });

  it('muestra un estado vacío cuando el rol no tiene módulos web', () => {
    montar();
    responderMenu([
      {
        id: 9,
        nombre: 'Pacientes e Historial Clínico',
        funciones: [
          { id: 91, nombre: 'Gestionar perfil propio', accion_id: 1, accion_nombre: 'ver' },
        ],
      },
    ]);

    expect(tarjetas().length).toBe(0);
    expect(texto()).toContain('Tu rol aún no tiene módulos habilitados');
  });

  it('muestra la empresa real de la sesión tenant, no una clínica fija', () => {
    montar(tokenTenant('MEDICO-OCULAR', 9));
    httpMock.expectOne(empresasUrl).flush(catalogoEmpresas);

    fixture.detectChanges();
    responderMenu();

    expect(empresaEnEncabezado()).toBe('Centro Médico Ocular');
    expect(datoSesion('Empresa')).toBe('Centro Médico Ocular');
    expect(texto()).not.toContain('Visión Clara');
  });

  it('muestra Visión Clara cuando esa es la empresa de la sesión', () => {
    montar(tokenTenant('VISION-CLARA', 5));
    httpMock.expectOne(empresasUrl).flush(catalogoEmpresas);

    fixture.detectChanges();
    responderMenu();

    expect(empresaEnEncabezado()).toBe('Visión Clara');
    expect(datoSesion('Empresa')).toBe('Visión Clara');
    expect(texto()).not.toContain('Centro Médico Ocular');
  });

  it('restaura la empresa tras F5 sin volver a consultar el catálogo', () => {
    // Empresa ya resuelta que la sesión deja guardada al recargar la página.
    guardarEmpresa('MEDICO-OCULAR', 'Centro Médico Ocular', 9);

    montar(tokenTenant('MEDICO-OCULAR', 9));
    httpMock.expectNone(empresasUrl);

    fixture.detectChanges();
    responderMenu();

    expect(empresaEnEncabezado()).toBe('Centro Médico Ocular');
    expect(datoSesion('Empresa')).toBe('Centro Médico Ocular');
  });

  it('no arrastra la empresa de la sesión anterior al cambiar de empresa', () => {
    // Sesión previa (Visión Clara) ya resuelta y guardada.
    guardarEmpresa('VISION-CLARA', 'Visión Clara', 5);
    const auth = TestBed.inject(AuthService);

    // "Cambiar empresa": se cierra la sesión anterior y se entra con otro tenant.
    auth.logout();
    montar(tokenTenant('MEDICO-OCULAR', 9));
    httpMock.expectOne(empresasUrl).flush(catalogoEmpresas);

    fixture.detectChanges();
    responderMenu();

    expect(empresaEnEncabezado()).toBe('Centro Médico Ocular');
    expect(texto()).not.toContain('Visión Clara');
  });

  it('deja de mostrar la empresa al cerrar sesión', () => {
    montar(tokenTenant('MEDICO-OCULAR', 9));
    httpMock.expectOne(empresasUrl).flush(catalogoEmpresas);

    fixture.detectChanges();
    responderMenu();
    expect(empresaEnEncabezado()).toBe('Centro Médico Ocular');

    TestBed.inject(AuthService).logout();
    fixture.detectChanges();

    expect(texto()).not.toContain('Centro Médico Ocular');
    expect(empresaEnEncabezado()).toBe('Sistema clínico');
  });

  it.each(['LECTURA', 'AMBAS', 'ESCRITURA'])('cuenta CU30 en Inicio solo con lectura: %s', accion => {
    montar();
    responderMenu([{
      id: 5,
      nombre: 'Inventario y Proveedores',
      funciones: [{ id: 30, nombre: 'Consultar inventario y alertas', accion_id: 1, accion_nombre: accion }],
    }]);
    if (accion === 'ESCRITURA') {
      expect(texto()).not.toContain('Inventario y Proveedores');
    } else {
      expect(texto()).toContain('Inventario y Proveedores');
    }
  });
});
