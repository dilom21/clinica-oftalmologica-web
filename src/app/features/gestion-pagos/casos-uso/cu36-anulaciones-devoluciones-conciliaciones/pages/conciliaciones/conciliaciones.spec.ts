import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { ajustePago } from '../../testing/ajustes-pagos.fixture';
import { AjustesPagosService } from '../../services/ajustes-pagos.service';
import { ReembolsoHuerfano } from '../../models/ajustes-pagos.models';
import { Conciliaciones } from './conciliaciones';

const HUERFANO: ReembolsoHuerfano = {
  id: 7, stripe_event_id: 'evt_123', event_type: 'refund.updated', refund_id: 're_123',
  payment_intent_id: null, amount: 1010, currency: 'BOB', status: 'pending', estado: 'PENDIENTE',
  ajuste_id: null, motivo: null, creado_en: '2026-11-18T12:00:00Z',
};
const ESCRITURA: MenuModulo = { id: 8, nombre: 'Pagos', funciones: [
  { id: 31, nombre: 'Gestionar pagos', accion_id: 2, accion_nombre: 'ESCRITURA' },
] };

describe('CU36 — bandeja de reembolsos huérfanos', () => {
  let fixture: ComponentFixture<Conciliaciones>;
  let listar: ReturnType<typeof vi.fn>;
  let atribuir: ReturnType<typeof vi.fn>;

  async function crear(
    modulos: MenuModulo[],
    falla = false,
    tenantCode: string | null = 'empresa-pruebas',
  ): Promise<void> {
    const estado = signal<'listo' | 'error'>('listo');
    listar = vi.fn(() => falla ? throwError(() => new Error('fallo')) : of([HUERFANO]));
    atribuir = vi.fn(() => of(ajustePago({ id: 88, estado: 'CONFIRMADO' })));
    TestBed.configureTestingModule({
      imports: [Conciliaciones],
      providers: [
        { provide: MenuService, useValue: { estado: estado.asReadonly(), modulos: signal(modulos).asReadonly(), cargar: vi.fn(), reintentar: vi.fn() } },
        { provide: AuthService, useValue: { tenantCode: () => tenantCode } },
        { provide: AjustesPagosService, useValue: { listarReembolsosHuerfanos: listar, atribuirReembolsoHuerfano: atribuir } },
      ],
    });
    TestBed.overrideComponent(Conciliaciones, { set: { imports: [], template: '' } });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(Conciliaciones);
    fixture.detectChanges();
  }

  it('autoriza únicamente con Gestionar pagos de escritura y carga la bandeja', async () => {
    await crear([ESCRITURA]);
    const vista = fixture.componentInstance as any;
    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(listar).toHaveBeenCalledTimes(1);
    expect(vista.huerfanos()).toEqual([HUERFANO]);
  });

  it('deniega con solo lectura y no llama al endpoint', async () => {
    await crear([{ ...ESCRITURA, funciones: [{ ...ESCRITURA.funciones[0], accion_nombre: 'LECTURA' }] }]);
    expect((fixture.componentInstance as any).estadoPermiso()).toBe('denegado');
    expect(listar).not.toHaveBeenCalled();
  });

  it('deniega y no consulta la bandeja sin contexto tenant aunque el menú permita escritura', async () => {
    await crear([ESCRITURA], false, null);

    expect((fixture.componentInstance as any).estadoPermiso()).toBe('denegado');
    expect(listar).not.toHaveBeenCalled();
  });

  it('recarga desde servidor después de atribuir y comunica el estado devuelto', async () => {
    await crear([ESCRITURA]);
    const vista = fixture.componentInstance as any;
    vista.abrirAtribucion(HUERFANO);
    vista.atribuir({ motivo: 'Motivo suficientemente largo', naturaleza: 'SOBREPAGO', evidencia: 'Prueba', servicios: [{ servicio_realizado_id: 1, monto: '-10.10' }] });
    expect(atribuir).toHaveBeenCalledWith(7, expect.any(Object));
    expect(listar).toHaveBeenCalledTimes(2);
    expect(vista.resultado()).toContain('quedó confirmado');
  });

  it('no presenta estados no confirmados como éxito', async () => {
    await crear([ESCRITURA]);
    atribuir.mockReturnValue(of(ajustePago({ id: 89, estado: 'PENDIENTE_PROVEEDOR' })));
    const vista = fixture.componentInstance as any;
    vista.abrirAtribucion(HUERFANO);
    vista.atribuir({ motivo: 'Motivo suficientemente largo', naturaleza: 'SOBREPAGO', evidencia: 'Prueba', servicios: [{ servicio_realizado_id: 1, monto: '-10.10' }] });
    expect(vista.resultado()).toContain('todavía no es un resultado exitoso');
  });

  it('la recarga tras atribuir reemplaza una consulta anterior aunque esta responda al final', async () => {
    const anterior = new Subject<ReembolsoHuerfano[]>();
    const nueva = new Subject<ReembolsoHuerfano[]>();
    await crear([ESCRITURA]);
    listar.mockReset();
    listar.mockReturnValueOnce(anterior.asObservable()).mockReturnValueOnce(nueva.asObservable());
    const vista = fixture.componentInstance as any;

    vista.reintentar();
    vista.abrirAtribucion(HUERFANO);
    vista.atribuir({
      motivo: 'Motivo suficientemente largo',
      naturaleza: 'SOBREPAGO',
      evidencia: 'Prueba',
      servicios: [{ servicio_realizado_id: 1, monto: '-10.10' }],
    });
    nueva.next([]);
    nueva.complete();
    anterior.next([HUERFANO]);
    anterior.complete();

    expect(vista.huerfanos()).toEqual([]);
    expect(vista.cargando()).toBe(false);
    expect(vista.error()).toBeNull();
  });
});
