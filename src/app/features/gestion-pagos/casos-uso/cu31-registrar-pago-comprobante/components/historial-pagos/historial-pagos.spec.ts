import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  PagoAdministrativo,
  PermisosPagos,
} from '../../models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';
import { HistorialPagos } from './historial-pagos';

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

interface VistaHistorial {
  form: FormGroup;
  cargar(): void;
  aplicarFiltros(): void;
  irAPagina(delta: number): void;
  pagina(): number;
  total(): number;
  error(): string | null;
  items(): PagoAdministrativo[];
  seleccionado(): PagoAdministrativo | null;
  actualizarPago(actualizado: PagoAdministrativo): void;
}

const PERMISOS: PermisosPagos = { ver: true, registrar: true, confirmar: true };

describe('CU31 — historial de pagos', () => {
  let fixture: ComponentFixture<HistorialPagos>;
  let vista: VistaHistorial;
  let api: { listarPagos: ReturnType<typeof vi.fn> };

  async function configurar(permisos: PermisosPagos = PERMISOS): Promise<void> {
    api = {
      listarPagos: vi.fn(() =>
        of({
          items: [pago(1024), pago(1023, { estado: 'APROBADO' })],
          total: 12,
          page: 1,
          page_size: 20,
          total_pages: 1,
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [HistorialPagos],
      providers: [{ provide: PagosAdministrativosService, useValue: api }],
    });
    TestBed.overrideComponent(HistorialPagos, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(HistorialPagos);
    fixture.componentRef.setInput('pacientes', []);
    fixture.componentRef.setInput('permisos', permisos);
    vista = fixture.componentInstance as unknown as VistaHistorial;
    fixture.detectChanges();
  }

  it('consulta la primera página sin filtros inventados', async () => {
    await configurar();

    expect(api.listarPagos).toHaveBeenCalledWith({
      paciente_id: null,
      estado: null,
      metodo_pago: null,
      desde: null,
      hasta: null,
      page: 1,
      page_size: 20,
    });
    expect(vista.items().length).toBe(2);
    expect(vista.total()).toBe(12);
    expect(vista.seleccionado()?.id).toBe(1024);
  });

  it('envía estado, método y rango de fechas con desfase de Bolivia', async () => {
    await configurar();
    vista.form.patchValue({
      estado: 'APROBADO',
      metodo_pago: 'EFECTIVO',
      desde: '2026-10-01',
      hasta: '2026-10-19',
      page_size: 50,
    });

    vista.aplicarFiltros();

    const ultima = api.listarPagos.mock.calls.at(-1)?.[0];
    expect(ultima).toMatchObject({
      estado: 'APROBADO',
      metodo_pago: 'EFECTIVO',
      desde: '2026-10-01T04:00:00.000Z',
      hasta: '2026-10-20T03:59:59.999Z',
      page: 1,
      page_size: 50,
    });
  });

  it('rechaza un rango de fechas invertido sin llamar al backend', async () => {
    await configurar();
    api.listarPagos.mockClear();
    vista.form.patchValue({ desde: '2026-10-19', hasta: '2026-10-01' });

    vista.aplicarFiltros();

    expect(api.listarPagos).not.toHaveBeenCalled();
    expect(vista.error()).toContain('posterior');
  });

  it('pagina contra el servidor y respeta los límites', async () => {
    await configurar();
    api.listarPagos.mockReturnValue(
      of({ items: [], total: 45, page: 1, page_size: 20, total_pages: 3 }),
    );
    vista.aplicarFiltros();

    vista.irAPagina(1);
    expect(vista.pagina()).toBe(2);
    expect(api.listarPagos.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 });

    vista.irAPagina(-2);
    expect(vista.pagina()).toBe(2);
  });

  it('refleja el pago confirmado devuelto por el servidor', async () => {
    await configurar();
    const aprobado = pago(1024, { estado: 'APROBADO', fecha_hora_pago: '2026-10-19T16:00:00Z' });

    vista.actualizarPago(aprobado);

    expect(vista.seleccionado()?.estado).toBe('APROBADO');
    expect(vista.items().find((item) => item.id === 1024)?.estado).toBe('APROBADO');
  });

  it('un usuario sin permiso de lectura no ejecuta consultas', async () => {
    await configurar({ ver: false, registrar: false, confirmar: false });

    expect(api.listarPagos).not.toHaveBeenCalled();
  });
});
