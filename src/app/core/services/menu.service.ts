import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, defer, EMPTY, filter, Observable, Subscription, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuModulo } from '../models/menu.models';

export type EstadoMenu = 'inicial' | 'cargando' | 'listo' | 'error';

/**
 * Fuente única del menú/permisos del usuario autenticado.
 *
 * El menú se carga UNA vez y se comparte entre todas las instancias del
 * sidebar (una por página). Así una navegación no vuelve a pedir
 * `/seguridad/menu` y el sidebar nunca queda vacío de forma intermitente:
 * mientras `cargando()` es `true` la UI muestra un skeleton, y si falla se
 * expone `error()` para ofrecer un reintento explícito.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly menuUrl = `${environment.apiUrl}/seguridad/menu`;

  private readonly modulosSignal = signal<MenuModulo[]>([]);
  private readonly estadoSignal = signal<EstadoMenu>('inicial');
  private suscripcion: Subscription | null = null;
  private propietarioToken = this.leerToken();
  private generacion = 0;
  private revisionPropietario = 0;
  private destruido = false;
  private readonly ventana = inject(DOCUMENT).defaultView;
  private readonly destroyRef = inject(DestroyRef);

  readonly modulos = this.modulosSignal.asReadonly();
  readonly estado = this.estadoSignal.asReadonly();
  readonly cargando = computed(
    () => this.estadoSignal() === 'inicial' || this.estadoSignal() === 'cargando',
  );
  readonly error = computed(() => this.estadoSignal() === 'error');

  constructor(private readonly http: HttpClient) {
    const cambioSesion = (evento: StorageEvent) => {
      if (evento.key === 'access_token' || evento.key === null) this.sincronizarPropietario();
    };
    this.ventana?.addEventListener('storage', cambioSesion);
    this.destroyRef.onDestroy(() => {
      this.destruido = true;
      this.generacion++;
      this.suscripcion?.unsubscribe();
      this.ventana?.removeEventListener('storage', cambioSesion);
    });
  }

  /**
   * Inicia la carga del menú si aún no está cargado ni en curso.
   * Es idempotente: múltiples llamadas concurrentes producen una sola petición.
   */
  cargar(forzar = false): void {
    if (this.destruido) return;
    this.sincronizarPropietario();
    const estado = this.estadoSignal();
    if (estado === 'cargando') {
      return;
    }
    if (!forzar && estado === 'listo') {
      return;
    }

    this.estadoSignal.set('cargando');
    this.suscripcion?.unsubscribe();
    const propietario = this.propietarioToken;
    const generacion = ++this.generacion;
    this.suscripcion = this.http.get<MenuModulo[]>(this.menuUrl).subscribe({
      next: (modulos) => {
        if (!this.solicitudActual(propietario, generacion)) return;
        this.modulosSignal.set(modulos ?? []);
        this.estadoSignal.set('listo');
      },
      error: () => {
        if (!this.solicitudActual(propietario, generacion)) return;
        this.modulosSignal.set([]);
        this.estadoSignal.set('error');
      },
    });
  }

  /** Reintenta la carga tras un error, mostrando de nuevo el estado de carga. */
  reintentar(): void {
    this.cargar(true);
  }

  /** Limpia el estado (por ejemplo al cerrar sesión) para recargar el menú. */
  limpiar(): void {
    this.generacion++;
    this.revisionPropietario++;
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.modulosSignal.set([]);
    this.estadoSignal.set('inicial');
    this.propietarioToken = this.leerToken();
  }

  /** Compatibilidad: consulta puntual sin estado compartido. */
  obtenerMenu(): Observable<MenuModulo[]> {
    return defer(() => {
      if (this.destruido) return EMPTY;
      this.sincronizarPropietario();
      const propietario = this.propietarioToken;
      const revision = this.revisionPropietario;
      return this.http.get<MenuModulo[]>(this.menuUrl).pipe(
        filter(() => this.propietarioActual(propietario, revision)),
        catchError((error) =>
          this.propietarioActual(propietario, revision) ? throwError(() => error) : EMPTY,
        ),
      );
    });
  }

  private sincronizarPropietario(): void {
    if (this.leerToken() !== this.propietarioToken) this.limpiar();
  }

  sincronizarSesion(): void {
    this.sincronizarPropietario();
  }

  private solicitudActual(propietario: string | null, generacion: number): boolean {
    if (this.destruido) return false;
    this.sincronizarPropietario();
    return (
      !this.destruido && generacion === this.generacion && propietario === this.propietarioToken
    );
  }

  private propietarioActual(propietario: string | null, revision: number): boolean {
    if (this.destruido) return false;
    this.sincronizarPropietario();
    return (
      !this.destruido &&
      revision === this.revisionPropietario &&
      propietario === this.propietarioToken
    );
  }

  private leerToken(): string | null {
    try {
      return localStorage.getItem('access_token');
    } catch {
      return null;
    }
  }
}
