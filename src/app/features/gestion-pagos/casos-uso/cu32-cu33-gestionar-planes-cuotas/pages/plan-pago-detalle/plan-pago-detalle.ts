import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { ComprobantePagoService } from '../../../cu31-registrar-pago-comprobante/services/comprobante-pago.service';
import {
  CuotaRespuesta,
  METODOS_COBRO,
  MOTIVO_CANCELACION_BLOQUEADA,
  MetodoPagoCuota,
  PagoCuotaCrear,
  PagoCuotaResumen,
  PermisosPlanesCuotas,
  PlanPagoRespuesta,
  cuotasPagadasDePlan,
  etiquetaEstadoCuota,
  etiquetaEstadoPagoCuota,
  etiquetaEstadoPlan,
  etiquetaMetodoCobro,
  formatearFechaLarga,
  formatearFechaTabla,
  formatearMontoPlan,
  generarClaveIdempotencia,
  inicialesPaciente,
  mensajeErrorDescargaComprobante,
  mensajeErrorPlanes,
  normalizarTexto,
  pagosPendientesCuota,
  pagosPendientesPlan,
  permisosPlanesCuotas,
  planTieneCobrosAprobados,
  progresoPlan,
  proximoVencimiento,
  puedeCancelarPlanPago,
  puedeCobrarCuota,
  puedeDescargarComprobanteCuota,
  sinPermisosPlanesCuotas,
} from '../../models/planes-cuotas.models';
import { PlanesPagoService } from '../../services/planes-pago.service';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';

/** Pestañas visuales del detalle; todas leen datos ya presentes en el plan. */
type PestanaDetalle = 'cuotas' | 'servicios' | 'intentos';

type MotivoSinAcceso =
  | 'menu-error'
  | 'menu-invalido'
  | 'sin-modulo'
  | 'sin-funciones'
  | 'sin-acciones'
  | 'plan-invalido';

/**
 * CU33 — detalle de un plan de pago y gestión de sus cuotas.
 *
 * Permite cobrar una cuota (efectivo, transferencia o QR con `Idempotency-Key`),
 * confirmar o rechazar intentos pendientes y cancelar el plan. Todo se recarga
 * desde `GET /pagos/planes/{id}` para no mantener estado financiero en cliente.
 */
@Component({
  selector: 'app-plan-pago-detalle',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './plan-pago-detalle.html',
  styleUrl: './plan-pago-detalle.css',
})
export class PlanPagoDetalle implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly motivoSinAcceso = signal<MotivoSinAcceso | null>(null);
  protected readonly permisos = signal<PermisosPlanesCuotas>(sinPermisosPlanesCuotas());

  protected readonly planId = signal<number | null>(null);
  protected readonly plan = signal<PlanPagoRespuesta | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pacientes = signal<Paciente[]>([]);

  protected readonly cuotaCobro = signal<CuotaRespuesta | null>(null);
  protected readonly metodoCobro = signal<MetodoPagoCuota>('EFECTIVO');
  protected readonly referenciaCobro = signal('');
  protected readonly observacionesCobro = signal('');
  protected readonly guardandoCobro = signal(false);
  protected readonly errorCobro = signal<string | null>(null);

  protected readonly cuotaIntentos = signal<CuotaRespuesta | null>(null);
  protected readonly intentos = signal<PagoCuotaResumen[]>([]);
  protected readonly cargandoIntentos = signal(false);
  protected readonly errorIntentos = signal<string | null>(null);
  protected readonly pagoARechazar = signal<PagoCuotaResumen | null>(null);
  protected readonly motivoRechazo = signal('');
  protected readonly procesandoPago = signal(false);

  /** Pago cuyo comprobante PDF se está descargando (bloquea solo ese botón). */
  protected readonly descargandoComprobante = signal<number | null>(null);
  protected readonly errorComprobante = signal<string | null>(null);

  protected readonly cancelando = signal(false);
  protected readonly motivoCancelacion = signal('');
  protected readonly confirmarCancelacion = signal(false);
  protected readonly errorCancelacion = signal<string | null>(null);

  private claveIdempotenciaCuota: string | null = null;

  protected readonly metodos = METODOS_COBRO;
  protected readonly monto = formatearMontoPlan;
  protected readonly fechaTabla = formatearFechaTabla;
  protected readonly fechaLarga = formatearFechaLarga;
  protected readonly estadoPlan = etiquetaEstadoPlan;
  protected readonly estadoCuota = etiquetaEstadoCuota;
  protected readonly estadoPago = etiquetaEstadoPagoCuota;
  protected readonly metodo = etiquetaMetodoCobro;
  protected readonly puedeCobrar = puedeCobrarCuota;
  protected readonly proximo = proximoVencimiento;
  protected readonly avance = progresoPlan;
  protected readonly pagadas = cuotasPagadasDePlan;
  protected readonly pendientesDePago = pagosPendientesCuota;
  protected readonly intentosDelPlan = pagosPendientesPlan;

  protected readonly pestana = signal<PestanaDetalle>('cuotas');

  /** Texto del botón principal del panel de cobro (importe exacto de la cuota). */
  protected readonly textoBotonCobro = computed(() => {
    const cuota = this.cuotaCobro();
    return cuota
      ? `Registrar cobro de ${formatearMontoPlan(cuota.monto_programado)}`
      : 'Registrar cobro';
  });

  private readonly menuService = inject(MenuService);
  private readonly pacientesService = inject(PacientesService);
  private readonly planesService = inject(PlanesPagoService);
  private readonly comprobantes = inject(ComprobantePagoService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private pacientesSolicitados = false;
  private planSolicitado: number | null = null;

  protected readonly sinEmpresaTenant = !this.authService.tenantCode();
  protected readonly pacientesPorId = computed(
    () => new Map(this.pacientes().map((paciente) => [paciente.id, paciente])),
  );

  protected readonly proximaCuota = computed(() => {
    const plan = this.plan();
    return plan ? proximoVencimiento(plan) : null;
  });

  protected readonly cuotasOrdenadas = computed(() =>
    [...(this.plan()?.cuotas ?? [])].sort((a, b) => a.numero_cuota - b.numero_cuota),
  );

  protected readonly resumenCuotas = computed(() => {
    const cuotas = this.plan()?.cuotas ?? [];
    return {
      total: cuotas.length,
      pagadas: cuotas.filter((cuota) => cuota.estado === 'PAGADA').length,
      pendientes: cuotas.filter((cuota) => cuota.estado === 'PENDIENTE').length,
      vencidas: cuotas.filter((cuota) => cuota.estado === 'VENCIDA').length,
      canceladas: cuotas.filter((cuota) => cuota.estado === 'CANCELADA').length,
    };
  });

  protected readonly intentosPendientes = computed(() => {
    const plan = this.plan();
    return plan ? pagosPendientesPlan(plan) : [];
  });

  /**
   * Regla de CU32 replicada en la UI: un plan con cobros aprobados no puede
   * cancelarse. Es sólo una ayuda visual; el backend sigue siendo la
   * validación definitiva (409 «El plan tiene cobros aprobados…»).
   */
  protected readonly cancelacionBloqueada = computed(() => {
    const plan = this.plan();
    return plan !== null && plan.estado === 'ACTIVO' && planTieneCobrosAprobados(plan);
  });

  protected readonly puedeCancelarPlan = computed(() => {
    const plan = this.plan();
    return this.permisos().escribirPlanes && plan !== null && puedeCancelarPlanPago(plan);
  });

  protected readonly motivoCancelacionBloqueada = MOTIVO_CANCELACION_BLOQUEADA;

  protected readonly pacienteTitular = computed(() => {
    const plan = this.plan();
    return plan ? this.pacientesPorId().get(plan.paciente_id) ?? null : null;
  });

  protected readonly tituloSinAcceso = computed(() => {
    switch (this.motivoSinAcceso()) {
      case 'menu-error':
        return 'No se pudo verificar el menú de seguridad';
      case 'menu-invalido':
        return 'El menú de seguridad llegó en un formato no válido';
      case 'sin-modulo':
        return 'El módulo «Pagos» no está disponible en esta sesión';
      case 'sin-funciones':
        return 'El módulo «Pagos» no tiene funciones asignadas';
      case 'sin-acciones':
        return 'Tu rol no tiene acceso a las cuotas del plan';
      case 'plan-invalido':
        return 'El identificador del plan no es válido';
      default:
        return 'Estado de permisos sin determinar';
    }
  });

  protected readonly detalleSinAcceso = computed(() => {
    switch (this.motivoSinAcceso()) {
      case 'menu-error':
        return 'El servicio de menú no respondió, así que no se pudo comprobar el acceso. Vuelve a intentarlo; no se consultó el plan.';
      case 'menu-invalido':
        return 'El menú recibido no es una lista de módulos con funciones. Vuelve a intentarlo; no se consultó el plan.';
      case 'sin-modulo':
        return this.sinEmpresaTenant
          ? 'Tu sesión no tiene una empresa (tenant) asociada, por lo que el menú no incluye las funciones de planes y cuotas.'
          : 'El menú de tu empresa no incluye el módulo «Pagos», así que no es posible abrir el plan.';
      case 'sin-funciones':
        return 'El módulo «Pagos» existe en el menú pero sin funciones asociadas: no se puede verificar el permiso sobre cuotas.';
      case 'sin-acciones':
        return 'No hay acciones de lectura sobre «Gestionar planes de pago» o «Gestionar cuotas». Solicita a administración revisar los roles de tu usuario.';
      case 'plan-invalido':
        return 'La ruta no contiene un número de plan válido. Vuelve al listado y abre el plan desde su tarjeta.';
      default:
        return 'No se pudo determinar el estado de tus permisos. Vuelve a comprobarlo en unos segundos.';
    }
  });

  /** Consulta el plan solo cuando el menú confirma el permiso de lectura. */
  private readonly sincronizarPermisos = effect(() => {
    const estado = this.menuService.estado();

    if (estado === 'error') {
      this.bloquear('menu-error');
      return;
    }
    if (estado !== 'listo') {
      this.estadoPermiso.set('verificando');
      this.motivoSinAcceso.set(null);
      this.permisos.set(sinPermisosPlanesCuotas());
      return;
    }

    const modulos = this.menuService.modulos();
    if (!Array.isArray(modulos)) {
      this.bloquear('menu-invalido');
      return;
    }

    const funciones = modulos.flatMap((modulo) =>
      Array.isArray(modulo?.funciones) ? modulo.funciones : [],
    );
    const permisos = permisosPlanesCuotas(funciones);
    this.permisos.set(permisos);

    if (!permisos.verPlanes && !permisos.verCuotas) {
      const moduloPagos = modulos.find((modulo) => normalizarTexto(modulo?.nombre) === 'pagos');
      const funcionesPagos =
        moduloPagos && Array.isArray(moduloPagos.funciones) ? moduloPagos.funciones : [];
      this.bloquear(
        !moduloPagos ? 'sin-modulo' : funcionesPagos.length === 0 ? 'sin-funciones' : 'sin-acciones',
      );
      return;
    }

    const planId = this.planId();
    if (!planId) {
      this.bloquear('plan-invalido');
      return;
    }

    this.estadoPermiso.set('autorizado');
    this.motivoSinAcceso.set(null);
    this.cargarPacientes();
    // `cargarPlan` lee `cargando`, por eso se ejecuta fuera del grafo reactivo
    // y solo una vez por plan: así el effect no se reejecuta con cada respuesta.
    if (this.planSolicitado !== planId) {
      this.planSolicitado = planId;
      untracked(() => this.cargarPlan(planId));
    }
  });

  // --- Carga y navegación -------------------------------------------------

  private cargarPlan(planId: number): void {
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.planesService
      .obtenerPlan(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.plan.set(plan);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.plan.set(null);
          this.cargando.set(false);
          this.error.set(mensajeErrorPlanes(error, 'abrir el plan de pago'));
        },
      });
  }

  protected recargarPlan(): void {
    const planId = this.planId();
    if (planId) {
      this.cargarPlan(planId);
    }
  }

  protected volver(): void {
    void this.router.navigate(['/pagos/planes']);
  }

  protected reintentarMenu(): void {
    this.menuService.reintentar();
  }

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected iniciales(): string {
    const paciente = this.pacienteTitular();
    return paciente ? inicialesPaciente(paciente.nombres, paciente.apellidos) : '··';
  }

  protected nombrePaciente(): string {
    const plan = this.plan();
    const paciente = this.pacienteTitular();
    if (paciente) {
      return `${paciente.nombres} ${paciente.apellidos}`;
    }
    return plan ? `Paciente #${plan.paciente_id}` : '—';
  }

  // --- Intentos pendientes de verificación -------------------------------

  protected verIntentos(cuota: CuotaRespuesta): void {
    if (!this.permisos().verCuotas) {
      return;
    }
    this.cuotaIntentos.set(cuota);
    this.intentos.set(cuota.pagos);
    this.pagoARechazar.set(null);
    this.motivoRechazo.set('');
    this.errorIntentos.set(null);
    this.errorComprobante.set(null);
    this.cargarIntentos(cuota.id);
  }

  protected cerrarIntentos(): void {
    if (this.procesandoPago()) {
      return;
    }
    this.cuotaIntentos.set(null);
    this.pagoARechazar.set(null);
    this.errorComprobante.set(null);
  }

  private cargarIntentos(cuotaId: number): void {
    this.cargandoIntentos.set(true);

    this.planesService
      .listarIntentosCuota(cuotaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.intentos.set(respuesta.intentos ?? []);
          this.cargandoIntentos.set(false);
        },
        error: (error: unknown) => {
          this.cargandoIntentos.set(false);
          this.errorIntentos.set(mensajeErrorPlanes(error, 'consultar los intentos de la cuota'));
        },
      });
  }

  protected confirmarIntento(pago: PagoCuotaResumen): void {
    const cuota = this.cuotaIntentos();
    if (!cuota || this.procesandoPago() || !this.permisos().escribirCuotas) {
      return;
    }

    this.procesandoPago.set(true);
    this.errorIntentos.set(null);

    this.planesService
      .confirmarPagoCuota(cuota.id, pago.pago_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesandoPago.set(false);
          this.cargarIntentos(cuota.id);
          this.recargarPlan();
        },
        error: (error: unknown) => {
          this.procesandoPago.set(false);
          this.errorIntentos.set(mensajeErrorPlanes(error, 'confirmar el intento de pago'));
        },
      });
  }

  protected abrirRechazo(pago: PagoCuotaResumen): void {
    this.pagoARechazar.set(pago);
    this.motivoRechazo.set('');
    this.errorIntentos.set(null);
  }

  protected cerrarRechazo(): void {
    this.pagoARechazar.set(null);
    this.motivoRechazo.set('');
  }

  protected escribirMotivoRechazo(valor: string): void {
    this.motivoRechazo.set(valor);
  }

  protected rechazarIntento(): void {
    const cuota = this.cuotaIntentos();
    const pago = this.pagoARechazar();
    const motivo = this.motivoRechazo().trim();
    if (!cuota || !pago || this.procesandoPago() || !this.permisos().escribirCuotas) {
      return;
    }
    if (motivo.length < 5) {
      this.errorIntentos.set('Describe el motivo del rechazo (mínimo 5 caracteres).');
      return;
    }

    this.procesandoPago.set(true);
    this.errorIntentos.set(null);

    this.planesService
      .rechazarPagoCuota(cuota.id, pago.pago_id, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesandoPago.set(false);
          this.pagoARechazar.set(null);
          this.motivoRechazo.set('');
          this.cargarIntentos(cuota.id);
          this.recargarPlan();
        },
        error: (error: unknown) => {
          this.procesandoPago.set(false);
          this.errorIntentos.set(mensajeErrorPlanes(error, 'rechazar el intento de pago'));
        },
      });
  }

  // --- Comprobante PDF del pago aprobado ---------------------------------

  /** El comprobante lo genera el backend sólo para pagos APROBADOS y con lectura de cuotas. */
  protected puedeDescargarComprobante(pago: PagoCuotaResumen): boolean {
    return this.permisos().verCuotas && puedeDescargarComprobanteCuota(pago);
  }

  protected descargarComprobante(pago: PagoCuotaResumen): void {
    if (this.descargandoComprobante() !== null || !this.puedeDescargarComprobante(pago)) {
      return;
    }

    this.descargandoComprobante.set(pago.pago_id);
    this.errorComprobante.set(null);

    this.comprobantes
      .descargar(pago.pago_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.descargandoComprobante.set(null),
        error: (error: unknown) => {
          this.descargandoComprobante.set(null);
          this.errorComprobante.set(mensajeErrorDescargaComprobante(error));
        },
      });
  }

  // --- Cancelación del plan ----------------------------------------------

  protected abrirCancelacion(): void {
    if (!this.puedeCancelarPlan()) {
      return;
    }
    this.confirmarCancelacion.set(true);
    this.motivoCancelacion.set('');
    this.errorCancelacion.set(null);
  }

  protected cerrarCancelacion(): void {
    if (this.cancelando()) {
      return;
    }
    this.confirmarCancelacion.set(false);
    this.motivoCancelacion.set('');
  }

  protected escribirMotivoCancelacion(valor: string): void {
    this.motivoCancelacion.set(valor);
  }

  protected cancelarPlan(): void {
    const plan = this.plan();
    const motivo = this.motivoCancelacion().trim();
    if (!plan || this.cancelando() || !this.puedeCancelarPlan()) {
      return;
    }
    if (motivo.length < 5) {
      this.errorCancelacion.set('Describe el motivo de la cancelación (mínimo 5 caracteres).');
      return;
    }

    this.cancelando.set(true);
    this.errorCancelacion.set(null);

    this.planesService
      .cancelarPlan(plan.id, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.cancelando.set(false);
          this.confirmarCancelacion.set(false);
          this.motivoCancelacion.set('');
          this.plan.set(actualizado);
        },
        error: (error: unknown) => {
          this.cancelando.set(false);
          this.errorCancelacion.set(mensajeErrorPlanes(error, 'cancelar el plan de pago'));
        },
      });
  }

  // --- Soporte ------------------------------------------------------------

  private cargarPacientes(): void {
    if (this.pacientesSolicitados) {
      return;
    }
    this.pacientesSolicitados = true;

    this.pacientesService
      .listarPacientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pacientes) => this.pacientes.set(pacientes ?? []),
        error: () => this.pacientes.set([]),
      });
  }

  private bloquear(motivo: MotivoSinAcceso): void {
    this.estadoPermiso.set(
      motivo === 'menu-error' || motivo === 'menu-invalido' ? 'error' : 'denegado',
    );
    this.motivoSinAcceso.set(motivo);
    this.permisos.set(sinPermisosPlanesCuotas());
  }

  // --- Cobro de cuota -----------------------------------------------------

  protected puedeGestionarCuota(cuota: CuotaRespuesta): boolean {
    return (
      this.permisos().escribirCuotas &&
      this.plan()?.estado === 'ACTIVO' &&
      puedeCobrarCuota(cuota)
    );
  }

  protected abrirCobro(cuota: CuotaRespuesta): void {
    if (!this.puedeGestionarCuota(cuota)) {
      return;
    }
    this.cuotaCobro.set(cuota);
    this.metodoCobro.set('EFECTIVO');
    this.referenciaCobro.set('');
    this.observacionesCobro.set('');
    this.errorCobro.set(null);
    this.claveIdempotenciaCuota = null;
  }

  protected seleccionarPestana(valor: PestanaDetalle): void {
    this.pestana.set(valor);
  }

  protected cerrarCobro(): void {
    if (this.guardandoCobro()) {
      return;
    }
    this.cuotaCobro.set(null);
    this.errorCobro.set(null);
  }

  protected cambiarMetodo(valor: string): void {
    const metodo = METODOS_COBRO.find((item) => item === valor);
    if (metodo) {
      this.metodoCobro.set(metodo);
      if (metodo === 'EFECTIVO') {
        this.referenciaCobro.set('');
      }
    }
  }

  protected escribirReferencia(valor: string): void {
    this.referenciaCobro.set(valor);
  }

  protected escribirObservacionesCobro(valor: string): void {
    this.observacionesCobro.set(valor);
  }

  protected requiereReferencia(): boolean {
    return this.metodoCobro() !== 'EFECTIVO';
  }

  protected registrarCobro(): void {
    const cuota = this.cuotaCobro();
    if (!cuota || this.guardandoCobro() || !this.puedeGestionarCuota(cuota)) {
      return;
    }

    const referencia = this.referenciaCobro().trim();
    if (this.requiereReferencia() && !referencia) {
      this.errorCobro.set('Indica la referencia bancaria del cobro.');
      return;
    }

    const datos: PagoCuotaCrear = {
      metodo_pago: this.metodoCobro(),
      referencia_bancaria: referencia || null,
      observaciones: this.observacionesCobro().trim() || null,
    };

    this.claveIdempotenciaCuota ??= generarClaveIdempotencia('cuota');
    this.guardandoCobro.set(true);
    this.errorCobro.set(null);

    this.planesService
      .registrarPagoCuota(cuota.id, datos, this.claveIdempotenciaCuota)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardandoCobro.set(false);
          this.claveIdempotenciaCuota = null;
          this.cuotaCobro.set(null);
          this.recargarPlan();
        },
        error: (error: unknown) => {
          this.guardandoCobro.set(false);
          this.errorCobro.set(mensajeErrorPlanes(error, 'registrar el cobro de la cuota'));
          const estado = (error as { status?: number } | null)?.status;
          if (estado === 400 || estado === 409 || estado === 422) {
            this.claveIdempotenciaCuota = null;
          }
        },
      });
  }

  // --- Ciclo de vida ------------------------------------------------------

  ngOnInit(): void {
    const parametro = this.route.snapshot.paramMap.get('id');
    const planId = Number(parametro);
    this.planId.set(Number.isInteger(planId) && planId > 0 ? planId : null);
    this.menuService.cargar();
  }
}


