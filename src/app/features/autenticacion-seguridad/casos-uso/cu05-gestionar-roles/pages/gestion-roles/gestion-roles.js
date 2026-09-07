import { __decorate } from "tslib";
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { RolesTable } from '../../components/roles-table/roles-table';
import { RolModal, } from '../../components/rol-modal/rol-modal';
import { RolesService } from '../../services/roles.service';
let GestionRoles = class GestionRoles {
    sidebarMovilAbierto = signal(false);
    roles = signal([]);
    modulos = signal([]);
    acciones = signal([]);
    cargando = signal(true);
    errorCarga = signal(false);
    buscarTermino = signal('');
    modalAbierto = signal(false);
    rolEnEdicion = signal(null);
    permisosRol = signal([]);
    permisosCargando = signal(false);
    guardando = signal(false);
    errorModal = signal(null);
    rolAEliminar = signal(null);
    eliminando = signal(false);
    errorEliminar = signal(null);
    exito = signal(null);
    error = signal(null);
    rolesService = inject(RolesService);
    authService = inject(AuthService);
    router = inject(Router);
    rolesFiltrados = computed(() => {
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
    catalogoListo = computed(() => this.acciones().length > 0);
    ngOnInit() {
        this.cargarTodo();
    }
    cargarTodo() {
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
    cargarRoles() {
        this.rolesService.listarRoles().subscribe({
            next: (roles) => this.roles.set(roles),
            error: () => {
                this.roles.set([]);
                this.errorCarga.set(true);
            },
        });
    }
    alternarSidebar() {
        this.sidebarMovilAbierto.update((abierto) => !abierto);
    }
    cerrarSidebar() {
        this.sidebarMovilAbierto.set(false);
    }
    cerrarSesion() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
    onBuscar(event) {
        this.buscarTermino.set(event.target.value);
    }
    abrirCrear() {
        this.errorModal.set(null);
        this.rolEnEdicion.set(null);
        this.permisosRol.set([]);
        this.permisosCargando.set(false);
        this.modalAbierto.set(true);
    }
    abrirEdicion(rol) {
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
                this.mostrarError('No se pudieron cargar los permisos actuales del rol.');
            },
        });
    }
    cerrarModal() {
        if (this.guardando()) {
            return;
        }
        this.modalAbierto.set(false);
        this.rolEnEdicion.set(null);
        this.errorModal.set(null);
    }
    guardarRol(datos) {
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
                this.mostrarExito(rol ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
                this.cargarRoles();
            },
            error: (err) => {
                this.guardando.set(false);
                this.errorModal.set(this.extraerError(err));
            },
        });
    }
    pedirEliminar(rol) {
        this.errorEliminar.set(null);
        this.rolAEliminar.set(rol);
    }
    cancelarEliminar() {
        if (this.eliminando()) {
            return;
        }
        this.rolAEliminar.set(null);
    }
    confirmarEliminar() {
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
            error: (err) => {
                this.eliminando.set(false);
                this.errorEliminar.set(this.extraerError(err));
            },
        });
    }
    mostrarExito(mensaje) {
        this.exito.set(mensaje);
        setTimeout(() => this.exito.set(null), 4000);
    }
    mostrarError(mensaje) {
        this.error.set(mensaje);
        setTimeout(() => this.error.set(null), 5000);
    }
    extraerError(err) {
        const objeto = err && typeof err === 'object'
            ? err
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
};
GestionRoles = __decorate([
    Component({
        selector: 'app-gestion-roles',
        imports: [Sidebar, RolesTable, RolModal],
        templateUrl: './gestion-roles.html',
        styleUrl: './gestion-roles.css',
    })
], GestionRoles);
export { GestionRoles };
