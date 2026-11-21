import { TestBed } from '@angular/core/testing';
import { ComposicionSaldo, porcentajeSaldo } from './composicion-saldo';
import { ResumenEstadoCuenta } from '../models/estado-cuenta.models';

const resumen: ResumenEstadoCuenta = {
  moneda: 'BOB',
  importe_total_servicios: '390.00',
  total_pagos_aprobados_aplicados: '240.00',
  saldo_total_pendiente: '150.00',
  saldo_servicios_no_financiados: '150.00',
  saldo_planes_pago: '0.00',
  importe_cuotas_vencidas: '0.00',
  cantidad_planes_activos: 0,
  cantidad_cuotas_pendientes: 0,
  cantidad_cuotas_pagadas: 3,
  cantidad_cuotas_vencidas: 0,
};

describe('CU34 — composición visual del saldo', () => {
  it.each([
    ['150.00', '150.00', 100],
    ['0.00', '150.00', 0],
    ['100.00', '250.00', 40],
    ['0.00', '0.00', 0],
    ['1.00', '0.00', 0],
    ['NaN', '10', 0],
  ])('representa %s sobre %s sin alterar importes', (importe, total, esperado) => {
    expect(porcentajeSaldo(importe, total)).toBe(esperado);
  });

  it('dibuja 100% no financiado y 0% de planes y expone una descripción accesible', () => {
    const fixture = TestBed.createComponent(ComposicionSaldo);
    fixture.componentRef.setInput('resumen', resumen);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.non-financed').getAttribute('stroke-dasharray'),
    ).toBe('100 100');
    expect(fixture.nativeElement.querySelector('.financed').getAttribute('stroke-dasharray')).toBe(
      '0 100',
    );
    expect(
      fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label'),
    ).toContain('Servicios no financiados: 100%');
    expect(fixture.nativeElement.textContent).toContain('Bs 150,00');
    expect(resumen.saldo_total_pendiente).toBe('150.00');
  });

  it('muestra donut neutro con saldo cero, nunca NaN o Infinity', () => {
    const fixture = TestBed.createComponent(ComposicionSaldo);
    fixture.componentRef.setInput('resumen', {
      ...resumen,
      saldo_total_pendiente: '0.00',
      saldo_servicios_no_financiados: '0.00',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin saldo pendiente');
    expect(
      fixture.nativeElement.querySelector('.non-financed').getAttribute('stroke-dasharray'),
    ).toBe('0 100');
    expect(fixture.nativeElement.outerHTML).not.toMatch(/NaN|Infinity/);
  });
});
