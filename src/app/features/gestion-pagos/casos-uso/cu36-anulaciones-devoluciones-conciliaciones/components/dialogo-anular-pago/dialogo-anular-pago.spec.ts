import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnularPagoSolicitud } from '../../models/ajustes-pagos.models';
import { pagoAdministrativo } from '../../testing/ajustes-pagos.fixture';
import { DialogoAnularPago } from './dialogo-anular-pago';

describe('CU36 — diálogo de anulación', () => {
  let fixture: ComponentFixture<DialogoAnularPago>;
  let solicitudes: AnularPagoSolicitud[];
  let cancelaciones: number;

  function crear(opciones: {
    estado?: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO';
    procesando?: boolean;
    error?: string | null;
  } = {}): void {
    fixture = TestBed.createComponent(DialogoAnularPago);
    solicitudes = [];
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe((solicitud) => solicitudes.push(solicitud));
    fixture.componentInstance.cancelar.subscribe(() => (cancelaciones += 1));
    fixture.componentRef.setInput(
      'pago',
      pagoAdministrativo({ estado: opciones.estado ?? 'APROBADO' }),
    );
    fixture.componentRef.setInput('nombrePaciente', 'Ana Quispe');
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

  function completar(datos: {
    motivo?: string;
    naturaleza?: string;
    evidencia?: string;
  } = {}): void {
    campo('#anular-motivo', datos.motivo ?? 'Cobro registrado dos veces para la misma consulta');
    campo('#anular-naturaleza', datos.naturaleza ?? 'PAGO_DUPLICADO', 'change');
    if (datos.evidencia !== undefined) {
      campo('#anular-evidencia', datos.evidencia);
    }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoAnularPago],
    }).compileComponents();
  });

  it('muestra la referencia, el paciente, el importe vigente y el estado del pago', () => {
    crear();
    const dialogo = elemento().querySelector('[role="dialog"]');

    expect(dialogo).not.toBeNull();
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.getAttribute('aria-labelledby')).toBe('anular-pago-titulo');
    expect(dialogo?.getAttribute('aria-describedby')).toBe('anular-pago-descripcion');
    expect(elemento().querySelector('#anular-pago-titulo')?.textContent).toContain('#PAG-01024');
    expect(texto()).toContain('Ana Quispe');
    expect(texto()).toContain('Bs 380,00');
    expect(texto()).toContain('Aprobado');
  });

  it('advierte que la operación no se puede deshacer y explica lo que el servidor rechaza', () => {
    crear();

    expect(texto()).toContain('Esta operación no se puede deshacer');
    expect(texto()).toContain('capturado por la pasarela');
    expect(texto()).toContain('devoluciones confirmadas');
  });

  it('mantiene el envío deshabilitado mientras faltan el motivo o la naturaleza', () => {
    crear();

    expect(botonEnviar().disabled).toBe(true);
    campo('#anular-motivo', '   ');
    expect(botonEnviar().disabled).toBe(true);

    completar({ evidencia: 'Extracto bancario del 19/10 sin el abono' });
    expect(botonEnviar().disabled).toBe(false);
  });

  it('emite el cuerpo exacto de la anulación con la evidencia recortada', () => {
    crear();
    completar({ evidencia: '  Extracto bancario verificado  ' });

    enviar();

    expect(solicitudes).toEqual([
      {
        motivo: 'Cobro registrado dos veces para la misma consulta',
        naturaleza: 'PAGO_DUPLICADO',
        evidencia: 'Extracto bancario verificado',
      },
    ]);
  });

  it('exige evidencia sobre un pago aprobado y no la exige sobre uno pendiente', () => {
    crear({ estado: 'APROBADO' });
    completar();
    expect(texto()).toContain('(obligatoria para este pago)');
    expect(botonEnviar().disabled).toBe(true);
    enviar();
    expect(solicitudes).toEqual([]);

    fixture.componentRef.setInput('pago', pagoAdministrativo({ estado: 'PENDIENTE' }));
    fixture.detectChanges();
    expect(texto()).not.toContain('(obligatoria para este pago)');
    expect(botonEnviar().disabled).toBe(false);

    enviar();
    expect(solicitudes).toEqual([
      {
        motivo: 'Cobro registrado dos veces para la misma consulta',
        naturaleza: 'PAGO_DUPLICADO',
        evidencia: null,
      },
    ]);
  });

  it('nunca emite mientras procesa y deshabilita todos los botones', () => {
    crear({ procesando: true });
    completar({ evidencia: 'Extracto bancario verificado' });

    const botones = Array.from(elemento().querySelectorAll('button'));
    expect(botones.every((boton) => boton.disabled)).toBe(true);
    expect(elemento().querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Enviando la anulación');

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('cierra con Escape y con clic en el fondo, salvo mientras procesa', () => {
    crear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelaciones).toBe(1);

    elemento().querySelector<HTMLElement>('.anular')?.click();
    expect(cancelaciones).toBe(2);

    fixture.componentRef.setInput('procesando', true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    elemento().querySelector<HTMLElement>('.anular')?.click();
    expect(cancelaciones).toBe(2);
  });

  it('mueve el foco al botón de cancelar al abrirse', () => {
    crear();
    expect(document.activeElement?.textContent).toContain('Cancelar');
  });

  it('muestra el error del servidor en un contenedor de alerta', () => {
    crear({ error: 'El pago ya tiene devoluciones confirmadas.' });
    const alerta = elemento().querySelector('.anular__error[role="alert"]');

    expect(alerta?.textContent).toContain('El pago ya tiene devoluciones confirmadas.');
  });
});
