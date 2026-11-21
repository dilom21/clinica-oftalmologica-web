import { Component, input } from '@angular/core';

/** Iconografía lineal local a CU34, sin dependencias ni estilos globales. */
@Component({
  selector: 'app-icono-cuenta',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="trazos[nombre()] || trazos['documento']" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconoCuenta {
  readonly nombre = input('documento');
  protected readonly trazos: Record<string, string> = {
    saldo:
      'M20 6c0 2-16 2-16 0s16-2 16 0ZM4 6v12c0 3 16 3 16 0V6M4 10c0 3 16 3 16 0M4 14c0 3 16 3 16 0',
    resumen: 'M4 20V12M9 20V7M14 20V4M19 20V10',
    servicios:
      'M5 3v5a4 4 0 0 0 8 0V3M3 3h4M11 3h4M9 12v3a5 5 0 0 0 10 0v-2M19 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
    planes: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
    tarjeta: 'M3 5h18v14H3V5ZM3 9h18M6 14h4',
    efectivo: 'M2 6h20v12H2V6Zm10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M5 9v6M19 9v6',
    transferencia: 'M3 7h16l-4-4M21 17H5l4 4M19 7l-4 4M5 17l4-4',
    qr: 'M3 3h6v6H3V3ZM15 3h6v6h-6V3ZM3 15h6v6H3v-6ZM15 15h2v2h4v4h-6v-2M21 13v2',
    pendientes: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
    alerta: 'm12 3 10 18H2L12 3ZM12 9v5M12 17h.01',
    buscar: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6',
    actualizar: 'M20 7a9 9 0 1 0 1 9M20 3v5h-5',
    calendario: 'M4 5h16v16H4V5ZM8 3v4M16 3v4M4 10h16',
    check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6',
    documento: 'M5 3h9l5 5v13H5V3ZM14 3v6h5M8 13h8M8 17h6',
    flecha: 'm9 5 7 7-7 7',
    filtro: 'M3 4h18l-7 8v7l-4 2v-9L3 4Z',
    inicio: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
    menu: 'M3 6h18M3 12h18M3 18h18',
    vacio: 'M5 3h14v18H5V3ZM8 7h8M8 11h6M8 15h4',
  };
}
