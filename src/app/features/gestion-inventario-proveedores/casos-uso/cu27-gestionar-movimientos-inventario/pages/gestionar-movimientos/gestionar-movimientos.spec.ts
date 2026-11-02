import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CatalogoService } from '../../../cu26-gestionar-productos-categorias-lotes/services/catalogo.service';
import { MovimientosService } from '../../services/movimientos.service';
import { GestionarMovimientos } from './gestionar-movimientos';

describe('GestionarMovimientos', () => {
  let fixture: ComponentFixture<GestionarMovimientos>;
  let component: GestionarMovimientos;
  let catalogo: any;
  let movimientos: any;

  beforeEach(() => {
    catalogo = {
      listarProductos: vi.fn(() => of([{ id: 1, categoria_id: 1, codigo: 'P-1', nombre: 'Producto', estado: true }])),
      listarLotes: vi.fn(() => of([{ id: 2, producto_id: 1, numero_lote: 'L-1', estado: true }])),
    };
    movimientos = {
      consultarExistencia: vi.fn(() => of({ lote_id: 2, inventario_id: null, stock_actual: 0, stock_reservado: 0, stock_disponible: 0 })),
      listarMovimientos: vi.fn(() => of([])),
      registrarMovimiento: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      imports: [GestionarMovimientos],
      providers: [
        { provide: CatalogoService, useValue: catalogo },
        { provide: MovimientosService, useValue: movimientos },
        { provide: 'AuthService', useValue: { empresa: signal(null) } },
      ],
    });
    // AuthService es opcional para mantener la prueba aislada del contexto de sesión.
    fixture = TestBed.createComponent(GestionarMovimientos);
    component = fixture.componentInstance;
  });

  it('offers only the five manual registration types', () => {
    expect(component.tiposManuales.map((tipo) => tipo.value)).toEqual([
      'STOCK_INICIAL', 'SALIDA_USO', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'SALIDA_VENCIMIENTO',
    ]);
  });

  it('requires a reason for adjustment and expiry output', () => {
    component.form.controls.tipo.setValue('AJUSTE_SALIDA');
    component.form.controls.observaciones.markAsTouched();
    expect(component.form.controls.observaciones.hasError('required')).toBe(true);
    component.form.controls.observaciones.setValue('Motivo');
    expect(component.form.controls.observaciones.valid).toBe(true);
  });

  it('sends only the permitted fields and reloads server values after saving', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.form.setValue({ producto_id: 1, lote_id: 2, tipo: 'STOCK_INICIAL', cantidad: 4, observaciones: '' });
    component.guardar();
    expect(movimientos.registrarMovimiento).toHaveBeenCalledWith({ lote_id: 2, tipo: 'STOCK_INICIAL', cantidad: 4 });
    expect(movimientos.consultarExistencia).toHaveBeenCalled();
    expect(movimientos.listarMovimientos).toHaveBeenCalled();
  });

  it('surfaces a conflict without calculating stock locally', () => {
    movimientos.registrarMovimiento.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.form.setValue({ producto_id: 1, lote_id: 2, tipo: 'SALIDA_USO', cantidad: 1, observaciones: '' });
    component.guardar();
    expect(component.error()).toContain('conflicto');
    expect(component.existencia()).toBeNull();
  });
});
