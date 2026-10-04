import { fechaIsoLocal, fechaParaInput, limiteDia } from './fechas-servicios';

describe('CU22 — fechas locales y zonas horarias', () => {
  it('conserva el instante al editar una fecha con zona', () => {
    const original = '2020-01-02T09:30:25-04:00';
    expect(fechaIsoLocal(fechaParaInput(original))).toBe(new Date(original).toISOString());
  });
  it('rechaza fechas inexistentes y entradas sin fecha/hora local', () => {
    expect(fechaIsoLocal('2020-02-30T12:00')).toBeNull();
    expect(fechaIsoLocal('texto')).toBeNull();
    expect(fechaIsoLocal('')).toBeNull();
  });
  it('incluye el último milisegundo del día de un filtro', () => {
    const inicio = limiteDia('2020-01-02')!;
    const fin = limiteDia('2020-01-02', true)!;
    expect(new Date(fin).getTime() - new Date(inicio).getTime()).toBe(86_400_000 - 1);
    expect(new Date(fin).getMilliseconds()).toBe(999);
    expect(limiteDia('2020-02-30')).toBeNull();
  });
});
