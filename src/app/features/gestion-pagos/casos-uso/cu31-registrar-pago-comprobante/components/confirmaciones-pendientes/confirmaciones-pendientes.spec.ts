import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  PagoAdministrativo,
  PermisosPagos,
} from '../../models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';
import { ConfirmacionesPendientes } from './confirmaciones-pendientes';

function pago(id: number, overrides: Partial<PagoAdministrativo> = {}): PagoAdministrativo {
  return {
    id,
    paciente_id: 7,
    consulta_clinica_id: 142,
    fecha_creacion: '2026-10-19T15:42:00Z',
    fecha_hora_pago: null,
    monto: '380.00',
    moneda: 'BOB',
    metodo_pago: 'TRANSFERENCIA',
    estado: 'PENDIENTE',
    referencia_bancaria: 'TRX-9911',
    observaciones: null,
    servicio_realizado_ids: [11, 12],
    notificacion: null,
    ...overrides,
  };
}

interface VistaConfirmaciones {
  visibles(): PagoAdministrativo[];
  omitidos(): number;
  seleccionado(): PagoAdministrativo | null;
  actualizarPago(actualizado: PagoAdministrativo): void;
  actualizarListado(): void;
}

const PERMISOS: PermisosPagos = { ver: true, registrar: true, confirmar: true };

describe('CU31 — confirmaciones pendientes', () => {
  let fixture: ComponentFixture<ConfirmacionesPendientes>;
  let vista: VistaConfirmaciones;
  let api: { listarPagos: ReturnType<typeof vi.fn> };

  async function configurar(
    permisos: PermisosPagos = PERMISOS,
    items: PagoAdministrativo[] = [
      pago(1024),
      pago(1022, { metodo_pago: 'QR', monto: '180.00' }),
      pago(1019, { metodo_pago: 'TARJETA' }),
    ],
  ): Promise<void> {
    api = {
      listarPagos: vi.fn(() =>
        of({ items, total: items.length, page: 1, page_size: 20, total_pages: 1 }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [ConfirmacionesPendientes],
      providers: [{ provide: PagosAdministrativosService, useValue: api }],
    });
    TestBed.overrideComponent(ConfirmacionesPendientes, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(ConfirmacionesPendientes);
    fixture.componentRef.setInput('pacientes', []);
    fixture.componentRef.setInput('permisos', permisos);
    vista = fixture.componentInstance as unknown as VistaConfirmaciones;
    fixture.detectChanges();
  }

  it('consulta únicamente los pagos en estado PENDIENTE', async () => {
    await configurar();

    expect(api.listarPagos).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'PENDIENTE', page: 1 }),
    );
  });

  it('muestra sólo transferencias y QR, sin ocultar el resto silenciosamente', async () => {
    await configurar();

    expect(vista.visibles().map((item) => item.id)).toEqual([1024, 1022]);
    expect(vista.omitidos()).toBe(1);
    expect(vista.seleccionado()?.id).toBe(1024);
  });

  it('actualiza el registro cuando el backend confirma el pago', async () => {
    await configurar();
    const aprobado = pago(1024, { estado: 'APROBADO' });

    vista.actualizarPago(aprobado);

    expect(vista.seleccionado()?.estado).toBe('APROBADO');
  });

  it('un usuario sin permiso de lectura no ejecuta consultas', async () => {
    await configurar({ ver: false, registrar: false, confirmar: true });

    expect(api.listarPagos).not.toHaveBeenCalled();
  });
});
