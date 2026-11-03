import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Sidebar } from '../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../core/services/menu.service';
import { RegistrarCompras } from './registrar-compras';
import { ComprasService } from './compras.service';
import { Compra, CompraCrear, CompraOperacion, LoteCompra, Pagina } from './compras.models';

@Component({ selector: 'app-sidebar', template: '' })
class SidebarPrueba {
  @Input() mobileOpen = false;
  @Output() mobileClose = new EventEmitter<void>();
}
const proveedor = { id: 1, razon_social: 'Proveedor de prueba', nit: '123', estado: true };
const producto = { id: 2, codigo: 'P2', nombre: 'Gotas', unidad_medida: 'UNIDAD' };
const lote: LoteCompra = { id: 3, producto_id: 2, numero_lote: 'L-01', fecha_fabricacion: null, fecha_vencimiento: null };
const compra: Compra = {
  id: 12, empresa_id: 1, proveedor_id: 1, proveedor_razon_social: proveedor.razon_social,
  usuario_id: 7, numero_documento: null, fecha_compra: '2026-11-02T04:00:00Z',
  fecha_recepcion: '2026-11-02T04:00:00Z', moneda: 'BOB', estado: 'RECIBIDA',
  observaciones: null, total: '0.30', detalles: [{
    id: 1, producto_id: 2, producto_nombre: 'Gotas', lote_id: 3, numero_lote: 'L-01',
    fecha_fabricacion: null, fecha_vencimiento: null, cantidad: 3, costo_unitario: '0.10',
    subtotal: '0.30', observaciones: null,
  }],
};
const pagina = <T>(items: T[]): Pagina<T> => ({ items, total: items.length, pagina: 1, tamanio: 20 });

describe('CU26: registro de compras', () => {
  let fixture: ComponentFixture<RegistrarCompras>;
  let c: RegistrarCompras;
  const menu = { estado: signal('listo'), modulos: signal<any[]>([]), cargar: vi.fn(), reintentar: vi.fn() };
  const api = {
    proveedores: vi.fn(), productos: vi.fn(), lotes: vi.fn(), listar: vi.fn(), consultar: vi.fn(),
    crear: vi.fn<(datos: CompraCrear) => Observable<CompraOperacion>>(),
  };
  beforeEach(async () => {
    vi.clearAllMocks(); menu.estado.set('listo');
    menu.modulos.set([{ id: 1, nombre: 'Inventario', funciones: [{ id: 1, nombre: 'Registrar compras a proveedor', accion_id: 1, accion_nombre: 'AMBAS' }] }]);
    api.proveedores.mockReturnValue(of(pagina([proveedor])));
    api.productos.mockReturnValue(of(pagina([producto])));
    api.lotes.mockReturnValue(of(pagina([lote])));
    api.listar.mockReturnValue(of(pagina([compra])));
    api.consultar.mockReturnValue(of(compra));
    api.crear.mockReturnValue(of({ mensaje: 'Compra registrada correctamente', compra }));
    await TestBed.configureTestingModule({ imports: [RegistrarCompras], providers: [
      { provide: ComprasService, useValue: api }, { provide: MenuService, useValue: menu },
    ] }).overrideComponent(RegistrarCompras, { remove: { imports: [Sidebar] }, add: { imports: [SidebarPrueba] } }).compileComponents();
    fixture = TestBed.createComponent(RegistrarCompras); c = fixture.componentInstance; fixture.detectChanges();
  });

  function preparar() {
    c.cabecera.controls.proveedor_id.setValue('1'); c.seleccionarProveedor();
    c.linea.controls.producto_id.setValue('2'); c.seleccionarProducto();
    c.linea.controls.lote_id.setValue('3'); c.seleccionarLote();
    c.linea.patchValue({ cantidad: '3', costo_unitario: '0.10' }); c.agregarLinea();
  }

  it('muestra el diseño y permite seleccionar proveedores y productos', () => {
    expect(fixture.nativeElement.textContent).toContain('Compras a proveedores');
    expect(api.proveedores).toHaveBeenCalledWith(1, '');
    expect(api.productos).toHaveBeenCalledWith(1, '');
    expect(fixture.nativeElement.querySelector('#proveedor')).toBeTruthy();
  });

  it('revisa antes de enviar, calcula el total y muestra la confirmación del servidor', () => {
    preparar(); expect(c.totalCentavos()).toBe(30n);
    c.revisarCompra(); expect(api.crear).not.toHaveBeenCalled();
    expect(c.confirmando()).toBe(true);
    c.confirmarCompra(); fixture.detectChanges();
    expect(api.crear).toHaveBeenCalledWith({
      proveedor_id: 1, moneda: 'BOB',
      detalles: [{ producto_id: 2, lote_id: 3, cantidad: 3, costo_unitario: '0.10' }],
    });
    expect(c.registrado()?.id).toBe(12); expect(c.lineas()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Compra registrada correctamente');
  });

  it('impide el doble envío mientras se registra', () => {
    const pendiente = new Subject<CompraOperacion>(); api.crear.mockReturnValue(pendiente);
    preparar(); c.revisarCompra(); c.confirmarCompra(); c.confirmarCompra();
    expect(api.crear).toHaveBeenCalledTimes(1); expect(c.guardando()).toBe(true);
    c.quitarLinea(c.lineas()[0].clave); expect(c.lineas()).toHaveLength(1);
    pendiente.next({ mensaje: 'Registrada', compra }); pendiente.complete();
    expect(c.guardando()).toBe(false);
  });

  it('no registra una compra vacía ni sin proveedor', () => {
    c.revisarCompra(); c.confirmarCompra();
    expect(c.error()).toContain('proveedor'); expect(api.crear).not.toHaveBeenCalled();
  });

  it.each([['0', '1'], ['1.5', '1'], ['1', '-1'], ['1', '1.001'], ['1', 'NaN']])('rechaza cantidad %s y precio %s', (cantidad, costo) => {
    preparar(); c.lineas.set([]);
    c.linea.patchValue({ cantidad, costo_unitario: costo }); c.agregarLinea();
    expect(c.lineas()).toEqual([]); expect(c.errorLinea()).not.toBe('');
  });

  it('detecta el mismo lote referenciado por id y número', () => {
    preparar(); c.linea.patchValue({ modo: 'nuevo', numero_lote: ' L-01 ', costo_unitario: '1' });
    c.agregarLinea(); expect(c.lineas()).toHaveLength(1); expect(c.errorLinea()).toContain('ya está');
  });

  it('envía las fechas de un lote nuevo y acepta precio cero', () => {
    preparar(); c.lineas.set([]);
    c.linea.patchValue({ modo: 'nuevo', numero_lote: ' NUEVO ', cantidad: '1', costo_unitario: '0',
      fecha_fabricacion: c.hoy, fecha_vencimiento: '2099-01-01' });
    c.agregarLinea(); c.revisarCompra(); c.confirmarCompra();
    const datos = api.crear.mock.calls[0][0].detalles[0];
    expect(datos.lote_id).toBeUndefined(); expect(datos.numero_lote).toBe('NUEVO');
    expect(datos.fecha_fabricacion).toBe(c.hoy); expect(datos.costo_unitario).toBe('0');
  });

  it('rechaza un lote nuevo vencido y conserva la compra ante conflictos', () => {
    preparar(); c.linea.patchValue({ modo: 'nuevo', numero_lote: 'VENCIDO', costo_unitario: '1', fecha_vencimiento: '2000-01-01' });
    c.agregarLinea(); expect(c.lineas()).toHaveLength(1); expect(c.errorLinea()).toContain('fechas');
    api.crear.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Documento duplicado' } })));
    c.revisarCompra(); c.confirmarCompra(); expect(c.error()).toBe('Documento duplicado'); expect(c.lineas()).toHaveLength(1);
  });

  it('conserva el borrador ante un fallo de conexión y no reintenta el POST', () => {
    preparar(); api.crear.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    c.revisarCompra(); c.confirmarCompra();
    expect(c.lineas()).toHaveLength(1); expect(c.error()).toContain('historial');
    expect(api.crear).toHaveBeenCalledTimes(1);
  });

  it('conserva el proveedor seleccionado al buscar otra página', () => {
    preparar(); api.proveedores.mockReturnValue(of(pagina([])));
    c.cargarProveedores(2); expect(c.proveedor()?.id).toBe(1);
    expect(c.proveedorFueraDePagina()?.id).toBe(1);
  });

  it('descarta respuestas de lotes de un producto que ya no está seleccionado', () => {
    const pendiente = new Subject<Pagina<LoteCompra>>(); api.lotes.mockReturnValue(pendiente);
    c.linea.controls.producto_id.setValue('2'); c.seleccionarProducto();
    c.linea.controls.producto_id.setValue(''); c.seleccionarProducto();
    pendiente.next(pagina([lote]));
    expect(c.lotes()).toEqual([]); expect(c.lote()).toBeNull();
  });

  it('consulta historial y detalle sin mezclar el borrador', () => {
    preparar(); c.cambiarVista('historial'); c.verCompra(12); fixture.detectChanges();
    expect(c.historial()).toHaveLength(1); expect(c.detalle()?.id).toBe(12);
    expect(c.lineas()).toHaveLength(1); expect(fixture.nativeElement.textContent).toContain('Compra #12');
  });

  it('respeta lectura y limpia el borrador al cambiar permisos', () => {
    preparar();
    menu.modulos.set([{ id: 1, nombre: 'Inventario', funciones: [{ nombre: 'Registrar compras a proveedor', accion_nombre: 'LECTURA' }] }]);
    fixture.detectChanges();
    expect(c.vista()).toBe('historial'); expect(c.puedeEscribir()).toBe(false); expect(c.lineas()).toEqual([]);
    c.revisarCompra(); c.confirmarCompra(); expect(api.crear).not.toHaveBeenCalled();
  });

  it('permite reintentar la carga del catálogo después de un error', () => {
    api.productos.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    c.cargarProductos(); expect(c.errorProductos()).not.toBe('');
    c.cargarProductos(); expect(c.productos()).toHaveLength(1); expect(c.errorProductos()).toBe('');
  });
});
