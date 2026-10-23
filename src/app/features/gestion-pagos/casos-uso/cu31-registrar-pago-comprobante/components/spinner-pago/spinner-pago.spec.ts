import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpinnerPago } from './spinner-pago';

describe('CU31 — animación de carga del registro de pago', () => {
  let fixture: ComponentFixture<SpinnerPago>;

  async function configurar(): Promise<void> {
    TestBed.configureTestingModule({ imports: [SpinnerPago] });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(SpinnerPago);
    fixture.detectChanges();
  }

  it('dibuja doce segmentos redondeados con desfases continuos', async () => {
    await configurar();

    const host = fixture.nativeElement as HTMLElement;
    const segmentos = Array.from(
      host.querySelectorAll<HTMLElement>('.spinner-pago__segmento'),
    );

    expect(segmentos.length).toBe(12);
    expect(segmentos[0].style.transform).toContain('rotate(0deg)');
    expect(segmentos[6].style.transform).toContain('rotate(180deg)');
    const desfases = new Set(segmentos.map((segmento) => segmento.style.animationDelay));
    expect(desfases.size).toBe(12);
    expect(segmentos.some((segmento) => segmento.classList.contains('spinner-pago__segmento--claro'))).toBe(true);
  });

  it('anuncia el proceso con role=status y aria-live', async () => {
    await configurar();

    const estado = fixture.nativeElement.querySelector(
      '[role="status"]',
    ) as HTMLElement;

    expect(estado).not.toBeNull();
    expect(estado.getAttribute('aria-live')).toBe('polite');
    expect(estado.textContent).toContain('Registrando pago');
    expect(estado.textContent).toContain('No vuelvas a pulsar el botón');
  });
});
