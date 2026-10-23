import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { PerfilUsuario } from '../../../features/autenticacion-seguridad/Auth/models/auth.models';
import { AuthService } from '../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { MenuModulo } from '../../models/menu.models';
import { MenuService } from '../../services/menu.service';
import { NavegacionService } from '../../services/navegacion.service';
import { ThemeService } from '../../services/theme.service';

/**
 * Navegación lateral de la aplicación.
 *
 * - Consume el menú compartido de `MenuService` (una sola petición por sesión):
 *   mientras carga muestra un skeleton y nunca un menú "vacío".
 * - Agrupa las funciones en acordeones con icono propio por opción.
 * - Muestra en la zona inferior al usuario real, el cambio de tema y la salida.
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  readonly mobileOpen = input(false);
  readonly mobileClose = output<void>();

  private readonly menuService = inject(MenuService);
  private readonly navegacion = inject(NavegacionService);
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cargandoMenu = this.menuService.cargando;
  protected readonly menuError = this.menuService.error;
  protected readonly perfil = signal<PerfilUsuario | null>(null);
  protected readonly esOscuro = this.themeService.esOscuro;
  protected readonly openModuleId = signal<number | null>(null);
  protected readonly selectedModuleId = signal<number | null>(null);
  protected readonly selectedFuncionId = signal<number | null>(null);

  /** Módulos con al menos una función visible en la web. */
  protected readonly modulos = computed<MenuModulo[]>(() =>
    this.menuService
      .modulos()
      .map((modulo) => ({
        ...modulo,
        funciones: (modulo.funciones ?? []).filter(
          (funcion) => !this.navegacion.estaOcultaEnWeb(funcion.nombre),
        ),
      }))
      .filter((modulo) => modulo.funciones.length > 0),
  );

  /** Contexto de empresa compartido: se resuelve una vez por sesión. */
  protected readonly empresa = this.authService.empresa;
  protected readonly estadoEmpresa = this.authService.estadoEmpresa;

  /**
   * Nombre real de la empresa autenticada.
   *
   * Procede del contexto de sesión de `AuthService`, validado contra los claims
   * del JWT tenant vigente y conservado durante toda la navegación. El sidebar
   * ya no consulta el catálogo al crearse, así que el nombre no parpadea ni cae
   * en "Empresa no verificada" al cambiar de módulo.
   */
  protected readonly companyName = computed(() => {
    const empresa = this.empresa();
    if (empresa) {
      return empresa.nombre;
    }
    switch (this.estadoEmpresa()) {
      case 'verificando':
        return 'Verificando empresa…';
      case 'error':
        return 'Empresa no verificada';
      default:
        return 'Acceso anterior (sin empresa tenant)';
    }
  });

  /**
   * Cuando el menú termina de cargar (puede llegar después del primer render)
   * se vuelve a sincronizar para abrir y resaltar el grupo de la ruta activa.
   */
  private readonly sincronizarMenuCargado = effect(() => {
    if (this.modulos().length > 0) {
      this.sincronizarConRuta(this.router.url);
    }
  });

  ngOnInit(): void {
    this.perfil.set(this.authService.obtenerPerfilActual());
    this.menuService.cargar();
    // Resuelve (o restaura tras F5) la empresa del token vigente. Es
    // idempotente: si ya está resuelta no genera ninguna petición.
    this.authService.inicializarContextoEmpresa();
    this.sincronizarConRuta(this.router.url);

    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((evento) => {
        this.sincronizarConRuta(evento.urlAfterRedirects);
        this.cerrarSiMovil();
      });
  }

  // --- Mapeo de rutas e iconos -------------------------------------------

  rutaDeFuncion(nombre: string): string | null {
    return this.navegacion.rutaDeFuncion(nombre);
  }

  iconoPara(modulo: MenuModulo): string {
    return this.navegacion.iconoDeModulo(modulo.nombre);
  }

  iconoDeFuncion(funcion: MenuModulo['funciones'][number]): string {
    return this.navegacion.iconoDeFuncion(funcion.nombre);
  }

  // --- Interacción --------------------------------------------------------

  alternarModulo(id: number): void {
    this.openModuleId.update((abierto) => (abierto === id ? null : id));
    this.selectedModuleId.set(id);
    this.selectedFuncionId.set(null);
  }

  seleccionarFuncion(moduloId: number, funcionId: number): void {
    this.selectedModuleId.set(moduloId);
    this.selectedFuncionId.set(funcionId);
    this.openModuleId.set(moduloId);
    this.cerrarSiMovil();
  }

  navegarInicio(): void {
    this.selectedModuleId.set(null);
    this.selectedFuncionId.set(null);
    this.cerrarSiMovil();
  }

  reintentarMenu(): void {
    this.menuService.reintentar();
    this.authService.reintentarContextoEmpresa();
  }

  alternarTema(): void {
    this.themeService.alternar();
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  cambiarEmpresa(): void {
    this.authService.logout();
    this.cerrarSiMovil();
    void this.router.navigate(['/login']);
  }

  cerrarMovil(): void {
    this.mobileClose.emit();
  }

  // --- Internos -----------------------------------------------------------

  /**
   * Abre automáticamente el módulo que contiene la ruta activa y resalta la
   * función correspondiente.
   */
  private sincronizarConRuta(url: string): void {
    const rutaActiva = this.normalizarUrl(url);

    if (rutaActiva === '' || rutaActiva === '/' || rutaActiva.startsWith('/inicio')) {
      this.selectedModuleId.set(null);
      this.selectedFuncionId.set(null);
      return;
    }

    for (const modulo of this.modulos()) {
      const funcion = modulo.funciones.find(
        (item) => this.normalizarUrl(this.rutaDeFuncion(item.nombre) ?? '') === rutaActiva,
      );
      if (funcion) {
        this.selectedModuleId.set(modulo.id);
        this.selectedFuncionId.set(funcion.id);
        this.openModuleId.set(modulo.id);
        return;
      }
    }

    // Subrutas (p. ej. `/pagos/historial`): se resalta la función cuya ruta es
    // el prefijo más específico, sin alterar la coincidencia exacta anterior.
    let candidata: { moduloId: number; funcionId: number; longitud: number } | null = null;
    for (const modulo of this.modulos()) {
      for (const funcion of modulo.funciones) {
        const ruta = this.normalizarUrl(this.rutaDeFuncion(funcion.nombre) ?? '');
        if (!ruta || !rutaActiva.startsWith(`${ruta}/`)) {
          continue;
        }
        if (!candidata || ruta.length > candidata.longitud) {
          candidata = {
            moduloId: modulo.id,
            funcionId: funcion.id,
            longitud: ruta.length,
          };
        }
      }
    }
    if (candidata) {
      this.selectedModuleId.set(candidata.moduloId);
      this.selectedFuncionId.set(candidata.funcionId);
      this.openModuleId.set(candidata.moduloId);
    }
  }

  private normalizarUrl(url: string): string {
    const sinQuery = url.split('?')[0].split('#')[0];
    if (sinQuery.length > 1 && sinQuery.endsWith('/')) {
      return sinQuery.slice(0, -1);
    }
    return sinQuery;
  }

  private cerrarSiMovil(): void {
    if (this.mobileOpen()) {
      this.cerrarMovil();
    }
  }
}
