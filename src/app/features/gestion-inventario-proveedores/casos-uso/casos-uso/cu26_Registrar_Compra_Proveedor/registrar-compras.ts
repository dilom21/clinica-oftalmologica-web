import { afterNextRender, Component, ElementRef, Injector, viewChild, computed, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Sidebar } from '../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../core/services/menu.service';
import { ComprasService } from './compras.service';
import { Compra, CompraCrear, CompraResumen, DetalleCompraCrear, LineaCompra, LoteCompra, ProductoCompra, ProveedorCompra } from './compras.models';
import { centavos, hoyClinica, importe } from './compras.utils';

const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const enteroPositivo = (c: AbstractControl) => Number.isInteger(Number(c.value)) && Number(c.value) > 0 && Number(c.value) <= 2147483647 ? null : { entero: true };

@Component({
  selector: 'app-registrar-compras', standalone: true,
  imports: [Sidebar, ReactiveFormsModule, DatePipe, NgTemplateOutlet],
  templateUrl: './registrar-compras.html', styleUrl: './registrar-compras.css',
})
export class RegistrarCompras implements OnInit, OnDestroy {
  readonly menu = inject(MenuService);
  private readonly api = inject(ComprasService);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly confirmacion = viewChild<ElementRef<HTMLElement>>('confirmacion');
  private readonly ficha = viewChild<ElementRef<HTMLElement>>('fichaDetalle');
  private readonly subs = new Map<string, Subscription>();
  private secuencia = 0;
  readonly movil = signal(false);
  readonly vista = signal<'registro' | 'historial'>('registro');
  readonly funcion = computed(() => this.menu.estado() === 'listo'
    ? this.menu.modulos().flatMap(m => m.funciones).find(f => normalizar(f.nombre) === 'registrar compras a proveedor')
    : undefined);
  readonly puedeLeer = computed(() => ['lectura', 'ambas'].includes(normalizar(this.funcion()?.accion_nombre ?? '')));
  readonly puedeEscribir = computed(() => ['escritura', 'ambas'].includes(normalizar(this.funcion()?.accion_nombre ?? '')));
  readonly guardando = signal(false);
  readonly confirmando = signal(false);
  readonly bloqueado = computed(() => this.guardando() || this.confirmando());
  readonly error = signal('');
  readonly errorLinea = signal('');
  readonly exito = signal('');
  readonly proveedores = signal<ProveedorCompra[]>([]);
  readonly proveedor = signal<ProveedorCompra | null>(null);
  readonly paginaProveedor = signal(1);
  readonly totalProveedores = signal(0);
  readonly cargandoProveedores = signal(false);
  readonly errorProveedores = signal('');
  readonly productos = signal<ProductoCompra[]>([]);
  readonly producto = signal<ProductoCompra | null>(null);
  readonly paginaProducto = signal(1);
  readonly totalProductos = signal(0);
  readonly cargandoProductos = signal(false);
  readonly errorProductos = signal('');
  readonly lotes = signal<LoteCompra[]>([]);
  readonly lote = signal<LoteCompra | null>(null);
  readonly paginaLote = signal(1);
  readonly totalLotes = signal(0);
  readonly cargandoLotes = signal(false);
  readonly errorLotes = signal('');
  readonly lineas = signal<LineaCompra[]>([]);
  readonly totalCentavos = computed(() => this.lineas().reduce((t, l) => t + this.subtotal(l), 0n));
  readonly historial = signal<CompraResumen[]>([]);
  readonly paginaHistorial = signal(1);
  readonly totalHistorial = signal(0);
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal('');
  readonly detalle = signal<Compra | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal('');
  readonly registrado = signal<Compra | null>(null);
  readonly moneda = signal('BOB');
  readonly hoy = hoyClinica();
  readonly busquedaProveedor = this.fb.nonNullable.control('', Validators.maxLength(150));
  readonly busquedaProducto = this.fb.nonNullable.control('', Validators.maxLength(160));
  readonly cabecera = this.fb.nonNullable.group({
    proveedor_id: ['', Validators.required],
    numero_documento: ['', Validators.maxLength(80)],
    moneda: ['BOB', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    observaciones: ['', Validators.maxLength(2000)],
  });
  readonly linea = this.fb.nonNullable.group({
    producto_id: ['', Validators.required], modo: ['existente'],
    lote_id: [''], numero_lote: ['', Validators.maxLength(80)],
    fecha_fabricacion: [''], fecha_vencimiento: [''],
    cantidad: ['1', [Validators.required, enteroPositivo]],
    costo_unitario: ['', [Validators.required, Validators.pattern(/^\d{1,10}(\.\d{1,2})?$/)]],
    observaciones: ['', Validators.maxLength(2000)],
  });

  constructor() {
    effect(() => {
      const leer = this.puedeLeer();
      const escribir = this.puedeEscribir();
      this.menu.modulos();
      untracked(() => {
        this.cancelarConsultas(); this.cancelar('crear'); this.guardando.set(false);
        this.limpiarFormulario();
        this.proveedores.set([]); this.productos.set([]); this.historial.set([]);
        this.detalle.set(null); this.registrado.set(null); this.exito.set('');
        this.totalProveedores.set(0); this.totalProductos.set(0); this.totalHistorial.set(0);
        if (leer) {
          this.vista.set(escribir ? 'registro' : 'historial');
          if (escribir) { this.cargarProveedores(); this.cargarProductos(); }
          else this.cargarHistorial();
        }
      });
    });
    this.subs.set('moneda', this.cabecera.controls.moneda.valueChanges.subscribe(v => this.moneda.set(v)));
  }

  ngOnInit() { this.menu.cargar(); }
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }
  paginas(total: number) { return Math.max(1, Math.ceil(total / 20)); }
  subtotal(l: LineaCompra) { return centavos(l.datos.costo_unitario) * BigInt(l.datos.cantidad); }
  dinero(valor: bigint, moneda = this.moneda()) { return importe(valor, moneda); }
  dineroServidor(valor: string, moneda: string) { return importe(centavos(valor), moneda); }
  proveedorFueraDePagina() { const p = this.proveedor(); return p && !this.proveedores().some(x => x.id === p.id) ? p : null; }
  productoFueraDePagina() { const p = this.producto(); return p && !this.productos().some(x => x.id === p.id) ? p : null; }
  loteFueraDePagina() { const l = this.lote(); return l && !this.lotes().some(x => x.id === l.id) ? l : null; }

  cargarProveedores(pagina = 1) {
    if (!this.puedeLeer() || this.bloqueado() || this.busquedaProveedor.invalid) return;
    this.cancelar('proveedores'); this.cargandoProveedores.set(true); this.errorProveedores.set('');
    this.proveedores.set([]); this.paginaProveedor.set(pagina);
    this.subs.set('proveedores', this.api.proveedores(pagina, this.busquedaProveedor.value).subscribe({
      next: r => { this.proveedores.set(r.items); this.totalProveedores.set(r.total); this.cargandoProveedores.set(false); },
      error: e => { this.errorProveedores.set(this.mensajeError(e)); this.cargandoProveedores.set(false); },
    }));
  }
  seleccionarProveedor() {
    const id = Number(this.cabecera.controls.proveedor_id.value);
    this.proveedor.set(this.proveedores().find(p => p.id === id) ?? (this.proveedor()?.id === id ? this.proveedor() : null));
  }
  cargarProductos(pagina = 1) {
    if (!this.puedeLeer() || this.bloqueado() || this.busquedaProducto.invalid) return;
    this.cancelar('productos'); this.cargandoProductos.set(true); this.errorProductos.set('');
    this.productos.set([]); this.paginaProducto.set(pagina);
    this.subs.set('productos', this.api.productos(pagina, this.busquedaProducto.value).subscribe({
      next: r => { this.productos.set(r.items); this.totalProductos.set(r.total); this.cargandoProductos.set(false); },
      error: e => { this.errorProductos.set(this.mensajeError(e)); this.cargandoProductos.set(false); },
    }));
  }
  seleccionarProducto() {
    const id = Number(this.linea.controls.producto_id.value);
    const p = this.productos().find(p => p.id === id) ?? (this.producto()?.id === id ? this.producto() : null);
    this.cancelar('lotes'); this.lotes.set([]); this.lote.set(null); this.totalLotes.set(0);
    this.cargandoLotes.set(false); this.errorLotes.set(''); this.producto.set(p);
    this.linea.patchValue({ lote_id: '', numero_lote: '', fecha_fabricacion: '', fecha_vencimiento: '' });
    if (p) this.cargarLotes();
  }
  cargarLotes(pagina = 1) {
    const p = this.producto();
    if (!p || !this.puedeLeer() || this.bloqueado()) return;
    this.cancelar('lotes'); this.cargandoLotes.set(true); this.errorLotes.set('');
    this.lotes.set([]); this.paginaLote.set(pagina);
    this.subs.set('lotes', this.api.lotes(p.id, pagina).subscribe({
      next: r => { this.lotes.set(r.items); this.totalLotes.set(r.total); this.cargandoLotes.set(false); },
      error: e => { this.errorLotes.set(this.mensajeError(e)); this.cargandoLotes.set(false); },
    }));
  }
  seleccionarLote() {
    const id = Number(this.linea.controls.lote_id.value);
    this.lote.set(this.lotes().find(l => l.id === id) ?? (this.lote()?.id === id ? this.lote() : null));
  }
  cambiarModo() { this.errorLinea.set(''); }

  agregarLinea() {
    if (this.bloqueado() || !this.puedeEscribir() || !this.puedeLeer()) return;
    this.errorLinea.set(''); this.linea.markAllAsTouched();
    const raw = this.linea.getRawValue();
    const producto = this.producto();
    if (this.linea.invalid || !producto || /\x00/.test(raw.observaciones + raw.numero_lote)) {
      this.errorLinea.set('Selecciona un producto y revisa cantidad, precio y campos indicados.'); return;
    }
    if (this.lineas().length >= 200) { this.errorLinea.set('La compra admite hasta 200 detalles.'); return; }
    const datos: DetalleCompraCrear = {
      producto_id: producto.id, cantidad: Number(raw.cantidad),
      costo_unitario: raw.costo_unitario.trim(),
    };
    if (raw.observaciones.trim()) datos.observaciones = raw.observaciones.trim();
    let numeroLote: string;
    let vencimiento: string | null;
    if (raw.modo === 'existente') {
      const lote = this.lote();
      if (!lote || lote.producto_id !== producto.id) { this.errorLinea.set('Selecciona un lote vigente para este producto.'); return; }
      datos.lote_id = lote.id; numeroLote = lote.numero_lote; vencimiento = lote.fecha_vencimiento;
    } else {
      numeroLote = raw.numero_lote.trim(); vencimiento = raw.fecha_vencimiento || null;
      if (!numeroLote || numeroLote.length > 80) { this.errorLinea.set('Indica un número de lote de hasta 80 caracteres.'); return; }
      if ((raw.fecha_fabricacion && raw.fecha_fabricacion > this.hoy)
        || (raw.fecha_vencimiento && raw.fecha_vencimiento < this.hoy)
        || (raw.fecha_fabricacion && raw.fecha_vencimiento && raw.fecha_fabricacion > raw.fecha_vencimiento)) {
        this.errorLinea.set('Revisa las fechas: el lote debe estar vigente y la fabricación no puede ser futura ni posterior al vencimiento.'); return;
      }
      datos.numero_lote = numeroLote;
      if (raw.fecha_fabricacion) datos.fecha_fabricacion = raw.fecha_fabricacion;
      if (raw.fecha_vencimiento) datos.fecha_vencimiento = raw.fecha_vencimiento;
    }
    if (this.lineas().some(l => l.producto.id === producto.id && l.numeroLote === numeroLote)) {
      this.errorLinea.set('Este lote ya está en la compra. Quita su detalle para volver a ingresarlo con otra cantidad.'); return;
    }
    this.lineas.update(items => [...items, { clave: ++this.secuencia, producto, numeroLote, vencimiento, datos }]);
    this.linea.patchValue({ cantidad: '1', costo_unitario: '', observaciones: '' });
    this.linea.markAsUntouched();
  }
  quitarLinea(clave: number) {
    if (!this.bloqueado()) this.lineas.update(items => items.filter(l => l.clave !== clave));
  }
  revisarCompra() {
    if (this.bloqueado() || !this.puedeEscribir() || !this.puedeLeer()) return;
    this.error.set(''); this.cabecera.markAllAsTouched();
    if (this.cabecera.invalid || !this.proveedor() || !this.lineas().length) {
      this.error.set('Selecciona un proveedor y agrega al menos un producto con cantidad y precio válidos.'); return;
    }
    const raw = this.cabecera.getRawValue();
    if (/\x00/.test(raw.numero_documento + raw.observaciones)) { this.error.set('Revisa los caracteres del documento y las observaciones.'); return; }
    this.confirmando.set(true);
    afterNextRender(() => this.confirmacion()?.nativeElement.focus(), { injector: this.injector });
  }
  confirmarCompra() {
    if (!this.confirmando() || this.guardando() || !this.puedeEscribir() || !this.puedeLeer()) return;
    const proveedor = this.proveedor();
    if (!proveedor || !this.lineas().length || this.cabecera.invalid) return;
    const raw = this.cabecera.getRawValue();
    const datos: CompraCrear = {
      proveedor_id: proveedor.id, moneda: raw.moneda,
      detalles: this.lineas().map(l => ({ ...l.datos })),
    };
    if (raw.numero_documento.trim()) datos.numero_documento = raw.numero_documento.trim();
    if (raw.observaciones.trim()) datos.observaciones = raw.observaciones.trim();
    this.guardando.set(true); this.error.set('');
    this.subs.set('crear', this.api.crear(datos).subscribe({
      next: r => {
        this.guardando.set(false); this.limpiarFormulario();
        this.registrado.set(r.compra); this.exito.set(r.mensaje);
        this.enfocarFicha();
      },
      error: e => {
        this.guardando.set(false); this.confirmando.set(false);
        this.error.set(e instanceof HttpErrorResponse && (e.status === 0 || e.status >= 500)
          ? 'No se recibió la confirmación de la compra. Consulta el historial antes de reenviar para evitar duplicados.'
          : this.mensajeError(e));
      },
    }));
  }
  cambiarVista(vista: 'registro' | 'historial') {
    if (this.guardando()) return;
    this.confirmando.set(false); this.vista.set(vista);
    this.cerrarDetalle();
    if (vista === 'historial') this.cargarHistorial();
  }
  nuevaCompra() {
    if (this.guardando()) return;
    this.registrado.set(null); this.exito.set(''); this.error.set('');
    this.vista.set('registro'); this.cargarProveedores(); this.cargarProductos();
  }
  cargarHistorial(pagina = 1) {
    if (!this.puedeLeer()) return;
    this.cancelar('historial'); this.cerrarDetalle(); this.cargandoHistorial.set(true);
    this.errorHistorial.set(''); this.historial.set([]); this.paginaHistorial.set(pagina);
    this.subs.set('historial', this.api.listar(pagina).subscribe({
      next: r => { this.historial.set(r.items); this.totalHistorial.set(r.total); this.cargandoHistorial.set(false); },
      error: e => { this.errorHistorial.set(this.mensajeError(e)); this.cargandoHistorial.set(false); },
    }));
  }
  verCompra(id: number) {
    if (!this.puedeLeer()) return;
    this.cerrarDetalle(); this.cargandoDetalle.set(true);
    this.subs.set('detalle', this.api.consultar(id).subscribe({
      next: r => { this.detalle.set(r); this.cargandoDetalle.set(false); this.enfocarFicha(); },
      error: e => { this.errorDetalle.set(this.mensajeError(e)); this.cargandoDetalle.set(false); },
    }));
  }
  cerrarDetalle() { this.cancelar('detalle'); this.detalle.set(null); this.errorDetalle.set(''); this.cargandoDetalle.set(false); }
  private enfocarFicha() {
    afterNextRender(() => this.ficha()?.nativeElement.focus(), { injector: this.injector });
  }
  private limpiarFormulario() {
    this.confirmando.set(false); this.lineas.set([]); this.proveedor.set(null); this.producto.set(null);
    this.lote.set(null); this.lotes.set([]); this.error.set(''); this.errorLinea.set('');
    this.cabecera.reset(); this.linea.reset(); this.moneda.set('BOB');
  }
  private cancelar(clave: string) { this.subs.get(clave)?.unsubscribe(); this.subs.delete(clave); }
  private cancelarConsultas() {
    for (const clave of ['proveedores', 'productos', 'lotes', 'historial', 'detalle']) this.cancelar(clave);
    this.cargandoProveedores.set(false); this.cargandoProductos.set(false); this.cargandoLotes.set(false);
    this.cargandoHistorial.set(false); this.cargandoDetalle.set(false);
  }
  private mensajeError(e: unknown): string {
    if (!(e instanceof HttpErrorResponse)) return 'No se pudo completar la operación.';
    if (e.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentar.';
    if (e.status === 401) return 'La sesión expiró o no corresponde a una clínica. Inicia sesión nuevamente.';
    if (e.status === 403) return 'Tu rol no tiene permiso para esta operación.';
    if (e.status >= 500) return 'El servidor no pudo completar la operación. Vuelve a intentar.';
    if (typeof e.error?.detail === 'string') return e.error.detail;
    return e.status === 422 ? 'Revisa los datos de la compra y sus lotes.' : 'No se pudo completar la operación. Actualiza los datos.';
  }
}
