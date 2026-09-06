import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { UsuariosService } from '../../services/usuarios.service';
import { RolesService } from '../../../cu05-gestionar-roles/services/roles.service';
import { UsuariosTable } from '../../components/usuarios-table/usuarios-table';
import { UsuarioEstadoDialog } from '../../components/usuario-estado-dialog/usuario-estado-dialog';
import {
  UsuarioModal,
  UsuarioModalGuardar,
} from '../../components/usuario-modal/usuario-modal';
import {
  FiltroEstadoUsuario,
  RolUsuario,
  Usuario,
  UsuarioCrear,
} from '../../models/usuarios.models';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [Sidebar, UsuariosTable, UsuarioEstadoDialog, UsuarioModal],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})
export class GestionUsuarios implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);

  protected readonly roles = signal<RolUsuario[]>([]);
  protected readonly rolesCargando = signal(false);
  protected readonly rolesError = signal(false);

  protected readonly buscarTermino = signal('');
  protected readonly filtroEstado = signal<FiltroEstadoUsuario>('todos');

  protected readonly modalAbierto = signal(false);
  protected readonly usuarioEnEdicion = signal<Usuario | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorModal = signal<string | null>(null);

  protected readonly usuarioEstado = signal<Usuario | null>(null);
  protected readonly procesandoEstado = signal(false);
  protected readonly errorEstado = signal<string | null>(null);

  protected readonly exito = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly usuarioActualId = signal<number | null>(
    this.obtenerIdUsuarioActual(),
  );

  private readonly usuariosService = inject(UsuariosService);
  private readonly rolesService = inject(RolesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuariosFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    const filtro = this.filtroEstado();
    return this.usuarios().filter((usuario) => {
      if (filtro === 'activos' && !usuario.estado) {
        return false;
      }
      if (filtro === 'inactivos' && usuario.estado) {
        return false;
      }
      if (termino && !usuario.correo.toLowerCase().includes(termino)) {
        return false;
      }
      return true;
    });
  });

  protected readonly mensajeVacio = computed(() => {
    const hayFiltros =
      this.buscarTermino().trim().length > 0 ||
      this.filtroEstado() !== 'todos';
    return hayFiltros && this.usuarios().length > 0
      ? 'No hay usuarios que coincidan con los filtros seleccionados.'
      : 'No se encontraron usuarios.';
  });

  protected readonly rolesSelector = computed<RolUsuario[]>(() => {
    const disponibles = this.roles();
    const enEdicion = this.usuarioEnEdicion();
    if (!enEdicion) {
      return disponibles;
    }
    const yaIncluido = disponibles.some((rol) => rol.id === enEdicion.rol_id);
    if (yaIncluido) {
      return disponibles;
    }
    const rolActual: RolUsuario = {
      id: enEdicion.rol_id,
      nombre: enEdicion.rol?.nombre ?? 'Rol actual',
    };
    return [rolActual, ...disponibles];
  });

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.usuariosService.listarUsuarios().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.usuarios.set([]);
        this.cargando.set(false);
        this.errorCarga.set(true);
      },
    });
  }

  cargarRoles(): void {
    this.rolesCargando.set(true);
    this.rolesError.set(false);
    this.rolesService.listarRoles().subscribe({
      next: (roles) => {
        this.roles.set(
          roles
            .filter((rol) => rol.estado)
            .map((rol) => ({ id: rol.id, nombre: rol.nombre })),
        );
        this.rolesCargando.set(false);
      },
      error: () => {
        this.roles.set([]);
        this.rolesCargando.set(false);
        this.rolesError.set(true);
      },
    });
  }
  abrirCrear(): void {
    if (this.guardando()) {
      return;
    }
    this.errorModal.set(null);
    this.usuarioEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  abrirEdicion(usuario: Usuario): void {
    if (this.guardando()) {
      return;
    }
    this.errorModal.set(null);
    this.usuarioEnEdicion.set(usuario);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }
    this.modalAbierto.set(false);
    this.usuarioEnEdicion.set(null);
    this.errorModal.set(null);
  }

  guardarUsuario(datos: UsuarioModalGuardar): void {
    if (this.guardando()) {
      return;
    }

    const usuario = this.usuarioEnEdicion();
    this.guardando.set(true);
    this.errorModal.set(null);

    const peticion = usuario
      ? this.usuariosService.actualizarUsuario(usuario.id, datos)
      : this.usuariosService.crearUsuario(datos as UsuarioCrear);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.usuarioEnEdicion.set(null);
        this.mostrarExito(
          usuario
            ? 'Usuario actualizado correctamente.'
            : 'Usuario creado correctamente.',
        );
        this.cargarUsuarios();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorModal.set(this.extraerError(err));
      },
    });
  }

  pedirCambioEstado(usuario: Usuario): void {
    this.errorEstado.set(null);
    this.usuarioEstado.set(usuario);
  }

  cancelarCambioEstado(): void {
    if (this.procesandoEstado()) {
      return;
    }
    this.usuarioEstado.set(null);
    this.errorEstado.set(null);
  }

  confirmarCambioEstado(): void {
    const usuario = this.usuarioEstado();
    if (!usuario || this.procesandoEstado()) {
      return;
    }

    const objetivo = !usuario.estado;
    this.procesandoEstado.set(true);
    this.errorEstado.set(null);

    this.usuariosService.actualizarEstadoUsuario(usuario.id, objetivo).subscribe({
      next: () => {
        this.procesandoEstado.set(false);
        this.usuarioEstado.set(null);
        this.actualizarEstadoLocal(usuario.id, objetivo);
        this.mostrarExito(
          objetivo
            ? 'Usuario habilitado correctamente.'
            : 'Usuario deshabilitado correctamente.',
        );
      },
      error: (err: unknown) => {
        this.procesandoEstado.set(false);
        this.errorEstado.set(this.extraerError(err));
      },
    });
  }

  actualizarBusqueda(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.buscarTermino.set(valor);
  }

  limpiarBusqueda(): void {
    this.buscarTermino.set('');
  }

  seleccionarFiltro(filtro: FiltroEstadoUsuario): void {
    this.filtroEstado.set(filtro);
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

  private actualizarEstadoLocal(usuarioId: number, estado: boolean): void {
    this.usuarios.update((lista) =>
      lista.map((usuario) =>
        usuario.id === usuarioId ? { ...usuario, estado } : usuario,
      ),
    );
  }

  private mostrarExito(mensaje: string): void {
    this.exito.set(mensaje);
    setTimeout(() => this.exito.set(null), 4000);
  }

  private extraerError(err: unknown): string {
    const httpError =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: unknown })
        : null;
    const status = httpError?.status;
    const cuerpo = httpError?.error;
    let detalle: unknown = null;

    if (typeof cuerpo === 'string') {
      try {
        detalle = (JSON.parse(cuerpo) as { detail?: unknown }).detail ?? cuerpo;
      } catch {
        detalle = cuerpo;
      }
    } else if (cuerpo && typeof cuerpo === 'object') {
      const objeto = cuerpo as {
        detail?: unknown;
        mensaje?: unknown;
        message?: unknown;
      };
      detalle = objeto.detail ?? objeto.mensaje ?? objeto.message ?? null;
    }

    if (typeof detalle === 'string' && detalle.trim()) {
      return detalle;
    }

    if (Array.isArray(detalle)) {
      const mensajes = detalle
        .map((item) => {
          const detalleItem = item as { msg?: unknown };
          return typeof detalleItem?.msg === 'string' ? detalleItem.msg : null;
        })
        .filter((mensaje): mensaje is string => mensaje !== null);
      if (mensajes.length > 0) {
        return mensajes.join(' ');
      }
      return 'Algunos datos enviados no son válidos.';
    }

    switch (status) {
      case 400:
        return 'La solicitud no es válida. Revisa los datos e inténtalo nuevamente.';
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El usuario solicitado no fue encontrado.';
      case 409:
        return 'El correo ya está registrado.';
      case 422:
        return 'Algunos datos enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor. Inténtalo más tarde.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return 'Ocurrió un error inesperado.';
    }
  }

  private obtenerIdUsuarioActual(): number | null {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return null;
    }
    try {
      const segmento = token.split('.')[1];
      if (!segmento) {
        return null;
      }
      const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
      const binario = atob(base64);
      const bytes = Uint8Array.from(binario, (caracter) =>
        caracter.charCodeAt(0),
      );
      const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<
        string,
        unknown
      >;
      for (const clave of ['user_id', 'usuario_id', 'id', 'sub']) {
        const valor = claims[clave];
        if (valor === null || valor === undefined) {
          continue;
        }
        const numero = Number(valor);
        if (Number.isInteger(numero) && numero > 0) {
          return numero;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
