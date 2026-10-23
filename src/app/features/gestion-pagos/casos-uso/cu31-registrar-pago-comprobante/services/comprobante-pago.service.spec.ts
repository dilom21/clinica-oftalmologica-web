import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { environment } from '../../../../../../environments/environment';
import { ComprobantePagoService } from './comprobante-pago.service';

describe('CU31 — descarga del comprobante PDF', () => {
  let servicio: ComprobantePagoService;
  let http: HttpTestingController;
  let click: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ComprobantePagoService);
    http = TestBed.inject(HttpTestingController);

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:comprobante'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
    click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    click.mockRestore();
    http.verify();
  });

  it('descarga el binario real y lo entrega con un nombre seguro', () => {
    let completado = false;
    servicio.descargar(9).subscribe({ complete: () => (completado = true) });

    const peticion = http.expectOne(
      `${environment.apiUrl}/pagos/administrativos/9/comprobante`,
    );
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF-1.4 contenido'], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="comprobante_pago_9.pdf"',
      },
    });

    expect(completado).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    const enlace = click.mock.instances[0] as HTMLAnchorElement;
    expect(enlace.download).toBe('comprobante_pago_9.pdf');
    expect(enlace.href).toBe('blob:comprobante');
  });

  it('falla si el servidor responde un PDF vacío', () => {
    let mensaje = '';
    servicio.descargar(9).subscribe({
      error: (error: unknown) => {
        mensaje = error instanceof Error ? error.message : String(error);
      },
    });

    http
      .expectOne(`${environment.apiUrl}/pagos/administrativos/9/comprobante`)
      .flush(new Blob([]), { headers: { 'Content-Type': 'application/pdf' } });

    expect(mensaje).toContain('no devolvió');
    expect(click).not.toHaveBeenCalled();
  });
});
