export type EstadoCuentaPlan = 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';
export type EstadoCuentaCuota = 'PENDIENTE' | 'VENCIDA' | 'PAGADA' | 'CANCELADA';

export interface EstadoCuentaPaciente {
  id: number;
  nombres: string;
  apellidos: string;
  ci: string | null;
  telefono: string | null;
}

export interface ResumenEstadoCuenta {
  moneda: string;
  importe_total_servicios: string;
  total_pagos_aprobados_aplicados: string;
  saldo_total_pendiente: string;
  saldo_servicios_no_financiados: string;
  saldo_planes_pago: string;
  importe_cuotas_vencidas: string;
  cantidad_planes_activos: number;
  cantidad_cuotas_pendientes: number;
  cantidad_cuotas_pagadas: number;
  cantidad_cuotas_vencidas: number;
}

export interface ServicioEstadoCuenta {
  servicio_realizado_id: number;
  consulta_clinica_id: number | null;
  servicio: string;
  fecha_realizacion: string | null;
  precio_aplicado: string;
  monto_pagado_aplicado: string;
  saldo_pendiente: string;
  financiado: boolean;
  plan_pago_id: number | null;
}

export interface CuotaEstadoCuenta {
  id: number;
  numero_cuota: number;
  monto_programado: string;
  fecha_vencimiento: string;
  estado: EstadoCuentaCuota;
}

export interface PlanEstadoCuenta {
  id: number;
  monto_total: string;
  moneda: string;
  estado: EstadoCuentaPlan;
  saldo_pendiente: string;
  cuotas: CuotaEstadoCuenta[];
}

export interface PagoPendienteConfirmacionEstadoCuenta {
  pago_id: number;
  monto: string;
  moneda: string;
  estado: 'PENDIENTE' | 'APROBADO';
  pasarela: string | null;
  aplicado_a_obligacion: boolean | null;
  requiere_reconciliacion: boolean;
}

export interface EstadoCuentaRespuesta {
  paciente: EstadoCuentaPaciente;
  resumen: ResumenEstadoCuenta;
  servicios: ServicioEstadoCuenta[];
  planes_pago: PlanEstadoCuenta[];
  pagos_pendientes_confirmacion: PagoPendienteConfirmacionEstadoCuenta[];
}
