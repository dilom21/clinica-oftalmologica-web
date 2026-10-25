import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuFuncion } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { NavegacionService } from '../../../../../../core/services/navegacion.service';
import { Proveedor, ProveedorGuardar } from '../../models/proveedores.models';
import { ProveedoresService } from '../../services/proveedores.service';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';
type Operacion = 'cargar' | 'registrar' | 'actualizar' | 'desactivar' | 'reactivar';
type CampoProveedor = keyof ProveedorGuardar;

export const RUTA_PROVEEDORES = '/proveedores';
export const TAMANO_PAGINA = 20;

function normalizarNombre(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function textoONulo(valor: string): string | null {
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

@Component({
  selector: 'app-gestion-proveedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Sidebar],
  templateUrl: './gestion-proveedores.html',
  styleUrl: './gestion-proveedores.css',
})
export class GestionProveedores implements OnInit {
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly funcionMenu = signal<MenuFuncion | null>(null);
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly mostrarModal = signal(false);
  protected readonly proveedorEnEdicion = signal<Proveedor | null>(null);
  protected readonly verInactivos = signal(false);
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(0);
  protected readonly hayMas = signal(false);
  protected readonly puedeEscribir = computed(() => {
    const accion = this.funcionMenu()?.accion_nombre;
    return !!accion && ['escritura', 'ambas'].includes(normalizarNombre(accion));
  });

  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly navegacion = inject(NavegacionService);
  private readonly proveedoresService = inject(ProveedoresService);
  private funcionProcesadaId: number | null | undefined;

  // Límites alineados con las columnas de `proveedores` en el backend.
  protected readonly form = this.fb.nonNullable.group({
    razon_social: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
    nit: ['', [Validators.maxLength(30)]],
    telefono: ['', [Validators.maxLength(20)]],
    correo: ['', [Validators.email, Validators.maxLength(100)]],
    direccion: ['', [Validators.maxLength(255)]],
    contacto: ['', [Validators.maxLength(100)]],
  });

  private readonly sincronizarPermiso = effect(() => {
    const estado = this.menuService.estado();
    if (estado === 'error') {
      this.estadoPermiso.set('error');
      this.funcionMenu.set(null);
      this.proveedores.set([]);
      return;
    }
    if (estado !== 'listo') {
      this.estadoPermiso.set('verificando');
      return;
    }

    const funcion = this.menuService
      .modulos()
      .flatMap((modulo) => modulo.funciones ?? [])
      .find((item) => this.navegacion.rutaDeFuncion(item.nombre) === RUTA_PROVEEDORES);

    this.funcionMenu.set(funcion ?? null);
    this.estadoPermiso.set(funcion ? 'autorizado' : 'denegado');
    if (!funcion) {
      this.proveedores.set([]);
      this.funcionProcesadaId = null;
      return;
    }
    if (this.funcionProcesadaId !== funcion.id) {
      this.funcionProcesadaId = funcion.id;
      this.cargarProveedores();
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

  protected cargarProveedores(): void {
    if (this.estadoPermiso() !== 'autorizado') return;
    this.cargando.set(true);
    this.error.set(null);
    this.proveedoresService
      .listar({
        estado: !this.verInactivos(),
        busqueda: this.busqueda(),
        skip: this.pagina() * TAMANO_PAGINA,
        limit: TAMANO_PAGINA,
      })
      .subscribe({
        next: (proveedores) => {
          this.proveedores.set(proveedores ?? []);
          this.hayMas.set((proveedores ?? []).length === TAMANO_PAGINA);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(error, 'cargar'));
        },
      });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto.trim());
    this.pagina.set(0);
    this.cargarProveedores();
  }

  protected limpiarBusqueda(campo: HTMLInputElement): void {
    campo.value = '';
    this.buscar('');
  }

  protected cambiarVista(inactivos: boolean): void {
    if (this.verInactivos() === inactivos) return;
    this.verInactivos.set(inactivos);
    this.pagina.set(0);
    this.exito.set(null);
    this.cargarProveedores();
  }

  protected irAPagina(desplazamiento: number): void {
    const destino = this.pagina() + desplazamiento;
    if (destino < 0 || (desplazamiento > 0 && !this.hayMas())) return;
    this.pagina.set(destino);
    this.cargarProveedores();
  }

  protected abrirModalNuevo(): void {
    if (!this.puedeEscribir()) return;
    this.proveedorEnEdicion.set(null);
    this.form.reset({
      razon_social: '',
      nit: '',
      telefono: '',
      correo: '',
      direccion: '',
      contacto: '',
    });
    this.errorModal.set(null);
    this.mostrarModal.set(true);
  }

  protected abrirModalEditar(proveedor: Proveedor): void {
    if (!this.puedeEscribir()) return;
    this.proveedorEnEdicion.set(proveedor);
    this.form.reset({
      razon_social: proveedor.razon_social,
      nit: proveedor.nit ?? '',
      telefono: proveedor.telefono ?? '',
      correo: proveedor.correo ?? '',
      direccion: proveedor.direccion ?? '',
      contacto: proveedor.contacto ?? '',
    });
    this.errorModal.set(null);
    this.mostrarModal.set(true);
  }

  protected cerrarModal(): void {
    if (this.guardando()) return;
    this.mostrarModal.set(false);
    this.proveedorEnEdicion.set(null);
  }

  protected guardarProveedor(): void {
    if (!this.puedeEscribir() || this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorModal.set('Revisa los campos marcados antes de guardar.');
      return;
    }

    const valor = this.form.getRawValue();
    const datos: ProveedorGuardar = {
      razon_social: valor.razon_social.trim(),
      nit: textoONulo(valor.nit),
      telefono: textoONulo(valor.telefono),
      correo: textoONulo(valor.correo),
      direccion: textoONulo(valor.direccion),
      contacto: textoONulo(valor.contacto),
    };
    const actual = this.proveedorEnEdicion();
    const solicitud = actual
      ? this.proveedoresService.actualizar(actual.id, datos)
      : this.proveedoresService.crear(datos);

    this.guardando.set(true);
    this.errorModal.set(null);
    solicitud.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.exito.set(actual ? 'Proveedor actualizado correctamente.' : 'Proveedor registrado correctamente.');
        this.cargarProveedores();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.errorModal.set(this.mensajeError(error, actual ? 'actualizar' : 'registrar'));
      },
    });
  }

  protected desactivarProveedor(proveedor: Proveedor): void {
    if (!this.puedeEscribir() || this.guardando()) return;
    if (!confirm(`¿Deseas dar de baja al proveedor "${proveedor.razon_social}"?`)) return;
    this.ejecutarCambioEstado(
      this.proveedoresService.desactivar(proveedor.id),
      'desactivar',
      'Proveedor dado de baja correctamente.',
    );
  }

  protected reactivarProveedor(proveedor: Proveedor): void {
    if (!this.puedeEscribir() || this.guardando()) return;
    this.ejecutarCambioEstado(
      this.proveedoresService.reactivar(proveedor.id),
      'reactivar',
      'Proveedor reactivado correctamente.',
    );
  }

  protected campoInvalido(campo: CampoProveedor): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  private ejecutarCambioEstado(
    solicitud: Observable<unknown>,
    operacion: Operacion,
    mensaje: string,
  ): void {
    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(null);
    solicitud.subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set(mensaje);
        this.cargarProveedores();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(error, operacion));
      },
    });
  }

  private mensajeError(error: unknown, operacion: Operacion): string {
    const respuesta = error && typeof error === 'object'
      ? (error as { status?: number; error?: { detail?: unknown } })
      : null;
    const detalle = respuesta?.error?.detail;
    // 404/409 traen un mensaje de negocio legible (p. ej. NIT duplicado).
    if (typeof detalle === 'string' && detalle.trim()) return detalle;
    if (respuesta?.status === 401) return 'Tu sesión ha expirado o no has iniciado sesión.';
    if (respuesta?.status === 403) return 'Tu rol no tiene permiso para esta operación sobre proveedores.';
    if (respuesta?.status === 422) return 'Algunos datos no son válidos. Revisa el formulario.';
    if (respuesta?.status === 0) return 'No se pudo conectar con el servidor.';
    return operacion === 'cargar'
      ? 'No se pudieron cargar los proveedores.'
      : `No se pudo ${operacion} el proveedor.`;
  }
}
