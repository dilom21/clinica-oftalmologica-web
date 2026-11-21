import { Component, computed, input } from '@angular/core';
import { ResumenEstadoCuenta } from '../models/estado-cuenta.models';
import { formatearMonto } from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import { IconoCuenta } from './icono-cuenta';

/** Sólo proporciones de presentación; nunca calcula ni sustituye un saldo. */
export function porcentajeSaldo(importe: string, total: string): number {
  const valor = Number(importe);
  const saldo = Number(total);
  if (!Number.isFinite(valor) || !Number.isFinite(saldo) || saldo <= 0) return 0;
  return Math.min(100, Math.max(0, (valor / saldo) * 100));
}

@Component({
  selector: 'app-composicion-saldo',
  imports: [IconoCuenta],
  template: ` <section class="composition" aria-labelledby="composicion-titulo">
    <header>
      <app-icono-cuenta nombre="resumen" />
      <div>
        <h2 id="composicion-titulo">Composición del saldo</h2>
        <p>Distribución del saldo pendiente por financiamiento.</p>
      </div>
    </header>
    <div class="body">
      <div
        class="donut"
        role="img"
        [attr.aria-label]="
          'Saldo pendiente: ' +
          monto(resumen().saldo_total_pendiente, resumen().moneda) +
          '. Servicios no financiados: ' +
          porcentaje(noFinanciado()) +
          '%. Planes de pago: ' +
          porcentaje(financiado()) +
          '%.'
        "
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="49" />
          <circle
            class="non-financed"
            cx="60"
            cy="60"
            r="49"
            pathLength="100"
            [attr.stroke-dasharray]="noFinanciado() + ' 100'"
          />
          <circle
            class="financed"
            cx="60"
            cy="60"
            r="49"
            pathLength="100"
            [attr.stroke-dasharray]="financiado() + ' 100'"
            [attr.stroke-dashoffset]="-noFinanciado()"
          />
        </svg>
        <div>
          <strong>{{ monto(resumen().saldo_total_pendiente, resumen().moneda) }}</strong
          ><span>{{ sinSaldo() ? 'Sin saldo pendiente' : 'Saldo pendiente' }}</span>
        </div>
      </div>
      <dl class="legend">
        <div>
          <dt><i></i>Servicios no financiados</dt>
          <dd>
            {{ monto(resumen().saldo_servicios_no_financiados, resumen().moneda)
            }}<small>{{ porcentaje(noFinanciado()) }}%</small>
          </dd>
        </div>
        <div>
          <dt><i class="secondary"></i>Planes de pago</dt>
          <dd>
            {{ monto(resumen().saldo_planes_pago, resumen().moneda)
            }}<small>{{ porcentaje(financiado()) }}%</small>
          </dd>
        </div>
      </dl>
      <div class="counters">
        <div>
          <app-icono-cuenta nombre="planes" /><span>Planes activos</span
          ><strong>{{ resumen().cantidad_planes_activos }}</strong>
        </div>
        <div class="warning">
          <app-icono-cuenta nombre="calendario" /><span>Cuotas pendientes</span
          ><strong>{{ resumen().cantidad_cuotas_pendientes }}</strong>
        </div>
        <div class="success">
          <app-icono-cuenta nombre="check" /><span>Cuotas pagadas</span
          ><strong>{{ resumen().cantidad_cuotas_pagadas }}</strong>
        </div>
        <div class="danger">
          <app-icono-cuenta nombre="alerta" /><span>Cuotas vencidas</span
          ><strong>{{ resumen().cantidad_cuotas_vencidas }}</strong>
        </div>
      </div>
    </div>
    <p class="note">Las cuotas vencidas forman parte del saldo; no se suman nuevamente.</p>
  </section>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
      height: 100%;
    }
    .composition {
      height: 100%;
      padding: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
      border-radius: 12px;
      box-shadow: var(--shadow-xs);
    }
    header {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    header app-icono-cuenta {
      color: var(--color-seccion-indicacion);
      width: 26px;
      height: 26px;
    }
    h2 {
      font-size: 16px;
    }
    p {
      font-size: 11px;
      margin-top: 3px;
    }
    .body {
      display: grid;
      grid-template-columns: 116px minmax(140px, 1fr) minmax(155px, 0.85fr);
      gap: 16px;
      align-items: center;
      margin-top: 12px;
    }
    .donut {
      width: 116px;
      height: 116px;
      position: relative;
    }
    .donut svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 12;
    }
    .track {
      stroke: var(--color-neutral-bg);
    }
    .non-financed {
      stroke: var(--color-primary);
    }
    .financed {
      stroke: #16a4c7;
    }
    .donut > div {
      position: absolute;
      inset: 25px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .donut strong {
      font-size: 14px;
      line-height: 1.3;
      color: var(--color-heading);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    .donut span {
      font-size: 10px;
      color: var(--color-text-soft);
      margin-top: 3px;
    }
    dl {
      margin: 0;
    }
    .legend > div {
      margin: 10px 0;
    }
    dt {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      color: var(--color-text);
    }
    i {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      background: var(--color-primary);
      flex-shrink: 0;
    }
    .secondary {
      background: #16a4c7;
    }
    dd {
      margin: 3px 0 0 16px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-heading);
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-variant-numeric: tabular-nums;
    }
    small {
      font-size: 11px;
      color: var(--color-text-soft);
    }
    .counters {
      display: grid;
      gap: 6px;
      padding-left: 16px;
      border-left: 1px solid var(--color-border-soft);
    }
    .counters > div {
      display: flex;
      gap: 7px;
      align-items: center;
      background: var(--color-background-sky);
      border-radius: 7px;
      padding: 4px 9px;
      font-size: 10px;
    }
    .counters app-icono-cuenta {
      width: 15px;
      height: 15px;
      color: var(--color-seccion-indicacion);
    }
    .counters strong {
      margin-left: auto;
      font-size: 12px;
    }
    .counters .success {
      background: var(--color-success-bg);
      color: var(--color-success-text);
    }
    .counters .warning {
      background: var(--color-warning-bg);
      color: var(--color-warning-text);
    }
    .counters .danger {
      background: var(--color-danger-bg);
      color: var(--color-danger-text);
    }
    .success app-icono-cuenta,
    .warning app-icono-cuenta,
    .danger app-icono-cuenta {
      color: inherit;
    }
    .note {
      font-size: 10px;
      margin-top: 10px;
    }
    @media (min-width: 1600px) {
      .legend > div {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }
      dd {
        margin: 0;
      }
    }
    @media (max-width: 1200px) {
      .body {
        grid-template-columns: 115px minmax(120px, 1fr);
        gap: 10px;
      }
      .donut {
        width: 115px;
        height: 115px;
      }
      .counters {
        grid-column: 1/-1;
        grid-template-columns: 1fr 1fr;
        border: 0;
        padding: 0;
      }
    }
    @media (max-width: 500px) {
      .composition {
        padding: 15px;
      }
      .body {
        grid-template-columns: 110px minmax(0, 1fr);
      }
      .donut {
        width: 110px;
        height: 110px;
      }
      .legend dt {
        font-size: 10px;
      }
      .legend dd {
        flex-wrap: wrap;
      }
    }
  `,
})
export class ComposicionSaldo {
  readonly resumen = input.required<ResumenEstadoCuenta>();
  protected readonly noFinanciado = computed(() =>
    porcentajeSaldo(
      this.resumen().saldo_servicios_no_financiados,
      this.resumen().saldo_total_pendiente,
    ),
  );
  protected readonly financiado = computed(() =>
    porcentajeSaldo(this.resumen().saldo_planes_pago, this.resumen().saldo_total_pendiente),
  );
  protected readonly sinSaldo = computed(() => Number(this.resumen().saldo_total_pendiente) === 0);
  protected readonly porcentaje = (valor: number) =>
    new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(valor);
  protected readonly monto = formatearMonto;
}
