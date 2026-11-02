import { Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { Sidebar } from '../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../core/services/menu.service';
import { Proveedor, ProveedorCambios, ProveedorDatos } from './proveedores.models';
import { ProveedoresService } from './proveedores.service';

const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

@Component({
  selector: 'app-gestion-proveedores',
  standalone: true,
  imports: [ReactiveFormsModule, Sidebar],
  templateUrl: './gestion-proveedores.html',
  styleUrl: './gestion-proveedores.css',
})
export class GestionProveedores implements OnInit, OnDestroy {
  readonly menu = inject(MenuService);
  private readonly api = inject(ProveedoresService);
  private readonly fb = inject(FormBuilder);
  private listaSub?: Subscription;
  private detalleSub?: Subscription;
  private operacionSub?: Subscription;
  readonly items = signal<Proveedor[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly consultando = signal(false);
  readonly error = signal('');
  readonly exito = signal('');
  readonly errorFormulario = signal('');
  readonly editor = signal(false);
  readonly editando = signal<Proveedor | null>(null);
  readonly detalle = signal<Proveedor | null>(null);
  readonly detalleId = signal<number | null>(null);
  readonly errorDetalle = signal('');
  readonly pendiente = signal<Proveedor | null>(null);
  readonly movil = signal(false);
  readonly funcion = computed(() => this.menu.estado() === 'listo'
    ? this.menu.modulos().flatMap(m => m.funciones).find(f => normalizar(f.nombre) === 'gestionar proveedores')
    : undefined);
  readonly puedeLeer = computed(() => ['lectura', 'ambas'].includes(normalizar(this.funcion()?.accion_nombre ?? '')));
  readonly puedeEscribir = computed(() => ['escritura', 'ambas'].includes(normalizar(this.funcion()?.accion_nombre ?? '')));
  readonly filtros = this.fb.nonNullable.group({ buscar: ['', Validators.maxLength(150)], estado: ['true'] });
  readonly form = this.fb.nonNullable.group({
    razon_social: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
    nit: ['', Validators.maxLength(30)],
    telefono: ['', Validators.maxLength(20)],
    correo: ['', [Validators.email, Validators.maxLength(100)]],
    direccion: ['', Validators.maxLength(255)],
    contacto: ['', Validators.maxLength(100)],
  });
  readonly campos = [
    { nombre: 'razon_social', etiqueta: 'Razón social', max: 150, tipo: 'text' },
    { nombre: 'nit', etiqueta: 'NIT', max: 30, tipo: 'text' },
    { nombre: 'telefono', etiqueta: 'Teléfono', max: 20, tipo: 'tel' },
    { nombre: 'correo', etiqueta: 'Correo electrónico', max: 100, tipo: 'email' },
    { nombre: 'direccion', etiqueta: 'Dirección', max: 255, tipo: 'text' },
    { nombre: 'contacto', etiqueta: 'Persona de contacto', max: 100, tipo: 'text' },
  ] as const;

  constructor() {
    effect(() => {
      const leer = this.puedeLeer();
      const escribir = this.puedeEscribir();
      untracked(() => {
        this.listaSub?.unsubscribe();
        this.cerrarDetalle();
        this.items.set([]);
        this.total.set(0);
        this.detalle.set(null);
        this.consultando.set(false);
        this.cargando.set(false);
        if (!escribir) { this.editor.set(false); this.pendiente.set(null); }
        if (leer) this.cargar(1);
      });
    });
  }

  ngOnInit() { this.menu.cargar(); }
  ngOnDestroy() {
    this.listaSub?.unsubscribe();
    this.detalleSub?.unsubscribe();
    this.operacionSub?.unsubscribe();
  }

  cargar(pagina = this.pagina()) {
    if (!this.puedeLeer() || this.filtros.invalid) return;
    this.cerrarDetalle();
    this.listaSub?.unsubscribe();
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.error.set('');
    this.items.set([]);
    const { buscar, estado } = this.filtros.getRawValue();
    this.listaSub = this.api.listar(pagina, estado === 'true', buscar).subscribe({
      next: respuesta => {
        if (pagina > 1 && !respuesta.items.length) { this.cargar(pagina - 1); return; }
        this.items.set(respuesta.items);
        this.total.set(respuesta.total);
        this.cargando.set(false);
      },
      error: e => { this.error.set(this.mensajeError(e)); this.cargando.set(false); },
    });
  }

  abrir(proveedor?: Proveedor) {
    if (!this.puedeEscribir() || this.guardando()) return;
    this.cerrarDetalle();
    this.detalleSub?.unsubscribe();
    this.consultando.set(false);
    this.detalle.set(null);
    this.pendiente.set(null);
    this.error.set('');
    this.editando.set(proveedor ?? null);
    this.form.reset();
    if (proveedor) {
      for (const campo of this.campos) this.form.controls[campo.nombre].setValue(proveedor[campo.nombre] ?? '');
    }
    this.errorFormulario.set('');
    this.exito.set('');
    this.editor.set(true);
  }

  cerrarEditor() {
    if (this.guardando()) return;
    this.editor.set(false);
    this.editando.set(null);
    this.errorFormulario.set('');
    this.form.reset();
  }

  ver(proveedor: Proveedor) {
    if (!this.puedeLeer() || this.guardando()) return;
    if (this.detalleId() === proveedor.id) {
      this.cerrarDetalle();
      return;
    }
    this.cerrarDetalle();
    this.detalleId.set(proveedor.id);
    this.consultando.set(true);
    this.error.set('');
    this.detalleSub = this.api.consultar(proveedor.id).subscribe({
      next: p => { this.detalle.set(p); this.consultando.set(false); },
      error: e => { this.errorDetalle.set(this.mensajeError(e)); this.consultando.set(false); },
    });
  }

  cerrarDetalle() {
    this.detalleSub?.unsubscribe();
    this.detalleId.set(null);
    this.detalle.set(null);
    this.consultando.set(false);
    this.errorDetalle.set('');
  }

  guardar() {
    if (!this.puedeEscribir() || this.guardando()) return;
    // Normalizar antes de validar, igual que el backend.
    for (const campo of this.campos) {
      const control = this.form.controls[campo.nombre];
      control.setValue(control.value.trim());
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const datos: ProveedorDatos = {
      razon_social: raw.razon_social, nit: raw.nit || null, telefono: raw.telefono || null,
      correo: raw.correo || null, direccion: raw.direccion || null, contacto: raw.contacto || null,
    };
    const actual = this.editando();
    const cambios: ProveedorCambios = {};
    if (actual) {
      if (datos.razon_social !== actual.razon_social) cambios.razon_social = datos.razon_social;
      for (const key of ['nit', 'telefono', 'correo', 'direccion', 'contacto'] as const) {
        if (datos[key] !== actual[key]) cambios[key] = datos[key];
      }
      if (!Object.keys(cambios).length) { this.errorFormulario.set('No hay cambios que guardar.'); return; }
    }
    this.guardando.set(true);
    this.errorFormulario.set('');
    this.operacionSub = (actual ? this.api.actualizar(actual.id, cambios) : this.api.crear(datos)).subscribe({
      next: r => {
        this.guardando.set(false); this.cerrarEditor(); this.exito.set(r.mensaje);
        this.cargar(actual ? this.pagina() : 1);
      },
      error: e => { this.guardando.set(false); this.errorFormulario.set(this.mensajeError(e)); },
    });
  }

  solicitarEstado(proveedor: Proveedor) {
    if (this.puedeEscribir() && !this.guardando()) { this.error.set(''); this.pendiente.set(proveedor); }
  }

  confirmarEstado() {
    const p = this.pendiente();
    if (!p || !this.puedeEscribir() || this.guardando()) return;
    this.guardando.set(true);
    const solicitud: Observable<unknown> = p.estado ? this.api.darBaja(p.id) : this.api.reactivar(p.id);
    this.operacionSub = solicitud.subscribe({
      next: () => {
        this.guardando.set(false); this.pendiente.set(null);
        this.exito.set(p.estado ? 'Proveedor dado de baja correctamente.' : 'Proveedor reactivado correctamente.');
        this.cargar();
      },
      error: e => { this.guardando.set(false); this.pendiente.set(null); this.error.set(this.mensajeError(e)); },
    });
  }

  private mensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la operación.';
    if (error.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
    if (error.status === 401) return 'La sesión no es válida o ha expirado. Inicia sesión en tu clínica.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status >= 500) return 'El servidor no pudo completar la operación. Intenta nuevamente.';
    const detalle: unknown = error.error?.detail;
    if (typeof detalle === 'string') return detalle;
    if (error.status === 422) return 'Revisa los campos: formato, longitudes y valores permitidos.';
    return 'No se pudo completar la operación. Actualiza la lista e intenta nuevamente.';
  }
}