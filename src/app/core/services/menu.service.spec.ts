import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, Subscription } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { MenuModulo } from '../models/menu.models';
import { MenuService } from './menu.service';

describe('MenuService — propietario de sesión y solicitudes obsoletas', () => {
  const url = `${environment.apiUrl}/seguridad/menu`;
  const modulosA: MenuModulo[] = [{ id: 1, nombre: 'Área A', funciones: [] }];
  const modulosB: MenuModulo[] = [{ id: 2, nombre: 'Área B', funciones: [] }];
  let menu: MenuService, http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'sesion-A');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    menu = TestBed.inject(MenuService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('comparte la carga de la misma sesión y permite reintentar después de un error', () => {
    menu.cargar();
    menu.cargar();
    menu.cargar(true);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    expect(menu.estado()).toBe('error');
    expect(menu.modulos()).toEqual([]);
    menu.reintentar();
    http.expectOne(url).flush(modulosA);
    menu.cargar();
    http.expectNone(url);
    expect(menu.modulos()).toEqual(modulosA);
    expect(menu.estado()).toBe('listo');
  });

  it('cargar detecta un token distinto sin esperar storage y nunca reutiliza permisos de A', () => {
    menu.cargar();
    http.expectOne(url).flush(modulosA);
    localStorage.setItem('access_token', 'sesion-B');
    menu.cargar();
    expect(menu.modulos()).toEqual([]);
    expect(menu.estado()).toBe('cargando');
    http.expectOne(url).flush(modulosB);
    expect(menu.modulos()).toEqual(modulosB);
  });

  it('la sincronización posterior de Auth conserva una solicitud del propietario B ya iniciada', () => {
    menu.cargar();
    http.expectOne(url).flush(modulosA);
    localStorage.setItem('access_token', 'sesion-B');
    menu.cargar();
    const pendienteB = http.expectOne(url);
    menu.sincronizarSesion();
    menu.cargar();
    expect(pendienteB.cancelled).toBe(false);
    http.expectNone(url);
    pendienteB.flush(modulosB);
    expect(menu.modulos()).toEqual(modulosB);
  });

  it('storage usa el token real, cancela A y clear invalida el menú sin consultar', () => {
    menu.cargar();
    const pendienteA = http.expectOne(url);
    localStorage.setItem('access_token', 'sesion-B');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'access_token', newValue: 'sesion-A' }),
    );
    expect(pendienteA.cancelled).toBe(true);
    expect(menu.modulos()).toEqual([]);
    menu.cargar();
    http.expectOne(url).flush(modulosB);
    localStorage.removeItem('access_token');
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(menu.estado()).toBe('inicial');
    expect(menu.modulos()).toEqual([]);
    http.expectNone(url);
  });

  it('descarta datos y errores puntuales de obtenerMenu si cambia el propietario', () => {
    const recibir = vi.fn(),
      fallar = vi.fn();
    menu.obtenerMenu().subscribe({ next: recibir, error: fallar });
    const anterior = http.expectOne(url);
    localStorage.setItem('access_token', 'sesion-B');
    anterior.flush(modulosA);
    expect(recibir).not.toHaveBeenCalled();
    expect(fallar).not.toHaveBeenCalled();
    menu.obtenerMenu().subscribe({ next: recibir, error: fallar });
    const otro = http.expectOne(url);
    localStorage.setItem('access_token', 'sesion-C');
    otro.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(fallar).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBe('sesion-C');
  });

  it('obtenerMenu sigue entregando su consulta si cargar se inicia para la misma sesión', () => {
    const recibir = vi.fn();
    menu.obtenerMenu().subscribe(recibir);
    const puntual = http.expectOne(url);
    menu.cargar();
    const compartida = http.expectOne(url);
    puntual.flush(modulosA);
    compartida.flush(modulosA);
    expect(recibir).toHaveBeenCalledWith(modulosA);
    expect(menu.modulos()).toEqual(modulosA);
  });

  it('las respuestas y errores antiguos no sustituyen B aun si una fuente ignora unsubscribe', () => {
    const callbacks: Array<{
      next: (modulos: MenuModulo[]) => void;
      error: (error: unknown) => void;
    }> = [];
    vi.spyOn(TestBed.inject(HttpClient), 'get').mockImplementation(
      () =>
        ({
          subscribe: (observer: (typeof callbacks)[number]) => {
            callbacks.push(observer);
            return new Subscription();
          },
        }) as unknown as ReturnType<HttpClient['get']>,
    );
    menu.cargar();
    localStorage.setItem('access_token', 'sesion-B');
    menu.cargar();
    callbacks[1].next(modulosB);
    callbacks[0].next(modulosA);
    callbacks[0].error({ status: 401 });
    expect(menu.modulos()).toEqual(modulosB);
    expect(menu.estado()).toBe('listo');
    expect(localStorage.getItem('access_token')).toBe('sesion-B');
    menu.limpiar();
    menu.cargar();
    callbacks[2].next([]);
    callbacks[1].next(modulosB);
    callbacks[1].error({ status: 500 });
    expect(menu.modulos()).toEqual([]);
    expect(menu.estado()).toBe('listo');
  });

  it('un callback anterior al procesamiento de storage no deja estado de A ni elimina B', () => {
    const callbacks: Array<{
      next: (modulos: MenuModulo[]) => void;
      error: (error: unknown) => void;
    }> = [];
    vi.spyOn(TestBed.inject(HttpClient), 'get').mockImplementation(
      () =>
        ({
          subscribe: (observer: (typeof callbacks)[number]) => {
            callbacks.push(observer);
            return new Subscription();
          },
        }) as unknown as ReturnType<HttpClient['get']>,
    );
    menu.cargar();
    localStorage.setItem('access_token', 'sesion-B');
    callbacks[0].error({ status: 401 });
    expect(menu.estado()).toBe('inicial');
    expect(menu.modulos()).toEqual([]);
    expect(localStorage.getItem('access_token')).toBe('sesion-B');
    menu.cargar();
    callbacks[1].next(modulosB);
    expect(menu.modulos()).toEqual(modulosB);
  });

  it('destruir el servicio cancela HTTP y retira el listener storage', () => {
    menu.cargar();
    const pendiente = http.expectOne(url);
    TestBed.resetTestingModule();
    expect(pendiente.cancelled).toBe(true);
    const estado = menu.estado();
    localStorage.setItem('access_token', 'sesion-B');
    window.dispatchEvent(new StorageEvent('storage', { key: 'access_token' }));
    menu.cargar();
    http.expectNone(url);
    expect(menu.estado()).toBe(estado);
  });
});
