import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

import {
  ServicioPendienteAdministrativo,
  formatearFecha,
  formatearMonto,
} from '../../models/pagos-administrativos.models';

/**
 * Tabla de servicios realizados pendientes de cobro. Es presentacional: la
 * selección (y la regla de una sola consulta por pago) vive en `RegistroPago`.
 */
@Component({
  selector: 'app-servicios-pendientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './servicios-pendientes.html',
  styleUrl: './servicios-pendientes.css',
})
export class ServiciosPendientes {
  readonly servicios = input.required<ServicioPendienteAdministrativo[]>();
  readonly seleccionados = input<ReadonlySet<number>>(new Set<number>());
  readonly puedeSeleccionar = input(true);
  readonly cargando = input(false);

  readonly alternar = output<ServicioPendienteAdministrativo>();

  protected monto(valor: string): string {
    return formatearMonto(valor);
  }

  protected fecha(valor: string | null): string {
    return formatearFecha(valor);
  }

  protected estaSeleccionado(servicio: ServicioPendienteAdministrativo): boolean {
    return this.seleccionados().has(servicio.servicio_realizado_id);
  }

  protected seleccionar(servicio: ServicioPendienteAdministrativo): void {
    if (!this.puedeSeleccionar() || !servicio.cobrable) {
      return;
    }
    this.alternar.emit(servicio);
  }
}
