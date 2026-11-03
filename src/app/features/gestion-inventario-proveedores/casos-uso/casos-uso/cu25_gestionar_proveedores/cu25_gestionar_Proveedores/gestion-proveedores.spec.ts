import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { GestionProveedores } from './gestion-proveedores';
import { ProveedoresService } from './proveedores.service';

@Component({ selector: 'app-sidebar', template: '' })
class SidebarPrueba {
  @Input() mobileOpen = false;
  @Output() mobileClose = new EventEmitter<void>();
}
const proveedor = { id: 1, razon_social: 'Óptica Uno', nit: '123', telefono: '70000000',
  correo: null, direccion: null, contacto: null, estado: true };

describe('CU25: pantalla de proveedores en su nueva carpeta', () => {
  const menu = { estado: signal('listo'), modulos: signal<any[]>([]), cargar: vi.fn(), reintentar: vi.fn() };
  const api = { listar: vi.fn(), consultar: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), darBaja: vi.fn(), reactivar: vi.fn() };
  beforeEach(async () => {
    vi.clearAllMocks(); menu.estado.set('listo');
    menu.modulos.set([{ funciones: [{ nombre: 'Gestionar proveedores', accion_nombre: 'AMBAS' }] }]);
    api.listar.mockReturnValue(of({ items: [proveedor], total: 1, pagina: 1, tamanio: 20 }));
    api.consultar.mockReturnValue(of(proveedor));
    for (const key of ['crear', 'actualizar', 'reactivar'] as const) api[key].mockReturnValue(of({ mensaje: 'Guardado', proveedor }));
    api.darBaja.mockReturnValue(of(null));
    await TestBed.configureTestingModule({ imports: [GestionProveedores], providers: [
      { provide: MenuService, useValue: menu }, { provide: ProveedoresService, useValue: api },
    ] }).overrideComponent(GestionProveedores, { remove: { imports: [Sidebar] }, add: { imports: [SidebarPrueba] } }).compileComponents();
  });
  function iniciar() {
    const fixture = TestBed.createComponent(GestionProveedores); fixture.detectChanges();
    return fixture;
  }
  it('renderiza listado y detalle con los archivos reubicados', () => {
    const f = iniciar(); expect(f.nativeElement.textContent).toContain('Óptica Uno');
    f.componentInstance.ver(proveedor); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Detalle de Óptica Uno');
    expect(api.consultar).toHaveBeenCalledWith(1);
  });
  it('normaliza el alta y envía campos opcionales vacíos como null', () => {
    const c = iniciar().componentInstance; c.abrir(); c.form.controls.razon_social.setValue('  Nueva óptica  '); c.guardar();
    expect(api.crear).toHaveBeenCalledWith({ razon_social: 'Nueva óptica', nit: null, telefono: null, correo: null, direccion: null, contacto: null });
  });
  it('actualiza solo los campos que cambiaron', () => {
    const c = iniciar().componentInstance; c.abrir(proveedor); c.form.controls.telefono.setValue('71111111'); c.guardar();
    expect(api.actualizar).toHaveBeenCalledWith(1, { telefono: '71111111' });
  });
  it('requiere confirmación para la baja y conserva el flujo de reactivación', () => {
    const c = iniciar().componentInstance;
    c.solicitarEstado(proveedor); expect(api.darBaja).not.toHaveBeenCalled();
    c.confirmarEstado(); expect(api.darBaja).toHaveBeenCalledWith(1);
    c.solicitarEstado({ ...proveedor, estado: false }); c.confirmarEstado();
    expect(api.reactivar).toHaveBeenCalledWith(1);
  });
  it('bloquea el doble envío mientras guarda', () => {
    const pendiente = new Subject(); api.crear.mockReturnValue(pendiente);
    const c = iniciar().componentInstance; c.abrir(); c.form.controls.razon_social.setValue('Nueva');
    c.guardar(); c.guardar(); expect(api.crear).toHaveBeenCalledTimes(1);
    pendiente.complete();
  });
  it('no permite editar con permiso de solo lectura', () => {
    menu.modulos.set([{ funciones: [{ nombre: 'Gestionar proveedores', accion_nombre: 'LECTURA' }] }]);
    const c = iniciar().componentInstance; c.abrir(); c.guardar();
    expect(c.editor()).toBe(false); expect(api.crear).not.toHaveBeenCalled();
  });
});
