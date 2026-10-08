import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
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

  readonly modulos = this.modulosSignal.asReadonly();
  readonly estado = this.estadoSignal.asReadonly();
  readonly cargando = computed(
    () => this.estadoSignal() === 'inicial' || this.estadoSignal() === 'cargando',
  );
  readonly error = computed(() => this.estadoSignal() === 'error');

  constructor(private readonly http: HttpClient) {}

  /**
   * Inicia la carga del menú si aún no está cargado ni en curso.
   * Es idempotente: múltiples llamadas concurrentes producen una sola petición.
   */
  cargar(forzar = false): void {
    const estado = this.estadoSignal();
    if (estado === 'cargando') {
      return;
    }
    if (!forzar && estado === 'listo') {
      return;
    }

    this.estadoSignal.set('cargando');
    this.suscripcion?.unsubscribe();
    this.suscripcion = this.http.get<MenuModulo[]>(this.menuUrl).subscribe({
      next: (modulos) => {
        this.modulosSignal.set(modulos ?? []);
        this.estadoSignal.set('listo');
      },
      error: () => {
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
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.modulosSignal.set([]);
    this.estadoSignal.set('inicial');
  }

  /** Compatibilidad: consulta puntual sin estado compartido. */
  obtenerMenu(): Observable<MenuModulo[]> {
    return this.http.get<MenuModulo[]>(this.menuUrl);
  }
}
