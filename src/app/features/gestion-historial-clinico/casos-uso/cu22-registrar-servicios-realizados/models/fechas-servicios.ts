/** datetime-local usa la zona del navegador; HTTP siempre recibe ISO con zona. */
export function fechaParaInput(fecha: string | Date = new Date()): string {
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  const pad = (numero: number) => String(numero).padStart(2, '0');
  return `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}T${pad(valor.getHours())}:${pad(valor.getMinutes())}:${pad(valor.getSeconds())}`;
}

export function fechaIsoLocal(fecha: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(fecha)) return null;
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return null;
  const esperada = fecha.length === 16 ? fecha + ':00' : fecha;
  return fechaParaInput(valor) === esperada ? valor.toISOString() : null;
}

export function limiteDia(fecha: string, fin = false): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const iso = fechaIsoLocal(fecha + (fin ? 'T23:59:59' : 'T00:00:00'));
  if (!iso) return null;
  return fin ? new Date(new Date(iso).getTime() + 999).toISOString() : iso;
}
