import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../environments/environment';
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
    localStorage.setItem('access_token', tokenCon({ sub: 7, rol_id: 2 }));
    localStorage.setItem('sesion_correo', 'oftalmologo@visionclara.com');

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
    localStorage.removeItem('sesion_correo');
  });

  function responderMenu(modulos: unknown[] = menuLimitado): void {
    httpMock.expectOne((r) => r.url === menuUrl).flush(modulos);
    fixture.detectChanges();
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function tarjetas(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll(
      '.inicio-tarjeta:not(.inicio-tarjeta--esqueleto)',
    );
  }

  it('ya no muestra el contenido de "Sistema en construcción"', () => {
    responderMenu();

    expect(texto()).not.toContain('Sistema en construcción');
    expect(texto()).not.toContain('Módulo principal en construcción');
    expect(fixture.nativeElement.querySelector('.inicio-hero')).toBeTruthy();
  });

  it('muestra el usuario y el rol reales de la sesión', () => {
    responderMenu();

    expect(texto()).toContain('oftalmologo@visionclara.com');
    expect(texto()).toContain('Oftalmólogo');
    expect(texto()).toContain('Centro Oftalmológico Visión Clara');
  });

  it('muestra un estado de carga mientras se resuelven los permisos', () => {
    expect(fixture.nativeElement.querySelector('.sidebar__skeleton')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelectorAll('.inicio-tarjeta--esqueleto').length,
    ).toBeGreaterThan(0);

    responderMenu();

    expect(fixture.nativeElement.querySelector('.sidebar__skeleton')).toBeNull();
    expect(tarjetas().length).toBe(2);
  });

  it('solo muestra los accesos autorizados por el menú', () => {
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
    responderMenu();
    expect(texto()).not.toContain('Gestionar perfil propio');
  });

  it('los botones del hero respetan los permisos', () => {
    responderMenu();

    const botones = fixture.nativeElement.querySelectorAll(
      '.inicio-hero__boton',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(botones.length).toBe(2);
    expect(botones[0].textContent).toContain('Ver pacientes');
    expect(botones[1].textContent).toContain('Ver historial');
  });

  it('lista los módulos habilitados con su número de opciones', () => {
    responderMenu();

    const modulos = fixture.nativeElement.querySelectorAll(
      '.inicio-modulo',
    ) as NodeListOf<HTMLElement>;
    expect(modulos.length).toBe(1);
    expect(modulos[0].textContent).toContain('Pacientes e Historial Clínico');
    expect(modulos[0].textContent).toContain('2 opciones');
  });

  it('muestra un error controlado si falla la carga de permisos', () => {
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
});