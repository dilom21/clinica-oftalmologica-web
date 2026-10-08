import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { Sidebar } from './sidebar';

/** Construye un JWT de prueba (solo el payload importa para la UI). */
function tokenCon(payload: Record<string, unknown>): string {
  const codificar = (valor: unknown): string =>
    btoa(JSON.stringify(valor))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar(payload)}.firma`;
}

describe('Sidebar — render, permisos y sesión', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<Sidebar>;

  const menuUrl = `${environment.apiUrl}/seguridad/menu`;

  const menu = [
    {
      id: 2,
      nombre: 'Pacientes e Historial Clínico',
      funciones: [
        { id: 20, nombre: 'Gestionar pacientes', accion_id: 1, accion_nombre: 'ver' },
        { id: 21, nombre: 'Gestionar perfil propio', accion_id: 1, accion_nombre: 'ver' },
        { id: 22, nombre: 'Consultar historial clínico', accion_id: 1, accion_nombre: 'ver' },
      ],
    },
    {
      id: 1,
      nombre: 'Autenticación y Seguridad',
      funciones: [{ id: 10, nombre: 'Gestionar usuarios', accion_id: 1, accion_nombre: 'ver' }],
    },
  ];

  beforeEach(async () => {
    localStorage.setItem('access_token', tokenCon({ sub: 7, rol_id: 2 }));
    localStorage.setItem('sesion_correo', 'oftalmologo@visionclara.com');
    document.documentElement.classList.remove('tema-oscuro');

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'historial-clinico',
            loadComponent: () => import('./sidebar').then((m) => m.Sidebar),
          },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
    localStorage.removeItem('sesion_correo');
    localStorage.removeItem('tema_app');
    document.documentElement.classList.remove('tema-oscuro');
  });

  function responderMenu(modulos: unknown[] = menu): void {
    httpMock.expectOne((r) => r.url === menuUrl).flush(modulos);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('muestra un skeleton mientras se resuelven los permisos (nunca vacío)', () => {
    expect(fixture.nativeElement.querySelector('.sidebar__skeleton')).toBeTruthy();
    expect(texto()).toContain('Cargando módulos…');
    expect(texto()).not.toContain('Pacientes e Historial Clínico');

    responderMenu();

    expect(fixture.nativeElement.querySelector('.sidebar__skeleton')).toBeNull();
    expect(texto()).toContain('Pacientes e Historial Clínico');
  });

  it('solicita el menú una sola vez y comparte el estado entre instancias', () => {
    responderMenu();

    const segundo = TestBed.createComponent(Sidebar);
    segundo.detectChanges();

    expect(httpMock.match((r) => r.url === menuUrl).length).toBe(0);
    expect((segundo.nativeElement as HTMLElement).textContent).toContain('Pacientes');
  });

  it('no muestra "Gestionar perfil propio" en la navegación web', () => {
    responderMenu();
    expect(texto()).not.toContain('Gestionar perfil propio');

    (
      fixture.nativeElement.querySelectorAll('.sidebar__link--button')[0] as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(texto()).toContain('Gestionar pacientes');
    expect(texto()).not.toContain('Gestionar perfil propio');
  });

  it('muestra CU21 solo como función anidada cuando llega en el menú', () => {
    responderMenu([
      {
        id: 8,
        nombre: 'Configuración clínica',
        funciones: [
          {
            id: 81,
            nombre: 'Gestionar servicios oftalmológicos',
            accion_id: 1,
            accion_nombre: 'LECTURA',
          },
        ],
      },
    ]);

    expect(fixture.nativeElement.querySelector('a[routerLink="/gestion-servicios"]')).toBeNull();
    (fixture.nativeElement.querySelector('.sidebar__link--button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const enlace = fixture.nativeElement.querySelector(
      '.sidebar__submenu-link[href="/gestion-servicios"]',
    ) as HTMLAnchorElement | null;
    expect(enlace).toBeTruthy();
    expect(enlace?.textContent).toContain('Gestionar servicios oftalmológicos');
  });

  it('abre y cierra el acordeón del módulo', () => {
    responderMenu();
    const boton = fixture.nativeElement.querySelector(
      '.sidebar__link--button',
    ) as HTMLButtonElement;

    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.sidebar__submenu').length).toBe(0);

    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.sidebar__submenu').length).toBe(1);

    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.sidebar__submenu').length).toBe(0);
  });

  it('muestra el usuario y el rol reales de la sesión', () => {
    responderMenu();

    expect(texto()).toContain('oftalmologo@visionclara.com');
    expect(texto()).toContain('Rol: Oftalmólogo');
    expect(
      fixture.nativeElement.querySelector('.sidebar__avatar')?.textContent?.trim(),
    ).toBe('OV');
  });

  it('alterna el tema claro/oscuro desde el pie del sidebar', () => {
    responderMenu();
    const botonTema = fixture.nativeElement.querySelector(
      '.sidebar__accion',
    ) as HTMLButtonElement;

    expect(texto()).toContain('Modo oscuro');

    botonTema.click();
    fixture.detectChanges();

    expect(document.documentElement.classList.contains('tema-oscuro')).toBe(true);
    expect(localStorage.getItem('tema_app')).toBe('oscuro');
    expect(texto()).toContain('Modo claro');
  });

  it('cierra sesión reutilizando el flujo existente', () => {
    responderMenu();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (
      fixture.nativeElement.querySelector('.sidebar__accion--salir') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('resalta la función activa y abre su grupo según la ruta', async () => {
    responderMenu();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/historial-clinico');
    fixture.detectChanges();

    const activos = fixture.nativeElement.querySelectorAll(
      'li.sidebar__submenu-item--active',
    );
    expect(activos.length).toBe(1);
    expect((activos[0] as HTMLElement).textContent).toContain('Consultar historial clínico');
    expect(fixture.nativeElement.querySelectorAll('.sidebar__submenu').length).toBe(1);
  });

  it('abre el grupo activo cuando el menú llega después de navegar', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/historial-clinico');
    fixture.detectChanges();

    // El menú aún no había llegado: el grupo no podía abrirse.
    expect(fixture.nativeElement.querySelectorAll('.sidebar__submenu').length).toBe(0);

    responderMenu();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.sidebar__submenu').length).toBe(1);
    const activos = fixture.nativeElement.querySelectorAll(
      'li.sidebar__submenu-item--active',
    );
    expect(activos.length).toBe(1);
  });

  it('muestra un error controlado y permite reintentar', () => {
    httpMock
      .expectOne((r) => r.url === menuUrl)
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sidebar__error')).toBeTruthy();
    expect(texto()).toContain('No se pudieron cargar tus módulos.');

    (fixture.nativeElement.querySelector('.sidebar__error-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    responderMenu();
    expect(texto()).toContain('Pacientes e Historial Clínico');
  });
});
