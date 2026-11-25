import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtribuirReembolsoHuerfanoSolicitud, ReembolsoHuerfano } from '../../models/ajustes-pagos.models';
import { DialogoAtribuirHuerfano } from './dialogo-atribuir-huerfano';

const HUERFANO: ReembolsoHuerfano = {
  id: 7,
  stripe_event_id: 'evt_123',
  event_type: 'charge.refund.updated',
  refund_id: 're_123',
  payment_intent_id: 'pi_123',
  amount: 1010,
  currency: 'BOB',
  status: 'succeeded',
  estado: 'PENDIENTE',
  ajuste_id: null,
  motivo: null,
  creado_en: '2026-11-18T12:00:00Z',
};

describe('CU36 — diálogo para atribuir un reembolso huérfano', () => {
  let fixture: ComponentFixture<DialogoAtribuirHuerfano>;
  let solicitudes: AtribuirReembolsoHuerfanoSolicitud[];
  let cancelaciones: number;

  function crear(procesando = false, error: string | null = null): void {
    fixture = TestBed.createComponent(DialogoAtribuirHuerfano);
    solicitudes = [];
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe((valor) => solicitudes.push(valor));
    fixture.componentInstance.cancelar.subscribe(() => cancelaciones++);
    fixture.componentRef.setInput('huerfano', HUERFANO);
    fixture.componentRef.setInput('procesando', procesando);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  function raiz(): HTMLElement { return fixture.nativeElement as HTMLElement; }
  function campo(selector: string, valor: string, evento = 'input'): void {
    const elemento = raiz().querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    elemento.value = valor;
    elemento.dispatchEvent(new Event(evento));
    fixture.detectChanges();
  }
  function enviar(): void { raiz().querySelector('form')?.dispatchEvent(new Event('submit')); fixture.detectChanges(); }
  function completar(monto = '-10.10'): void {
    campo('#atribuir-motivo', 'Atribución verificada con el reporte de Stripe');
    campo('#atribuir-naturaleza', 'SOBREPAGO', 'change');
    campo('#atribuir-evidencia', 'Captura del panel de Stripe y conciliación bancaria');
    campo('input[formControlName="servicio_realizado_id"]', '42');
    campo('input[formControlName="monto"]', monto);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DialogoAtribuirHuerfano] }).compileComponents();
  });

  it('muestra el importe de 1010 unidades menores como 10,10 en moneda local', () => {
    crear();
    expect(raiz().textContent).toContain('Bs 10,10');
    expect(raiz().querySelector('[role="dialog"]')?.getAttribute('aria-describedby')).toBe('atribuir-huerfano-descripcion');
  });

  it('exige evidencia', () => {
    crear();
    completar();
    campo('#atribuir-evidencia', '');
    enviar();
    expect(solicitudes).toEqual([]);
    expect((raiz().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('bloquea montos positivos, cero y sumas distintas al reembolso', () => {
    crear();
    completar('10.10');
    expect((raiz().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    campo('input[formControlName="monto"]', '0.00');
    expect((raiz().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    campo('input[formControlName="monto"]', '-10.00');
    expect(raiz().textContent).toContain('coincidir exactamente');
    expect((raiz().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('anuncia los errores de distribución y los relaciona con los controles afectados', () => {
    crear();
    campo('input[formControlName="servicio_realizado_id"]', '42');
    campo('input[formControlName="monto"]', '-10.00');

    const resumen = raiz().querySelector('#atribuir-distribucion-errores');
    const servicio = raiz().querySelector('#atribuir-servicio-0');
    const monto = raiz().querySelector('#atribuir-monto-0');

    expect(resumen?.getAttribute('role')).toBe('alert');
    expect(resumen?.textContent).toContain('coincidir exactamente');
    expect(servicio?.getAttribute('aria-invalid')).toBeNull();
    expect(monto?.getAttribute('aria-invalid')).toBe('true');
    expect(monto?.getAttribute('aria-describedby')).toBe('atribuir-distribucion-errores');
    expect(raiz().querySelector(`#${monto?.getAttribute('aria-describedby')}`)).toBe(resumen);

    campo('input[formControlName="servicio_realizado_id"]', '0');
    expect(servicio?.getAttribute('aria-invalid')).toBe('true');
    expect(servicio?.getAttribute('aria-describedby')).toBe('atribuir-distribucion-errores');
  });

  it('emite únicamente motivo, naturaleza, evidencia y servicios', () => {
    crear();
    completar();
    enviar();
    expect(solicitudes).toHaveLength(1);
    expect(Object.keys(solicitudes[0]).sort()).toEqual(['evidencia', 'motivo', 'naturaleza', 'servicios']);
    expect(solicitudes[0]).toEqual({
      motivo: 'Atribución verificada con el reporte de Stripe',
      naturaleza: 'SOBREPAGO',
      evidencia: 'Captura del panel de Stripe y conciliación bancaria',
      servicios: [{ servicio_realizado_id: 42, monto: '-10.10' }],
    });
  });

  it('bloquea Escape y el fondo mientras procesa', () => {
    crear(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    raiz().querySelector<HTMLElement>('.atribuir')?.click();
    expect(cancelaciones).toBe(0);
    expect(raiz().querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true');
  });

  it('cierra con Escape y el fondo cuando no procesa', () => {
    crear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    raiz().querySelector<HTMLElement>('.atribuir')?.click();
    expect(cancelaciones).toBe(2);
  });

  it('muestra el error del servidor con role alert', () => {
    crear(false, 'No se pudo atribuir.');
    expect(raiz().querySelector('.atribuir__error[role="alert"]')?.textContent).toContain('No se pudo atribuir.');
  });
});
