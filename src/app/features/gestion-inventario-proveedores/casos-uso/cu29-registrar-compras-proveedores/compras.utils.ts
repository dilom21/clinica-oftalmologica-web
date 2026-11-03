// Los centavos se calculan como enteros grandes para evitar redondeos binarios.
export function centavos(valor: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(valor)) throw new Error('Importe inválido');
  const [entero, decimales = ''] = valor.split('.');
  return BigInt(entero) * 100n + BigInt(decimales.padEnd(2, '0'));
}

export function importe(valor: bigint, moneda = 'BOB'): string {
  const entero = (valor / 100n).toLocaleString('es-BO');
  const decimales = (valor % 100n).toString().padStart(2, '0');
  return `${moneda === 'BOB' ? 'Bs' : moneda} ${entero},${decimales}`;
}

export function hoyClinica(): string {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}
