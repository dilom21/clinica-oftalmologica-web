import { Component, input } from '@angular/core';
import { ResumenEstadoCuenta } from '../models/estado-cuenta.models';
import { formatearMonto } from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import { IconoCuenta } from './icono-cuenta';

@Component({
  selector: 'app-indicadores-cuenta',
  imports: [IconoCuenta],
  template: ` <section class="metrics" aria-label="Resumen financiero">
    <article class="metric">
      <span class="icon"><app-icono-cuenta nombre="servicios" /></span>
      <div>
        <span>Total de servicios</span
        ><strong>{{ monto(resumen().importe_total_servicios, resumen().moneda) }}</strong
        ><small>Servicios realizados</small>
      </div>
    </article>
    <article class="metric success">
      <span class="icon"><app-icono-cuenta nombre="tarjeta" /></span>
      <div>
        <span>Pagos aplicados</span
        ><strong>{{ monto(resumen().total_pagos_aprobados_aplicados, resumen().moneda) }}</strong
        ><small>Aprobados y aplicados</small>
      </div>
    </article>
    <article class="metric balance">
      <span class="icon"><app-icono-cuenta nombre="saldo" /></span>
      <div>
        <span>Saldo pendiente</span
        ><strong>{{ monto(resumen().saldo_total_pendiente, resumen().moneda) }}</strong
        ><small>Según el estado de cuenta</small>
      </div>
    </article>
    <article class="metric" [class.warning]="resumen().cantidad_cuotas_vencidas > 0">
      <span class="icon"><app-icono-cuenta nombre="alerta" /></span>
      <div>
        <span>Cuotas vencidas</span
        ><strong>{{ monto(resumen().importe_cuotas_vencidas, resumen().moneda) }}</strong
        ><small
          >{{ resumen().cantidad_cuotas_vencidas }}
          {{
            resumen().cantidad_cuotas_vencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'
          }}</small
        >
      </div>
    </article>
  </section>`,
  styles: `
    :host {
      display: block;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .metric {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 14px;
      border: 1px solid var(--color-border-soft);
      border-radius: 12px;
      background: linear-gradient(120deg, var(--color-surface-muted), var(--color-background-sky));
      box-shadow: var(--shadow-xs);
      min-width: 0;
    }
    .metric > div {
      min-width: 0;
    }
    .metric span:not(.icon) {
      font-size: 12px;
      color: var(--color-text);
    }
    strong,
    small {
      display: block;
    }
    strong {
      font-size: clamp(18px, 1.6vw, 23px);
      line-height: 1.3;
      color: var(--color-heading);
      font-weight: 800;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    small {
      font-size: 11px;
      color: var(--color-text-soft);
      margin-top: 3px;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--color-background-deep);
      color: var(--color-seccion-indicacion);
      flex-shrink: 0;
    }
    .icon app-icono-cuenta {
      width: 23px;
      height: 23px;
    }
    .success {
      background: linear-gradient(120deg, var(--color-surface), var(--color-success-bg-soft));
    }
    .success .icon {
      background: var(--color-success-bg-soft);
      color: var(--color-success-text);
    }
    .balance strong {
      color: var(--color-info-text);
    }
    .warning {
      background: linear-gradient(120deg, var(--color-surface), var(--color-warning-bg));
      border-color: var(--color-warning-border);
    }
    .warning .icon {
      background: var(--color-warning-bg);
      color: var(--color-warning-text);
    }
    .warning strong {
      color: var(--color-warning-text);
    }
    @media (max-width: 1100px) {
      .metric {
        padding: 13px;
        gap: 8px;
      }
      .icon {
        width: 30px;
        height: 30px;
      }
    }
    @media (max-width: 650px) {
      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .metric {
        padding: 12px;
      }
      .metric .icon {
        display: none;
      }
      strong {
        font-size: 19px;
      }
    }
  `,
})
export class IndicadoresCuenta {
  readonly resumen = input.required<ResumenEstadoCuenta>();
  protected readonly monto = formatearMonto;
}
