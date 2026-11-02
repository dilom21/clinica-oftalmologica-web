import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoService } from '../../../cu26-gestionar-productos-categorias-lotes/services/catalogo.service';
import { LoteRespuesta, ProductoRespuesta } from '../../../cu26-gestionar-productos-categorias-lotes/models/catalogo.models';
import { HttpErrorResponse } from '@angular/common/http';
import { MovimientosService } from '../../services/movimientos.service';
import { ExistenciaRespuesta, MovimientoManualCrear, MovimientoRespuesta, TipoManual } from '../../models/movimientos.models';

const LIMITE_HISTORIAL = 25;
const TIPOS_MANUALES: readonly { value: TipoManual; label: string }[] = [
  { value: 'STOCK_INICIAL', label: 'Stock inicial' },
  { value: 'SALIDA_USO', label: 'Salida por uso' },
  { value: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada' },
  { value: 'AJUSTE_SALIDA', label: 'Ajuste de salida' },
  { value: 'SALIDA_VENCIMIENTO', label: 'Salida por vencimiento' },
];

@Component({
  selector: 'app-gestionar-movimientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestionar-movimientos.html',
  styleUrl: './gestionar-movimientos.css',
})
export class GestionarMovimientos {
  private readonly catalogo = inject(CatalogoService);
  private readonly movimientos = inject(MovimientosService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService, { optional: true });
  private tenantKey: number | null = null;

  readonly tiposManuales = TIPOS_MANUALES;
  readonly productos = signal<ProductoRespuesta[]>([]);
  readonly lotes = signal<LoteRespuesta[]>([]);
  readonly existencia = signal<ExistenciaRespuesta | null>(null);
  readonly historial = signal<MovimientoRespuesta[]>([]);
  readonly cargandoCatalogo = signal(true);
  readonly cargandoExistencia = signal(false);
  readonly cargandoHistorial = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly skip = signal(0);
  readonly limite = LIMITE_HISTORIAL;

  readonly form = this.fb.group({
    producto_id: [null as number | null, Validators.required],
    lote_id: [null as number | null, Validators.required],
    tipo: ['' as TipoManual | '', Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^\d+$/)]],
    observaciones: ['', Validators.maxLength(1000)],
  });

  private readonly tenantWatcher = this.auth ? effect(() => {
    const tenant = this.auth?.empresa();
    const key = tenant?.tenantId ?? null;
    if (key === this.tenantKey) return;
    this.tenantKey = key;
    this.limpiarEstadoEmpresa();
    this.cargarCatalogo();
  }) : undefined;

  constructor() {
    if (!this.auth) this.cargarCatalogo();
    this.form.controls.tipo.valueChanges.subscribe((tipo) => {
      const requiereMotivo = tipo === 'AJUSTE_ENTRADA' || tipo === 'AJUSTE_SALIDA' || tipo === 'SALIDA_VENCIMIENTO';
      const control = this.form.controls.observaciones;
      if (requiereMotivo) control.addValidators(Validators.required);
      else control.removeValidators(Validators.required);
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  lotesDelProducto(): LoteRespuesta[] {
    const productoId = this.form.controls.producto_id.value;
    return productoId === null ? [] : this.lotes().filter((lote) => lote.producto_id === productoId && lote.estado);
  }

  seleccionarProducto(): void {
    this.form.controls.lote_id.setValue(null);
    this.existencia.set(null);
    this.historial.set([]);
    this.error.set(null);
  }

  seleccionarLote(): void {
    const loteId = this.form.controls.lote_id.value;
    this.existencia.set(null);
    this.historial.set([]);
    this.skip.set(0);
    if (loteId === null) return;
    this.consultarExistencia();
    this.cargarHistorial();
  }

  consultarExistencia(): void {
    const loteId = this.form.controls.lote_id.value;
    if (loteId === null) return;
    this.cargandoExistencia.set(true);
    this.movimientos.consultarExistencia(loteId).subscribe({
      next: (respuesta) => { this.existencia.set(respuesta); this.cargandoExistencia.set(false); },
      error: (e: unknown) => { this.error.set(this.mensajeError(e)); this.cargandoExistencia.set(false); },
    });
  }

  cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.error.set(null);
    const loteId = this.form.controls.lote_id.value ?? undefined;
    this.movimientos.listarMovimientos({ loteId, skip: this.skip(), limit: this.limite }).subscribe({
      next: (respuesta) => { this.historial.set(respuesta); this.cargandoHistorial.set(false); },
      error: (e: unknown) => { this.error.set(this.mensajeError(e)); this.cargandoHistorial.set(false); },
    });
  }

  cambiarPagina(delta: -1 | 1): void {
    const siguiente = this.skip() + delta * this.limite;
    if (siguiente < 0 || (delta > 0 && this.historial().length < this.limite)) return;
    this.skip.set(siguiente);
    this.cargarHistorial();
  }

  guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { lote_id, tipo, cantidad, observaciones } = this.form.getRawValue();
    if (lote_id === null || !tipo || cantidad === null || !Number.isInteger(cantidad) || cantidad < 1) return;
    if (!confirm('¿Confirmas registrar este movimiento?')) return;
    const datos: MovimientoManualCrear = { lote_id, tipo, cantidad };
    const motivo = observaciones?.trim();
    if (motivo) datos.observaciones = motivo;
    this.guardando.set(true);
    this.error.set(null);
    this.movimientos.registrarMovimiento(datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set('Movimiento registrado correctamente.');
        this.consultarExistencia();
        this.skip.set(0);
        this.cargarHistorial();
        this.form.controls.cantidad.reset(null);
        this.form.controls.observaciones.reset('');
      },
      error: (e: unknown) => { this.guardando.set(false); this.error.set(this.mensajeError(e)); },
    });
  }

  cargarCatalogo(): void {
    this.cargandoCatalogo.set(true);
    this.error.set(null);
    this.catalogo.listarProductos(undefined, false).subscribe({
      next: (productos) => {
        this.productos.set(productos.filter((producto) => producto.estado));
        this.catalogo.listarLotes(undefined, false).subscribe({
          next: (lotes) => { this.lotes.set(lotes.filter((lote) => lote.estado)); this.cargandoCatalogo.set(false); },
          error: (e: unknown) => { this.error.set(this.mensajeError(e)); this.cargandoCatalogo.set(false); },
        });
      },
      error: (e: unknown) => { this.error.set(this.mensajeError(e)); this.cargandoCatalogo.set(false); },
    });
  }

  limpiarEstadoEmpresa(): void {
    this.productos.set([]); this.lotes.set([]); this.existencia.set(null); this.historial.set([]);
    this.form.reset({ producto_id: null, lote_id: null, tipo: '', cantidad: null, observaciones: '' });
    this.skip.set(0); this.error.set(null); this.exito.set(null);
  }

  mensajeError(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : (error as { status?: number })?.status;
    return ({
      401: 'Tu sesión no es válida. Inicia sesión nuevamente.',
      403: 'No tienes permiso para gestionar movimientos.',
      404: 'El lote solicitado no existe o ya no está disponible.',
      409: 'No se puede registrar: el stock, las reservas o el estado del lote generan un conflicto.',
      422: 'Revisa la cantidad y el motivo; los datos no cumplen las reglas del movimiento.',
    } as Record<number, string>)[status ?? 0] ?? 'No se pudo completar la operación. Intenta nuevamente.';
  }

  etiquetaTipo(tipo: string): string { return TIPOS_MANUALES.find((item) => item.value === tipo)?.label ?? tipo.replaceAll('_', ' '); }
  etiquetaFecha(fecha: string): string { return new Date(fecha).toLocaleString(); }
}
