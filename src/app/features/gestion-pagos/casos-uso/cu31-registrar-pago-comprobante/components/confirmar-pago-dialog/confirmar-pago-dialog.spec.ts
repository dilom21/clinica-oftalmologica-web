import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoAdministrativo } from '../../models/pagos-administrativos.models';
import { ConfirmarPagoDialog } from './confirmar-pago-dialog';

const PAGO: PagoAdministrativo = {
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
};

describe('CU31 — diálogo de confirmación explícita', () => {
  let fixture: ComponentFixture<ConfirmarPagoDialog>;
  let confirmaciones: number;
  let cancelaciones: number;

  function crear(procesando = false): void {
    fixture = TestBed.createComponent(ConfirmarPagoDialog);
    confirmaciones = 0;
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe(() => (confirmaciones += 1));
    fixture.componentInstance.cancelar.subscribe(() => (cancelaciones += 1));
    fixture.componentRef.setInput('pago', PAGO);
    fixture.componentRef.setInput('nombrePaciente', 'Ana Quispe');
    fixture.componentRef.setInput('procesando', procesando);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarPagoDialog],
    }).compileComponents();
  });

  it('muestra los datos del pago y advierte que confirma la recepción del dinero', () => {
    crear();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('#PAG-01024');
    expect(texto).toContain('Ana Quispe');
    expect(texto).toContain('recepción del dinero');
    expect(texto).toContain('Bs 380,00');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('emite la confirmación sólo al pulsar el botón', () => {
    crear();
    const botones = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    const botonConfirmar = botones.find((boton) =>
      (boton.textContent ?? '').includes('Confirmar pago'),
    );
    expect(botonConfirmar).toBeTruthy();

    botonConfirmar?.click();
    expect(confirmaciones).toBe(1);
  });

  it('bloquea los botones y el cierre con Escape mientras se procesa', () => {
    crear(true);
    const elemento = fixture.nativeElement as HTMLElement;
    const botones = Array.from(elemento.querySelectorAll('button'));
    expect(botones.every((boton) => boton.disabled)).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelaciones).toBe(0);
  });
});
