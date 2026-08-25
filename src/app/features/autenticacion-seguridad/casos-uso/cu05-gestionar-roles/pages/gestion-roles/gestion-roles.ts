import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { RolesTable } from '../../components/roles-table/roles-table';
import {
  RolModal,
  RolModalGuardar,
} from '../../components/rol-modal/rol-modal';
import {
  Accion,
  Modulo,
  PermisoRolRespuesta,
  Rol,
} from '../../models/roles.models';
import { RolesService } from '../../services/roles.service';

@Component({
  selector: 'app-gestion-roles',
  imports: [Sidebar, RolesTable, RolModal],
  templateUrl: './gestion-roles.html',
  styleUrl: './gestion-roles.css',
})
export class GestionRoles implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  protected readonly roles = signal<Rol[]>([]);
  protected readonly modulos = signal<Modulo[]>([]);
  protected readonly acciones = signal<Accion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly buscarTermino = signal('');

  protected readonly modalAbierto = signal(false);
  protected readonly rolEnEdicion = signal<Rol | null>(null);
  protected readonly permisosRol = signal<PermisoRolRespuesta[]>([]);
  protected readonly permisosCargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorModal = signal<string | null>(null);

  protected readonly rolAEliminar = signal<Rol | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  protected readonly exito = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly rolesService = inject(RolesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly rolesFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    if (!termino) {
      return this.roles();
    }
    return this.roles().filter((rol) => {
      const enNombre = rol.nombre.toLowerCase().includes(termino);
      const enDescripcion = (rol.descripcion ?? '')
        .toLowerCase()
        .includes(termino);
      return enNombre || enDescripcion;
    });
  });

  protected readonly catalogoListo = computed(
    () => this.acciones().length > 0,
  );

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    forkJoin({
      roles: this.rolesService.listarRoles().pipe(catchError(() => of([]))),
      modulos: this.rolesService
        .listarModulosFunciones()
        .pipe(catchError(() => of([]))),
      acciones: this.rolesService.listarAcciones().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ roles, modulos, acciones }) => {
        this.roles.set(roles);
        this.modulos.set(modulos);
        this.acciones.set(acciones);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set(true);
      },
    });
  }

  private cargarRoles(): void {
    this.rolesService.listarRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => {
        this.roles.set([]);
        this.errorCarga.set(true);
      },
    });
  }

  alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onBuscar(event: Event): void {
    this.buscarTermino.set((event.target as HTMLInputElement).value);
  }

  abrirCrear(): void {
    this.errorModal.set(null);
    this.rolEnEdicion.set(null);
    this.permisosRol.set([]);
    this.permisosCargando.set(false);
    this.modalAbierto.set(true);
  }

  abrirEdicion(rol: Rol): void {
    this.errorModal.set(null);
    this.rolEnEdicion.set(rol);
    this.permisosRol.set([]);
    this.permisosCargando.set(true);
    this.modalAbierto.set(true);

    this.rolesService.obtenerPermisosRol(rol.id).subscribe({
      next: (permisos) => {
        this.permisosRol.set(permisos);
        this.permisosCargando.set(false);
      },
      error: () => {
        this.permisosRol.set([]);
        this.permisosCargando.set(false);
        this.mostrarError(
          'No se pudieron cargar los permisos actuales del rol.',
        );
      },
    });
  }

  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }
    this.modalAbierto.set(false);
    this.rolEnEdicion.set(null);
    this.errorModal.set(null);
  }

  guardarRol(datos: RolModalGuardar): void {
    if (this.guardando()) {
      return;
    }

    const rol = this.rolEnEdicion();
    this.guardando.set(true);
    this.errorModal.set(null);

    const peticion = rol
      ? this.rolesService.actualizarRol(rol.id, {
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          permisos: datos.permisos,
        })
      : this.rolesService.crearRol({
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          permisos: datos.permisos,
        });

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.rolEnEdicion.set(null);
        this.mostrarExito(
          rol ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.',
        );
        this.cargarRoles();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorModal.set(this.extraerError(err));
      },
    });
  }

  pedirEliminar(rol: Rol): void {
    this.errorEliminar.set(null);
    this.rolAEliminar.set(rol);
  }

  cancelarEliminar(): void {
    if (this.eliminando()) {
      return;
    }
    this.rolAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const rol = this.rolAEliminar();
    if (!rol || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.rolesService.desactivarRol(rol.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.rolAEliminar.set(null);
        this.mostrarExito('Rol desactivado correctamente.');
        this.cargarRoles();
      },
      error: (err: unknown) => {
        this.eliminando.set(false);
        this.errorEliminar.set(this.extraerError(err));
      },
    });
  }

  private mostrarExito(mensaje: string): void {
    this.exito.set(mensaje);
    setTimeout(() => this.exito.set(null), 4000);
  }

  private mostrarError(mensaje: string): void {
    this.error.set(mensaje);
    setTimeout(() => this.error.set(null), 5000);
  }

  private extraerError(err: unknown): string {
    const objeto =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: { detail?: unknown } })
        : null;
    const status = objeto?.status;
    const detail = objeto?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    switch (status) {
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El rol solicitado no fue encontrado.';
      case 409:
        return 'Ya existe un rol con ese nombre.';
      case 422:
        return 'Algunos datos enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return 'Ocurrió un error inesperado.';
    }
  }
}
