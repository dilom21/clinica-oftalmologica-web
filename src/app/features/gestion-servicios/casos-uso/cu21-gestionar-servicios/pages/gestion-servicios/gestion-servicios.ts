import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuFuncion } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { NavegacionService } from '../../../../../../core/services/navegacion.service';
import {
  ServicioOftalmologico,
  ServicioOftalmologicoGuardar,
} from '../../../../../../interfaces/servicio-oftalmologico.interface';
import { ServicioOftalmologicoService } from '../../../../../../services/servicio-oftalmologico.service';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';

function normalizarNombre(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

@Component({
  selector: 'app-gestion-servicios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Sidebar],
  templateUrl: './gestion-servicios.html',
  styleUrl: './gestion-servicios.css',
})
export class GestionServicios implements OnInit {
  protected readonly servicios = signal<ServicioOftalmologico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly funcionMenu = signal<MenuFuncion | null>(null);
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly mostrarModal = signal(false);
  protected readonly servicioEnEdicion = signal<ServicioOftalmologico | null>(null);
  protected readonly puedeEscribir = computed(() => {
    const accion = this.funcionMenu()?.accion_nombre;
    return !!accion && ['escritura', 'ambas'].includes(normalizarNombre(accion));
  });

  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly navegacion = inject(NavegacionService);
  private readonly servicioService = inject(ServicioOftalmologicoService);
  private funcionProcesadaId: number | null | undefined;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    descripcion: ['', [Validators.required, Validators.pattern(/\S/)]],
    precio_base: [0, [Validators.required, Validators.min(0)]],
    duracion_estimada: [30, [Validators.required, Validators.min(1)]],
    estado: [true],
  });

  private readonly sincronizarPermiso = effect(() => {
    const estado = this.menuService.estado();
    if (estado === 'error') {
      this.estadoPermiso.set('error');
      this.funcionMenu.set(null);
      this.servicios.set([]);
      return;
    }
    if (estado !== 'listo') {
      this.estadoPermiso.set('verificando');
      return;
    }

    const funcion = this.menuService
      .modulos()
      .flatMap((modulo) => modulo.funciones ?? [])
      .find((item) => this.navegacion.rutaDeFuncion(item.nombre) === '/gestion-servicios');

    this.funcionMenu.set(funcion ?? null);
    this.estadoPermiso.set(funcion ? 'autorizado' : 'denegado');
    if (!funcion) {
      this.servicios.set([]);
      this.funcionProcesadaId = null;
      return;
    }
    if (this.funcionProcesadaId !== funcion.id) {
      this.funcionProcesadaId = funcion.id;
      this.cargarServicios();
    }
  });

  ngOnInit(): void {
    this.menuService.cargar();
  }

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected reintentarPermisos(): void {
    this.menuService.reintentar();
  }

  protected cargarServicios(): void {
    if (this.estadoPermiso() !== 'autorizado') return;
    this.cargando.set(true);
    this.error.set(null);
    this.servicioService.listarServicios().subscribe({
      next: (servicios) => {
        this.servicios.set(servicios ?? []);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(this.mensajeError(error, 'cargar'));
      },
    });
  }

  protected abrirModalNuevo(): void {
    if (!this.puedeEscribir()) return;
    this.servicioEnEdicion.set(null);
    this.form.reset({
      nombre: '',
      descripcion: '',
      precio_base: 0,
      duracion_estimada: 30,
      estado: true,
    });
    this.error.set(null);
    this.mostrarModal.set(true);
  }

  protected abrirModalEditar(servicio: ServicioOftalmologico): void {
    if (!this.puedeEscribir() || servicio.id === undefined) return;
    this.servicioEnEdicion.set(servicio);
    this.form.reset({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio_base: servicio.precio_base,
      duracion_estimada: servicio.duracion_estimada,
      estado: servicio.estado,
    });
    this.error.set(null);
    this.mostrarModal.set(true);
  }

  protected cerrarModal(): void {
    if (this.guardando()) return;
    this.mostrarModal.set(false);
    this.servicioEnEdicion.set(null);
  }

  protected guardarServicio(): void {
    if (!this.puedeEscribir() || this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Revisa los campos obligatorios y los valores numéricos.');
      return;
    }

    const valor = this.form.getRawValue();
    const datos: ServicioOftalmologicoGuardar = {
      ...valor,
      nombre: valor.nombre.trim(),
      descripcion: valor.descripcion.trim(),
    };
    const actual = this.servicioEnEdicion();
    const solicitud = actual?.id !== undefined
      ? this.servicioService.actualizarServicio(actual.id, datos)
      : this.servicioService.crearServicio(datos);

    this.guardando.set(true);
    this.error.set(null);
    solicitud.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.exito.set(actual ? 'Servicio actualizado correctamente.' : 'Servicio registrado correctamente.');
        this.cargarServicios();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error, actual ? 'actualizar' : 'registrar'));
      },
    });
  }

  protected desactivarServicio(servicio: ServicioOftalmologico): void {
    if (!this.puedeEscribir() || servicio.id === undefined || this.guardando()) return;
    if (!confirm(`¿Deseas desactivar el servicio "${servicio.nombre}"?`)) return;

    const { id, ...datos } = servicio;
    this.guardando.set(true);
    this.error.set(null);
    this.servicioService.actualizarServicio(id, { ...datos, estado: false }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set('Servicio desactivado correctamente.');
        this.cargarServicios();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error, 'desactivar'));
      },
    });
  }

  private mensajeError(
    error: unknown,
    operacion: 'cargar' | 'registrar' | 'actualizar' | 'desactivar',
  ): string {
    const respuesta = error && typeof error === 'object'
      ? (error as { status?: number; error?: { detail?: unknown } })
      : null;
    const detalle = respuesta?.error?.detail;
    if (typeof detalle === 'string' && detalle.trim()) return detalle;
    if (respuesta?.status === 401) return 'Tu sesión ha expirado o no has iniciado sesión.';
    if (respuesta?.status === 403) return 'El servidor rechazó la operación por falta de permisos.';
    if (respuesta?.status === 0) return 'No se pudo conectar con el servidor.';
    return operacion === 'cargar'
      ? 'No se pudieron cargar los servicios oftalmológicos.'
      : `No se pudo ${operacion} el servicio oftalmológico.`;
  }
}
