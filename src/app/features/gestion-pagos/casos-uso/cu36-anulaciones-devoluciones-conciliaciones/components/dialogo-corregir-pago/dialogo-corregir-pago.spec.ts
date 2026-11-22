import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorregirPagoSolicitud } from '../../models/ajustes-pagos.models';
import { pagoAdministrativo } from '../../testing/ajustes-pagos.fixture';
import { DialogoCorregirPago } from './dialogo-corregir-pago';

describe('CU36 — diálogo de corrección de importe', () => {
  let fixture: ComponentFixture<DialogoCorregirPago>;
  let solicitudes: CorregirPagoSolicitud[];
  let cancelaciones: number;

  function crear(opciones: { procesando?: boolean; error?: string | null } = {}): void {
    fixture = TestBed.createComponent(DialogoCorregirPago);
    solicitudes = [];
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe((solicitud) => solicitudes.push(solicitud));
    fixture.componentInstance.cancelar.subscribe(() => (cancelaciones += 1));
    fixture.componentRef.setInput('pago', pagoAdministrativo());
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
    const control = controles[indice];
    control.value = valor;
    control.dispatchEvent(new Event('input'));
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

  function botonEnviar(): HTMLButtonElement {
    return elemento().querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  function boton(textoBoton: string): HTMLButtonElement {
    const botones = Array.from(elemento().querySelectorAll('button'));
    return botones.find((boton) => (boton.textContent ?? '').trim() === textoBoton) as HTMLButtonElement;
  }

  function escribirMotivo(): void {
    campo('#corregir-motivo', 'La consulta se registró con el precio de otro servicio');
  }

  function enviar(): void {
    elemento().querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoCorregirPago],
    }).compileComponents();
  });

  it('muestra el pago y deja una sola fila con el primer servicio como distribución por defecto', () => {
    crear();

    expect(elemento().querySelector('[role="dialog"]')).not.toBeNull();
    expect(elemento().querySelector('#corregir-pago-titulo')?.textContent).toContain('#PAG-01024');
    expect(texto()).toContain('Ana Quispe');
    expect(texto()).toContain('Bs 380,00');
    expect(texto()).toContain('Aprobado');

    const filas = elemento().querySelectorAll('input[formControlName="monto"]');
    expect(filas.length).toBe(1);
    const servicio = elemento().querySelector(
      'select[formControlName="servicio_realizado_id"]',
    ) as HTMLSelectElement;
    expect(servicio.selectedOptions[0].textContent).toContain('#11');
  });

  it('advierte que la corrección no se puede deshacer y que no devuelve dinero', () => {
    crear();

    expect(texto()).toContain('La corrección no se puede deshacer');
    expect(texto()).toContain('no devuelve dinero');
  });

  it('mantiene el envío deshabilitado mientras el formulario está vacío', () => {
    crear();

    expect(botonEnviar().disabled).toBe(true);
    escribirMotivo();
    expect(botonEnviar().disabled).toBe(true);

    campo('#corregir-importe', '-40.00');
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');
    expect(botonEnviar().disabled).toBe(false);
  });

  it('emite el cuerpo exacto con el importe y la fila en negativo', () => {
    crear();
    campo('#corregir-importe', '-40.00');
    escribirMotivo();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');

    enviar();

    expect(solicitudes).toEqual([
      {
        motivo: 'La consulta se registró con el precio de otro servicio',
        naturaleza: 'SERVICIO_CANCELADO',
        importe: '-40.00',
        moneda: 'BOB',
        evidencia: null,
        servicios: [{ servicio_realizado_id: 11, monto: '-40.00' }],
      },
    ]);
  });

  it('conserva como número el servicio elegido desde el select nativo', () => {
    crear();
    campo('#corregir-importe', '-40.00');
    escribirMotivo();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');
    seleccionarServicio(0, 12);

    enviar();

    expect(solicitudes[0].servicios).toEqual([
      { servicio_realizado_id: 12, monto: '-40.00' },
    ]);
    expect(typeof solicitudes[0].servicios[0].servicio_realizado_id).toBe('number');
  });

  it('rechaza una fila con signo distinto al del importe total', () => {
    crear();
    campo('#corregir-importe', '40.00');
    escribirMotivo();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');
    campoFila(0, '-10.00');

    expect(botonEnviar().disabled).toBe(true);
    expect(texto()).toContain('mismo signo que el importe total');

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('rechaza una distribución cuya suma no coincide con el importe y muestra la diferencia', () => {
    crear();
    campo('#corregir-importe', '40.00');
    escribirMotivo();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');
    campoFila(0, '10.00');

    expect(texto()).toContain('La suma distribuida debe coincidir exactamente con el importe.');
    expect(texto()).toContain('Bs -30,00');
    expect(botonEnviar().disabled).toBe(true);

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('al alza restringe la naturaleza a error de registro y exige evidencia', () => {
    crear();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');
    campo('#corregir-importe', '40.00');

    const select = elemento().querySelector('#corregir-naturaleza') as HTMLSelectElement;
    expect(Array.from(select.options).map((opcion) => opcion.value)).toEqual([
      '',
      'ERROR_DE_REGISTRO',
    ]);
    expect(select.value).toBe('ERROR_DE_REGISTRO');
    expect(texto()).toContain('(obligatoria al alza)');

    escribirMotivo();
    expect(botonEnviar().disabled).toBe(true);

    campo('#corregir-evidencia', 'Factura del servicio con el precio correcto');
    enviar();

    expect(solicitudes).toEqual([
      {
        motivo: 'La consulta se registró con el precio de otro servicio',
        naturaleza: 'ERROR_DE_REGISTRO',
        importe: '40.00',
        moneda: 'BOB',
        evidencia: 'Factura del servicio con el precio correcto',
        servicios: [{ servicio_realizado_id: 11, monto: '40.00' }],
      },
    ]);
  });

  it('distribuye todo el importe en la primera fila y descarta las filas extra', () => {
    crear();
    campo('#corregir-importe', '-40.00');
    escribirMotivo();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');

    boton('Agregar servicio').click();
    fixture.detectChanges();
    expect(elemento().querySelectorAll('input[formControlName="monto"]').length).toBe(2);
    expect(botonEnviar().disabled).toBe(true);

    boton('Distribuir todo en el primer servicio').click();
    fixture.detectChanges();
    const filas = elemento().querySelectorAll<HTMLInputElement>('input[formControlName="monto"]');
    expect(filas.length).toBe(1);
    expect(filas[0].value).toBe('-40.00');

    enviar();
    expect(solicitudes[0].servicios).toEqual([{ servicio_realizado_id: 11, monto: '-40.00' }]);
  });

  it('nunca emite mientras procesa y deshabilita todos los botones', () => {
    crear({ procesando: true });
    campo('#corregir-importe', '-40.00');
    escribirMotivo();
    campo('#corregir-naturaleza', 'SERVICIO_CANCELADO', 'change');

    expect(Array.from(elemento().querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    expect(elemento().querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Enviando la corrección',
    );

    enviar();
    expect(solicitudes).toEqual([]);
  });

  it('cierra con Escape y con clic en el fondo, salvo mientras procesa', () => {
    crear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelaciones).toBe(1);

    elemento().querySelector<HTMLElement>('.corregir')?.click();
    expect(cancelaciones).toBe(2);

    fixture.componentRef.setInput('procesando', true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    elemento().querySelector<HTMLElement>('.corregir')?.click();
    expect(cancelaciones).toBe(2);
  });

  it('mueve el foco al botón de cancelar al abrirse', () => {
    crear();
    expect(document.activeElement?.textContent).toContain('Cancelar');
  });

  it('muestra el error del servidor en un contenedor de alerta', () => {
    crear({ error: 'El pago ya tiene un ajuste abierto.' });
    const alerta = elemento().querySelector('.corregir__error[role="alert"]');

    expect(alerta?.textContent).toContain('El pago ya tiene un ajuste abierto.');
  });
});
