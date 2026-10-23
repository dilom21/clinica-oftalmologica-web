import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { ConfirmacionesPendientes } from '../../components/confirmaciones-pendientes/confirmaciones-pendientes';
import { HistorialPagos } from '../../components/historial-pagos/historial-pagos';
import { RegistroPago } from '../../components/registro-pago/registro-pago';
import {
  PermisosPagos,
  mensajeErrorPago,
  normalizarTexto,
  permisosPagos,
} from '../../models/pagos-administrativos.models';

export type VistaPagos = 'registro' | 'historial' | 'confirmaciones';
type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';

/**
 * Motivo concreto del bloqueo. La vista lo usa para explicar qué falta
 * (módulo, funciones, acciones o menú) en lugar de dejar el área vacía.
 */
export type MotivoSinAcceso =
  'menu-error' | 'menu-invalido' | 'sin-modulo' | 'sin-funciones' | 'sin-acciones';

const SIN_PERMISOS: PermisosPagos = {
  ver: false,
  registrar: false,
  confirmar: false,
};

const RUTA_POR_VISTA: Record<VistaPagos, string> = {
  registro: '/pagos',
  historial: '/pagos/historial',
  confirmaciones: '/pagos/confirmaciones',
};

function esVista(valor: unknown): valor is VistaPagos {
  return valor === 'registro' || valor === 'historial' || valor === 'confirmaciones';
}

/**
 * Contenedor del CU31: resuelve permisos desde `/seguridad/menu`, carga el
 * catálogo de pacientes (una sola vez) y compone las tres vistas internas.
 */
@Component({
  selector: 'app-gestion-pagos',
  standalone: true,
  imports: [CommonModule, Sidebar, RegistroPago, HistorialPagos, ConfirmacionesPendientes],
  templateUrl: './gestion-pagos.html',
  styleUrl: './gestion-pagos.css',
})
export class GestionPagos implements OnInit {
  protected readonly vista = signal<VistaPagos>('registro');
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly motivoSinAcceso = signal<MotivoSinAcceso | null>(null);
  protected readonly permisos = signal<PermisosPagos>(SIN_PERMISOS);

  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly cargandoPacientes = signal(false);
  protected readonly errorPacientes = signal<string | null>(null);

  private readonly menuService = inject(MenuService);
  private readonly pacientesService = inject(PacientesService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Una sesión legacy (sin `empresa_codigo` en el token) no puede resolver el
   * menú del CU31; el aviso al usuario debe decirlo explícitamente.
   */
  protected readonly sinEmpresaTenant = !this.authService.tenantCode();

  protected readonly tituloSinAcceso = computed(() => {
    switch (this.motivoSinAcceso()) {
      case 'menu-error':
        return 'No se pudo verificar el menú de seguridad';
      case 'menu-invalido':
        return 'El menú de seguridad llegó en un formato no válido';
      case 'sin-modulo':
        return 'El módulo «Pagos» no está disponible en esta sesión';
      case 'sin-funciones':
        return 'El módulo «Pagos» no tiene funciones asignadas';
      case 'sin-acciones':
        return 'Tu rol no tiene acciones habilitadas para pagos';
      default:
        return 'Estado de permisos sin determinar';
    }
  });

  protected readonly detalleSinAcceso = computed(() => {
    switch (this.motivoSinAcceso()) {
      case 'menu-error':
        return 'El servicio de menú no respondió, así que no se pudo comprobar el acceso. Vuelve a intentarlo; no se consultó ninguna operación administrativa.';
      case 'menu-invalido':
        return 'El menú recibido no es una lista de módulos con funciones. Vuelve a intentarlo; no se consultó ninguna operación administrativa.';
      case 'sin-modulo':
        return this.sinEmpresaTenant
          ? 'Tu sesión no tiene una empresa (tenant) asociada, por lo que el menú proviene de un acceso anterior y no incluye las funciones del CU31. Inicia sesión con tu empresa para habilitarlas.'
          : 'El menú de tu empresa no incluye el módulo «Pagos»: las funciones del CU31 aún no están sincronizadas en la base de datos de esta empresa. Pide a administración que sincronice el módulo y vuelve a comprobarlo.';
      case 'sin-funciones':
        return this.sinEmpresaTenant
          ? 'El módulo «Pagos» de esta sesión no trae funciones, así que no es posible verificar los permisos de lectura ni de confirmación. Inicia sesión con tu empresa y vuelve a comprobarlo.'
          : 'El módulo «Pagos» existe en el menú de tu empresa pero sin funciones asociadas: no es posible verificar los permisos de lectura ni de confirmación. La sincronización del CU31 en la base de datos de esta empresa sigue pendiente.';
      case 'sin-acciones':
        return 'No hay acciones de lectura ni de escritura sobre «Gestionar pagos» ni «Confirmar pagos bancarios». Solicita a administración revisar los roles de tu usuario; esta pantalla no modifica permisos.';
      default:
        return 'No se pudo determinar el estado de tus permisos. Vuelve a comprobarlo en unos segundos.';
    }
  });

  private pacientesSolicitados = false;
  private redireccionAplicada = false;

  private readonly sincronizarPermisos = effect(() => {
    const estado = this.menuService.estado();

    if (estado === 'error') {
      this.bloquear('menu-error');
      return;
    }
    if (estado !== 'listo') {
      this.estadoPermiso.set('verificando');
      this.motivoSinAcceso.set(null);
      this.permisos.set(SIN_PERMISOS);
      return;
    }

    const modulos = this.menuService.modulos();
    if (!Array.isArray(modulos)) {
      // Un menú con formato inesperado antes rompía el render y dejaba la
      // página en blanco: ahora se informa y se ofrece reintentar.
      this.bloquear('menu-invalido');
      return;
    }

    const funciones = modulos.flatMap((modulo) =>
      Array.isArray(modulo?.funciones) ? modulo.funciones : [],
    );
    const permisos = permisosPagos(funciones);
    this.permisos.set(permisos);

    if (!permisos.ver && !permisos.confirmar) {
      const moduloPagos = modulos.find((modulo) => normalizarTexto(modulo?.nombre) === 'pagos');
      const funcionesPagos =
        moduloPagos && Array.isArray(moduloPagos.funciones) ? moduloPagos.funciones : [];

      this.bloquear(
        !moduloPagos
          ? 'sin-modulo'
          : funcionesPagos.length === 0
            ? 'sin-funciones'
            : 'sin-acciones',
      );
      return;
    }

    this.estadoPermiso.set('autorizado');
    this.motivoSinAcceso.set(null);
    this.cargarPacientes();

    // Un usuario con sólo "Confirmar pagos bancarios" no puede usar las
    // vistas de registro/historial: se le lleva a su vista autorizada.
    if (
      !permisos.ver &&
      permisos.confirmar &&
      this.vista() !== 'confirmaciones' &&
      !this.redireccionAplicada
    ) {
      this.redireccionAplicada = true;
      void this.router.navigate([RUTA_POR_VISTA.confirmaciones]);
    }
  });

  ngOnInit(): void {
    this.menuService.cargar();
    const data = this.route.snapshot.data;
    const vista = data['vista'];
    this.vista.set(esVista(vista) ? vista : 'registro');
  }

  protected puedeVerVista(vista: VistaPagos): boolean {
    if (vista === 'confirmaciones') {
      return this.permisos().ver || this.permisos().confirmar;
    }
    return this.permisos().ver;
  }

  protected seleccionarVista(vista: VistaPagos): void {
    if (vista === this.vista() || !this.puedeVerVista(vista)) {
      return;
    }
    void this.router.navigate([RUTA_POR_VISTA[vista]]);
  }

  protected reintentarMenu(): void {
    this.menuService.reintentar();
  }

  protected reintentarPacientes(): void {
    this.cargarPacientes(true);
  }

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  private bloquear(motivo: MotivoSinAcceso): void {
    this.estadoPermiso.set(
      motivo === 'menu-error' || motivo === 'menu-invalido' ? 'error' : 'denegado',
    );
    this.motivoSinAcceso.set(motivo);
    this.permisos.set(SIN_PERMISOS);
  }

  private cargarPacientes(forzar = false): void {
    if (this.pacientesSolicitados && !forzar) {
      return;
    }
    this.pacientesSolicitados = true;
    this.cargandoPacientes.set(true);
    this.errorPacientes.set(null);

    this.pacientesService
      .listarPacientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pacientes) => {
          this.pacientes.set(pacientes ?? []);
          this.cargandoPacientes.set(false);
        },
        error: (error: unknown) => {
          this.pacientes.set([]);
          this.cargandoPacientes.set(false);
          this.errorPacientes.set(
            mensajeErrorPago(error, 'No se pudo cargar el listado de pacientes.'),
          );
        },
      });
  }
}
