import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReembolsarPagoSolicitud } from '../../models/ajustes-pagos.models';
import { pagoAdministrativo } from '../../testing/ajustes-pagos.fixture';
import { DialogoReembolsoPago } from './dialogo-reembolso-pago';

describe('CU36 — diálogo de devolución o reembolso', () => {
  let fixture: ComponentFixture<DialogoReembolsoPago>;
  let solicitudes: ReembolsarPagoSolicitud[];
  let cancelaciones: number;

  function crear(opciones: {
    procesando?: boolean;
    error?: string | null;
    importeVigente?: string | null;
  } = {}): void {
    fixture = TestBed.createComponent(DialogoReembolsoPago);
    solicitudes = [];
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe((solicitud) => solicitudes.push(solicitud));
    fixture.componentInstance.cancelar.subscribe(() => (cancelaciones += 1));
    fixture.componentRef.setInput(
      'pago',
      pagoAdministrativo(
        opciones.importeVigente === undefined
          ? {}
          : { importe_vigente: opciones.importeVigente },
      ),
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

  function campoFila(indice: number, valor: string): void {
    const controles = elemento().querySelectorAll<HTMLInputElement>(
      'input[formControlName="monto"]',
    );
    controles[indice].value = valor;
    controles[indice].dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function seleccionarServicio(indice: number, id: number): void {
    const controles = elemento().querySelectorAll<HTMLSelectElement>(
      'select[formControlName="servicio_realizado_id"]',
    );
    const opcion = Array.from(controles[indice].options).find((item) =>
      item.textContent?.includes(`#${id}`),
    );
    controles[indice].value = opcion?.value ?? '';
    controles[indice].dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function desenfocar(selector: string): void {
    (elemento().querySelector(selector) as HTMLElement).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function botonEnviar(): HTMLButtonElement {
    return elemento().querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  function completarBase(): void {
    campo('#reembolso-importe', '40.00');
    campo('#reembolso-motivo', 'El paciente canceló el tratamiento antes de la atención');
    campo('#reembolso-naturaleza', 'SOBREPAGO', 'change');
  }

  function enviar(): void {
    elemento().querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoReembolsoPago],
    }).compileComponents();
  });

  it('muestra el pago y el saldo por devolver', () => {
    crear();

    expect(elemento().querySelector('[role="dialog"]')).not.toBeNull();
    expect(elemento().querySelector('#reembolso-pago-titulo')?.textContent).toContain('#PAG-01024');
    expect(texto()).toContain('Ana Quispe');
    expect(texto()).toContain('Bs 380,00');
    expect(texto()).toContain('Aprobado');
  });

  it('advierte que la devolución no se puede deshacer', () => {
    crear();
    expect(texto()).toContain('La devolución no se puede deshacer');
  });

  it('convierte el importe positivo del operador en el importe negativo del contrato', () => {
    crear();
    campo('#reembolso-importe', '40.00');

    expect(texto()).toContain('Se registrará como');
    expect(texto()).toContain('Bs -40,00');
    expect(texto()).toContain('Bs 340,00');
  });

  it('mantiene el envío deshabilitado mientras el formulario está vacío', () => {
    crear();
    expect(botonEnviar().disabled).toBe(true);
  });

  it('emite el cuerpo exacto con importe y fila en negativo', () => {
    crear();
    completarBase();
    campo('#reembolso-evidencia', 'Comprobante de la transferencia de vuelta');

    enviar();

    expect(solicitudes).toEqual([
      {
        motivo: 'El paciente canceló el tratamiento antes de la atención',
        naturaleza: 'SOBREPAGO',
        importe: '-40.00',
        moneda: 'BOB',
        evidencia: 'Comprobante de la transferencia de vuelta',
        referencia_devolucion: null,
        servicios: [{ servicio_realizado_id: 11, monto: '-40.00' }],
      },
    ]);
  });

  it('rechaza un importe cero o que supera el saldo vigente', () => {
    crear();
    completarBase();
    campo('#reembolso-evidencia', 'Comprobante de la transferencia de vuelta');

    campo('#reembolso-importe', '0');
    desenfocar('#reembolso-importe');
    expect(texto()).toContain('debe ser mayor que cero');
    expect(botonEnviar().disabled).toBe(true);

    campo('#reembolso-importe', '500.00');
    expect(botonEnviar().disabled).toBe(true);
    expect(texto()).toContain('supera el saldo vigente');
    expect(texto()).toContain('Bs 380,00');

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('no aplica el tope cuando el servidor no informa el saldo vigente', () => {
    crear({ importeVigente: null });
    completarBase();
    campo('#reembolso-evidencia', 'Comprobante de la transferencia de vuelta');
    campo('#reembolso-importe', '500.00');

    expect(texto()).toContain('El servidor no informa el saldo vigente');
    expect(botonEnviar().disabled).toBe(false);
  });

  it('permite enviar ambos campos de documentación como null para que el backend decida', () => {
    crear();
    completarBase();
    expect(botonEnviar().disabled).toBe(false);

    enviar();

    expect(solicitudes).toHaveLength(1);
    expect(solicitudes[0].evidencia).toBeNull();
    expect(solicitudes[0].referencia_devolucion).toBeNull();
    expect(texto()).toContain('devolución manual');
    expect(texto()).toContain('puede responder 409');
    expect(texto()).toContain('reembolso Stripe');
  });

  it('conserva como número el servicio elegido desde el select nativo', () => {
    crear();
    completarBase();
    seleccionarServicio(0, 12);

    enviar();

    expect(solicitudes[0].servicios).toEqual([
      { servicio_realizado_id: 12, monto: '-40.00' },
    ]);
    expect(typeof solicitudes[0].servicios[0].servicio_realizado_id).toBe('number');
  });

  it('acepta la referencia de la devolución como única documentación', () => {
    crear();
    completarBase();
    campo('#reembolso-referencia', 'TRX-DEV-4471');

    enviar();

    expect(solicitudes).toEqual([
      {
        motivo: 'El paciente canceló el tratamiento antes de la atención',
        naturaleza: 'SOBREPAGO',
        importe: '-40.00',
        moneda: 'BOB',
        evidencia: null,
        referencia_devolucion: 'TRX-DEV-4471',
        servicios: [{ servicio_realizado_id: 11, monto: '-40.00' }],
      },
    ]);
  });

  it('rechaza una fila con monto positivo', () => {
    crear();
    completarBase();
    campo('#reembolso-evidencia', 'Comprobante de la transferencia de vuelta');
    campoFila(0, '10.00');

    expect(texto()).toContain('monto negativo');
    expect(botonEnviar().disabled).toBe(true);

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('nunca emite mientras procesa y deshabilita todos los botones', () => {
    crear({ procesando: true });
    completarBase();
    campo('#reembolso-evidencia', 'Comprobante de la transferencia de vuelta');

    expect(Array.from(elemento().querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    expect(elemento().querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Enviando la devolución',
    );

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('cierra con Escape y con clic en el fondo, salvo mientras procesa', () => {
    crear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelaciones).toBe(1);

    elemento().querySelector<HTMLElement>('.reembolso')?.click();
    expect(cancelaciones).toBe(2);

    fixture.componentRef.setInput('procesando', true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    elemento().querySelector<HTMLElement>('.reembolso')?.click();
    expect(cancelaciones).toBe(2);
  });

  it('mueve el foco al botón de cancelar al abrirse', () => {
    crear();
    expect(document.activeElement?.textContent).toContain('Cancelar');
  });

  it('muestra el error del servidor en un contenedor de alerta', () => {
    crear({ error: 'El reembolso quedó pendiente del proveedor.' });
    const alerta = elemento().querySelector('.reembolso__error[role="alert"]');

    expect(alerta?.textContent).toContain('El reembolso quedó pendiente del proveedor.');
  });

  it('no afirma que el dinero volvió cuando el proveedor puede dejarlo pendiente', () => {
    crear();
    expect(texto()).toContain('pendiente del proveedor');
    expect(texto()).toContain('no le confirmes al paciente que el dinero ya volvió');
  });
});
