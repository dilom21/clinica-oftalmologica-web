import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GestionCatalogo } from './gestion-catalogo';
import { CatalogoService } from '../../services/catalogo.service';
import { vi } from 'vitest';

describe('GestionCatalogo', () => {
  let fixture: ComponentFixture<GestionCatalogo>;
  let component: GestionCatalogo;
  let api: any;

  beforeEach(() => {
    api = { listarCategorias: vi.fn(), listarProductos: vi.fn(), listarLotes: vi.fn(), crearCategoria: vi.fn(), crearProducto: vi.fn(), crearLote: vi.fn(), actualizarLote: vi.fn() };
    api.listarCategorias.mockReturnValue(of([]));
    api.listarProductos.mockReturnValue(of([]));
    api.listarLotes.mockReturnValue(of([]));
    TestBed.configureTestingModule({ imports: [GestionCatalogo], providers: [{ provide: CatalogoService, useValue: api }] });
    fixture = TestBed.createComponent(GestionCatalogo);
    component = fixture.componentInstance;
  });

  it('limits category names to 100 characters', () => {
    component.form.controls.nombre.setValue('x'.repeat(101));
    expect(component.form.controls.nombre.hasError('maxlength')).toBeTruthy();
    component.form.controls.nombre.setValue('x'.repeat(100));
    expect(component.form.controls.nombre.hasError('maxlength')).toBeFalsy();
  });

  it('requires category and product relationships and rejects decimal stock', () => {
    expect(component.form.controls.categoria_id.hasError('required')).toBeTruthy();
    expect(component.form.controls.producto_id.hasError('required')).toBeTruthy();
    component.form.controls.stock_minimo.setValue(1.5);
    expect(component.form.controls.stock_minimo.hasError('pattern')).toBeTruthy();
  });

  it('loads active products when entering lots without repeating a cached request', () => {
    component.cambiarTab('lotes');
    expect(api.listarProductos).toHaveBeenCalledOnce();
    expect(api.listarProductos).toHaveBeenCalledWith(undefined, false);
    expect(api.listarLotes).toHaveBeenCalledOnce();
    expect(api.listarLotes).toHaveBeenCalledWith(undefined, false);
    component.cambiarTab('lotes');
    expect(api.listarProductos).toHaveBeenCalledOnce();
  });

  it('edits a lot without requiring or sending producto_id', () => {
    component.cambiarTab('lotes');
    const lote = { id: 7, producto_id: 3, numero_lote: 'LOT-7', estado: true, fecha_creacion: '2026-01-01' };
    component.abrirEditar(lote);
    component.form.controls.producto_id.setValue(null);
    expect(component.form.controls.producto_id.valid).toBeTruthy();

    api.actualizarLote.mockReturnValue(of({}));
    component.guardar();

    expect(api.actualizarLote).toHaveBeenCalledWith(7, expect.not.objectContaining({ producto_id: expect.anything() }));
  });
});
