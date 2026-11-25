import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { centavosDeMonto, monedaValida } from '../models/ajustes-pagos.models';

/**
 * Validadores compartidos por los diálogos de escritura del CU36.
 *
 * Los límites no se escriben aquí: cada diálogo los recibe desde
 * `ajustes-pagos.models.ts` (contrato del backend). Este archivo sólo traduce
 * esas reglas a errores de formulario, recortando espacios porque el backend
 * recibe el texto ya recortado.
 */

/** Texto obligatorio u opcional con longitud recortada entre `minimo` y `maximo`. */
export function validarTextoAjuste(
  minimo: number,
  maximo: number,
  obligatorio: boolean,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const bruto: unknown = control.value;
    const valor = typeof bruto === 'string' ? bruto.trim() : '';
    if (!valor) {
      return obligatorio ? { requerido: true } : null;
    }
    if (valor.length < minimo) {
      return { demasiadoCorto: { minimo, maximo } };
    }
    if (valor.length > maximo) {
      return { demasiadoLargo: { minimo, maximo } };
    }
    return null;
  };
}

/**
 * Importe con signo: hasta dos decimales y distinto de cero.
 * `centavosDeMonto` es la única autoridad sobre el formato.
 */
export function validarImporteConSigno(control: AbstractControl): ValidationErrors | null {
  const bruto: unknown = control.value;
  const valor = typeof bruto === 'string' ? bruto.trim() : '';
  if (!valor) {
    return { requerido: true };
  }
  const centavos = centavosDeMonto(valor);
  if (centavos === null) {
    return { importeInvalido: true };
  }
  return centavos === 0 ? { importeCero: true } : null;
}

/**
 * Importe que el operador escribe en positivo. El signo negativo del contrato
 * lo aplica el componente, no el usuario.
 */
export function validarImportePositivo(control: AbstractControl): ValidationErrors | null {
  const bruto: unknown = control.value;
  const valor = typeof bruto === 'string' ? bruto.trim() : '';
  if (!valor) {
    return { requerido: true };
  }
  const centavos = centavosDeMonto(valor);
  if (centavos === null) {
    return { importeInvalido: true };
  }
  if (centavos < 0) {
    return { importeNegativo: true };
  }
  return centavos === 0 ? { importeCero: true } : null;
}

/** La moneda del contrato son exactamente tres letras mayúsculas. */
export function validarMonedaAjuste(control: AbstractControl): ValidationErrors | null {
  const bruto: unknown = control.value;
  const valor = typeof bruto === 'string' ? bruto.trim() : '';
  if (!valor) {
    return { requerido: true };
  }
  return monedaValida(valor) ? null : { monedaInvalida: true };
}

export interface EtiquetaTexto {
  etiqueta: string;
  minimo: number;
  maximo: number;
}

/** Mensaje del primer error de un campo de texto, sólo cuando ya fue tocado. */
export function mensajeTextoAjuste(
  control: AbstractControl,
  opciones: EtiquetaTexto,
): string | null {
  if (!control.touched || control.valid) {
    return null;
  }
  if (control.hasError('requerido')) {
    return `${opciones.etiqueta} no puede quedar en blanco.`;
  }
  if (control.hasError('demasiadoCorto')) {
    return `${opciones.etiqueta} debe tener al menos ${opciones.minimo} caracteres.`;
  }
  if (control.hasError('demasiadoLargo')) {
    return `${opciones.etiqueta} no puede superar ${opciones.maximo} caracteres.`;
  }
  return `Revisa ${opciones.etiqueta.toLowerCase()}.`;
}

/** Mensaje del primer error de un importe con signo. */
export function mensajeImporteConSigno(control: AbstractControl, etiqueta: string): string | null {
  if (!control.touched || control.valid) {
    return null;
  }
  if (control.hasError('requerido')) {
    return `${etiqueta} no puede quedar en blanco.`;
  }
  if (control.hasError('importeInvalido')) {
    return `${etiqueta} debe ser un número con hasta dos decimales (por ejemplo 40.00 o -40.00).`;
  }
  if (control.hasError('importeCero')) {
    return `${etiqueta} no puede ser cero.`;
  }
  return `Revisa ${etiqueta.toLowerCase()}.`;
}

/** Mensaje del primer error de un importe que el operador escribe en positivo. */
export function mensajeImportePositivo(control: AbstractControl, etiqueta: string): string | null {
  if (!control.touched || control.valid) {
    return null;
  }
  if (control.hasError('requerido')) {
    return `${etiqueta} no puede quedar en blanco.`;
  }
  if (control.hasError('importeInvalido')) {
    return `${etiqueta} debe ser un número con hasta dos decimales (por ejemplo 40.00).`;
  }
  if (control.hasError('importeNegativo')) {
    return `Escribe ${etiqueta.toLowerCase()} en positivo; el sistema lo registra con signo negativo.`;
  }
  if (control.hasError('importeCero')) {
    return `${etiqueta} debe ser mayor que cero.`;
  }
  return `Revisa ${etiqueta.toLowerCase()}.`;
}

/** Mensaje del primer error de la moneda. */
export function mensajeMoneda(control: AbstractControl): string | null {
  if (!control.touched || control.valid) {
    return null;
  }
  if (control.hasError('requerido')) {
    return 'La moneda no puede quedar en blanco.';
  }
  if (control.hasError('monedaInvalida')) {
    return 'La moneda debe tener exactamente tres letras mayúsculas (por ejemplo BOB).';
  }
  return 'Revisa la moneda.';
}

/** Marca todos los campos del formulario para que sus errores queden visibles. */
export function tocarTodo(control: AbstractControl): void {
  control.markAllAsTouched();
}
