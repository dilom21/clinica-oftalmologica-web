import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  PagoAdministrativo,
  PermisosPagos,
} from '../../models/pagos-administrativos.models';
import { ComprobantePagoService } from '../../services/comprobante-pago.service';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';
import { DetallePago } from './detalle-pago';

function pago(overrides: Partial<PagoAdministrativo> = {}): PagoAdministrativo {
  return {
    id: 1024,
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

interface VistaDetalle {
  puedeConfirmar(): boolean;
  abrirConfirmacion(): void;
  dialogoAbierto(): boolean;
  confirmarPago(): void;
  procesando(): boolean;
  errorConfirmacion(): string | null;
  exito(): string | null;
  descargarComprobante(): void;
  descargando(): boolean;
}

const PERMISOS: PermisosPagos = { ver: true, registrar: true, confirmar: true };

describe('CU31 — detalle, confirmación y comprobante', () => {
  let fixture: ComponentFixture<DetallePago>;
  let vista: VistaDetalle;
  let api: { confirmarPago: ReturnType<typeof vi.fn> };
  let comprobantes: { descargar: ReturnType<typeof vi.fn> };

  async function configurar(
    datos: PagoAdministrativo,
    permisos: PermisosPagos = PERMISOS,
  ): Promise<void> {
    TestBed.resetTestingModule();
    api = { confirmarPago: vi.fn(() => of(pago({ estado: 'APROBADO' }))) };
    comprobantes = { descargar: vi.fn(() => of(undefined)) };

    TestBed.configureTestingModule({
      imports: [DetallePago],
      providers: [
        { provide: PagosAdministrativosService, useValue: api },
        { provide: ComprobantePagoService, useValue: comprobantes },
      ],
    });
    TestBed.overrideComponent(DetallePago, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(DetallePago);
    fixture.componentRef.setInput('pago', datos);
    fixture.componentRef.setInput('nombrePaciente', 'Ana Quispe');
    fixture.componentRef.setInput('permisos', permisos);
    vista = fixture.componentInstance as unknown as VistaDetalle;
    fixture.detectChanges();
  }

  it('sólo permite confirmar transferencias o QR pendientes y con la función de confirmación', async () => {
    await configurar(pago());
    expect(vista.puedeConfirmar()).toBe(true);

    await configurar(pago({ metodo_pago: 'EFECTIVO' }));
    expect(vista.puedeConfirmar()).toBe(false);

    await configurar(pago(), { ver: true, registrar: true, confirmar: false });
    expect(vista.puedeConfirmar()).toBe(false);
  });

  it('confirma contra el backend y propaga el pago actualizado', async () => {
    await configurar(pago());
    const actualizaciones: PagoAdministrativo[] = [];
    fixture.componentInstance.pagoActualizado.subscribe((item) => actualizaciones.push(item));

    vista.abrirConfirmacion();
    expect(vista.dialogoAbierto()).toBe(true);

    vista.confirmarPago();

    expect(api.confirmarPago).toHaveBeenCalledWith(1024);
    expect(vista.dialogoAbierto()).toBe(false);
    expect(actualizaciones[0]?.estado).toBe('APROBADO');
    expect(vista.exito()).toContain('confirmado');
  });

  it('ante un conflicto muestra el mensaje del backend y solicita recargar el estado', async () => {
    await configurar(pago());
    api.confirmarPago.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'No se puede confirmar un pago ANULADO' },
          }),
      ),
    );
    let recargas = 0;
    fixture.componentInstance.recargar.subscribe(() => (recargas += 1));

    vista.abrirConfirmacion();
    vista.confirmarPago();

    expect(recargas).toBe(1);
    expect(vista.errorConfirmacion()).toBe('No se puede confirmar un pago ANULADO');
    expect(vista.dialogoAbierto()).toBe(false);
    expect(vista.procesando()).toBe(false);
  });

  it('sólo descarga el comprobante de pagos aprobados', async () => {
    await configurar(pago({ estado: 'APROBADO' }));
    vista.descargarComprobante();
    expect(comprobantes.descargar).toHaveBeenCalledWith(1024);

    await configurar(pago({ estado: 'PENDIENTE' }));
    vista.descargarComprobante();
    expect(comprobantes.descargar).not.toHaveBeenCalled();
  });
});
