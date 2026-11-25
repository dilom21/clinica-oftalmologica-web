import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConciliarAjusteSolicitud, PagoAjuste } from '../../models/ajustes-pagos.models';
import { ajustePago } from '../../testing/ajustes-pagos.fixture';
import { DialogoConciliarAjuste } from './dialogo-conciliar-ajuste';

describe('CU36 — diálogo de conciliación', () => {
  let fixture: ComponentFixture<DialogoConciliarAjuste>;
  let solicitudes: ConciliarAjusteSolicitud[];
  let cancelaciones: number;

  function crear(opciones: {
    ajuste?: PagoAjuste;
    procesando?: boolean;
    error?: string | null;
  } = {}): void {
    fixture = TestBed.createComponent(DialogoConciliarAjuste);
    solicitudes = [];
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe((solicitud) => solicitudes.push(solicitud));
    fixture.componentInstance.cancelar.subscribe(() => (cancelaciones += 1));
    fixture.componentRef.setInput('ajuste', opciones.ajuste ?? ajustePago());
    fixture.componentRef.setInput('procesando', opciones.procesando ?? false);
    fixture.componentRef.setInput('error', opciones.error ?? null);
    fixture.detectChanges();
  }

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texto(): string {
    return elemento().textContent ?? '';
  }

  function campo(selector: string, valor: string, evento = 'input'): void {
    const control = elemento().querySelector(selector) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    control.value = valor;
    control.dispatchEvent(new Event(evento));
    fixture.detectChanges();
  }

  function botonEnviar(): HTMLButtonElement {
    return elemento().querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  function enviar(): void {
    elemento().querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoConciliarAjuste],
    }).compileComponents();
  });

  it('resume el ajuste sin ofrecer el estado desconocido como resultado', () => {
    crear({ ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_MANUAL' }) });

    expect(elemento().querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(elemento().querySelector('#conciliar-ajuste-titulo')?.textContent).toContain('#55');
    expect(texto()).toContain('Devolución');
    expect(texto()).toContain('Servicio cancelado');
    expect(texto()).toContain('Pendiente del proveedor');
    expect(texto()).toContain('Bs -40,00');
    expect(texto()).toContain('re_123');

    const opciones = Array.from(
      elemento().querySelectorAll('#conciliar-resultado option'),
    ).map((opcion) => (opcion as HTMLOptionElement).value);
    expect(opciones).toEqual(['', 'CONFIRMADO', 'FALLIDO', 'CANCELADO']);
  });

  it('advierte que la conciliación no se puede deshacer', () => {
    crear();
    expect(texto()).toContain('Esta conciliación no se puede deshacer');
  });

  it('emite el cuerpo exacto con los textos recortados y null en los vacíos', () => {
    crear({ ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_MANUAL' }) });
    campo('#conciliar-resultado', 'FALLIDO', 'change');
    campo('#conciliar-evidencia', '  Verificado en la caja del día  ');

    enviar();

    expect(solicitudes).toEqual([
      {
        resultado: 'FALLIDO',
        evidencia: 'Verificado en la caja del día',
        observaciones: null,
        refund_id: null,
      },
    ]);
  });

  it('exige evidencia al confirmar un ajuste manual y no la exige al cancelarlo', () => {
    crear({ ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_MANUAL' }) });
    campo('#conciliar-resultado', 'CONFIRMADO', 'change');

    expect(texto()).toContain('(obligatoria para esta conciliación)');
    expect(botonEnviar().disabled).toBe(true);

    enviar();
    expect(solicitudes).toEqual([]);

    campo('#conciliar-evidencia', 'Comprobante firmado por el paciente');
    expect(botonEnviar().disabled).toBe(false);

    enviar();
    expect(solicitudes).toEqual([
      {
        resultado: 'CONFIRMADO',
        evidencia: 'Comprobante firmado por el paciente',
        observaciones: null,
        refund_id: null,
      },
    ]);

    campo('#conciliar-resultado', 'CANCELADO', 'change');
    campo('#conciliar-evidencia', '');
    expect(texto()).not.toContain('(obligatoria para esta conciliación)');
    expect(botonEnviar().disabled).toBe(false);
  });

  it('exige evidencia cuando un reembolso del proveedor trae refund_id', () => {
    crear({ ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_STRIPE' }) });

    expect(elemento().querySelector('#conciliar-resultado')).toBeNull();
    expect(botonEnviar().disabled).toBe(false);

    campo('#conciliar-refund', 're_3NqXyZ2eZvKYlo2C');

    expect(texto()).toContain('(obligatoria para esta conciliación)');
    expect(botonEnviar().disabled).toBe(true);

    enviar();
    expect(solicitudes).toEqual([]);

    campo('#conciliar-evidencia', 'Panel de Stripe: reembolso succeeded');
    enviar();

    expect(solicitudes).toEqual([
      {
        resultado: 'CONFIRMADO',
        evidencia: 'Panel de Stripe: reembolso succeeded',
        observaciones: null,
        refund_id: 're_3NqXyZ2eZvKYlo2C',
      },
    ]);
  });

  it('oculta el resultado y envía CONFIRMADO en un reembolso del proveedor', () => {
    crear({ ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_STRIPE' }) });

    expect(elemento().querySelector('#conciliar-resultado')).toBeNull();
    expect(texto()).toContain('ignora el resultado que envíe la interfaz');
    expect(texto()).toContain('409');

    campo('#conciliar-evidencia', 'Panel de Stripe: reembolso succeeded');
    enviar();

    expect(solicitudes[0]?.resultado).toBe('CONFIRMADO');
  });

  it('valida la longitud del refund_id', () => {
    crear({ ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_STRIPE' }) });

    campo('#conciliar-refund', 're');
    (elemento().querySelector('#conciliar-refund') as HTMLElement).dispatchEvent(
      new Event('blur'),
    );
    fixture.detectChanges();

    expect(texto()).toContain('debe tener al menos 3 caracteres');
    expect(botonEnviar().disabled).toBe(true);

    campo('#conciliar-refund', 'x'.repeat(256));
    expect(botonEnviar().disabled).toBe(true);
  });

  it('no emite mientras procesa y bloquea Escape y el fondo', () => {
    crear({
      ajuste: ajustePago({ efecto_caja: 'DEVOLUCION_MANUAL' }),
      procesando: true,
    });
    campo('#conciliar-evidencia', 'Comprobante firmado por el paciente');

    expect(Array.from(elemento().querySelectorAll('button')).every((boton) => boton.disabled)).toBe(
      true,
    );
    expect(elemento().querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Enviando la conciliación',
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    elemento().querySelector<HTMLElement>('.conciliar')?.click();
    enviar();

    expect(cancelaciones).toBe(0);
    expect(solicitudes).toEqual([]);
  });

  it('cierra con Escape y con clic en el fondo cuando no procesa', () => {
    crear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelaciones).toBe(1);

    elemento().querySelector<HTMLElement>('.conciliar')?.click();
    expect(cancelaciones).toBe(2);
  });

  it('mueve el foco al botón de cancelar al abrirse', () => {
    crear();
    expect(document.activeElement?.textContent).toContain('Cancelar');
  });

  it('muestra el error del servidor en un contenedor de alerta', () => {
    crear({ error: 'El reembolso sigue pendiente en el proveedor.' });

    const alerta = elemento().querySelector('.conciliar__error[role="alert"]');
    expect(alerta?.textContent).toContain('El reembolso sigue pendiente en el proveedor.');
  });
});
