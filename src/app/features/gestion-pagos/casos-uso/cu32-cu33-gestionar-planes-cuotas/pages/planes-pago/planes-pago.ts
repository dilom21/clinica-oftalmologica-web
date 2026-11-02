import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  EstadoPlan,
  PermisosPlanesCuotas,
  PlanPagoListadoItem,
  PlanPagoRespuesta,
  PlanesPagoPagina,
  cuotasPagadasDePlan,
  etiquetaEstadoCuota,
  etiquetaEstadoPagoCuota,
  etiquetaEstadoPlan,
  etiquetaMetodoCobro,
  formatearFechaLarga,
  formatearFechaTabla,
  formatearMontoCorto,
  formatearMontoPlan,
  inicialesPaciente,
  mensajeErrorPlanes,
  normalizarTexto,
  pagosPendientesPlan,
  permisosPlanesCuotas,
  proximoVencimiento,
  progresoPlan,
  sinPermisosPlanesCuotas,
} from '../../models/planes-cuotas.models';
import { PlanesPagoService } from '../../services/planes-pago.service';

export type PestanaPlanes = 'planes' | 'cuotas' | 'cobros';
export type OrdenPlanes = 'recientes' | 'saldo' | 'paciente';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';

/** Motivo concreto del bloqueo, con el mismo lenguaje que CU31. */
export type MotivoSinAccesoPlanes =
  'menu-error' | 'menu-invalido' | 'sin-modulo' | 'sin-funciones' | 'sin-acciones';

const TAMANO_PAGINA = 10;

/**
 * CU32 — listado de planes de pago con vista rápida (CU33), pestañas de
 * cuotas/cobros derivadas del plan seleccionado y filtros soportados por el
 * backend (`paciente_id`, `estado`, `page`, `page_size`).
 */
@Component({
  selector: 'app-planes-pago',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './planes-pago.html',
  styleUrl: './planes-pago.css',
})
export class PlanesPago implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly motivoSinAcceso = signal<MotivoSinAccesoPlanes | null>(null);
  protected readonly permisos = signal<PermisosPlanesCuotas>(sinPermisosPlanesCuotas());

  protected readonly pestana = signal<PestanaPlanes>('planes');
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly planes = signal<PlanPagoListadoItem[]>([]);
  protected readonly pagina = signal<PlanesPagoPagina | null>(null);
  protected readonly paginaActual = signal(1);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actualizando = signal(false);

  protected readonly busqueda = signal('');
  protected readonly sugerenciasVisibles = signal(false);
  protected readonly pacienteFiltro = signal<Paciente | null>(null);
  protected readonly estadoFiltro = signal<EstadoPlan | ''>('');
  protected readonly orden = signal<OrdenPlanes>('recientes');
  protected readonly soloVencidas = signal(false);
  protected readonly filtrosAbiertos = signal(false);

  protected readonly planSeleccionado = signal<PlanPagoRespuesta | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly errorDetalle = signal<string | null>(null);
  protected readonly planSeleccionadoId = signal<number | null>(null);

  protected readonly estados = ['ACTIVO', 'COMPLETADO', 'CANCELADO'] as const;
  protected readonly monto = formatearMontoPlan;
  protected readonly montoCorto = formatearMontoCorto;
  protected readonly fechaTabla = formatearFechaTabla;
  protected readonly fechaLarga = formatearFechaLarga;
  protected readonly estadoPlan = etiquetaEstadoPlan;
  protected readonly estadoCuota = etiquetaEstadoCuota;
  protected readonly estadoPago = etiquetaEstadoPagoCuota;
  protected readonly metodo = etiquetaMetodoCobro;
  protected readonly proximo = proximoVencimiento;
  protected readonly avance = progresoPlan;
  protected readonly pagadas = cuotasPagadasDePlan;
  protected readonly pendientes = pagosPendientesPlan;

  private readonly menuService = inject(MenuService);
  private readonly pacientesService = inject(PacientesService);
  private readonly planesService = inject(PlanesPagoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cacheDetalle = new Map<number, PlanPagoRespuesta>();
  private pacientesSolicitados = false;
  private listadoSolicitado = false;

  protected readonly sinEmpresaTenant = !this.authService.tenantCode();
  protected readonly pacientesPorId = computed(
    () => new Map(this.pacientes().map((paciente) => [paciente.id, paciente])),
  );

  /**
   * Páginas realmente navegables. El backend puede responder
   * `total_pages: 0` cuando no hay planes; en ese caso el pie de paginación se
   * oculta en lugar de mostrar «Página 1 de 0».
   */
  protected readonly totalPaginas = computed(() => {
    const datos = this.pagina();
    return datos && datos.total > 0 ? Math.max(1, datos.total_pages) : 0;
  });

  /** Página visible, siempre dentro del rango 1..totalPaginas. */
  protected readonly paginaVisible = computed(() => {
    const datos = this.pagina();
    const total = this.totalPaginas();
    if (!datos || total === 0) {
      return 0;
    }
    return Math.min(Math.max(1, datos.page), total);
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
        return 'Tu rol no tiene acceso a los planes de pago';
      default:
        return 'Estado de permisos sin determinar';
    }
  });

  protected readonly detalleSinAcceso = computed(() => {
    switch (this.motivoSinAcceso()) {
      case 'menu-error':
        return 'El servicio de menú no respondió, así que no se pudo comprobar el acceso. Vuelve a intentarlo; no se consultó ningún plan de pago.';
      case 'menu-invalido':
        return 'El menú recibido no es una lista de módulos con funciones. Vuelve a intentarlo; no se consultó ningún plan de pago.';
      case 'sin-modulo':
        return this.sinEmpresaTenant
          ? 'Tu sesión no tiene una empresa (tenant) asociada, por lo que el menú proviene de un acceso anterior y no incluye las funciones de planes de pago. Inicia sesión con tu empresa para habilitarlas.'
          : 'El menú de tu empresa no incluye el módulo «Pagos»: las funciones de planes y cuotas aún no están sincronizadas para esta empresa. Pide a administración que las habilite.';
      case 'sin-funciones':
        return 'El módulo «Pagos» existe en el menú de tu empresa pero sin funciones asociadas: no es posible verificar los permisos de lectura ni de escritura sobre planes y cuotas.';
      case 'sin-acciones':
        return 'No hay acciones de lectura ni de escritura sobre «Gestionar planes de pago». Solicita a administración revisar los roles de tu usuario; esta pantalla no modifica permisos.';
      default:
        return 'No se pudo determinar el estado de tus permisos. Vuelve a comprobarlo en unos segundos.';
    }
  });

  protected readonly sugerencias = computed(() => {
    const termino = normalizarTexto(this.busqueda());
    if (termino.length < 2 || this.pacienteFiltro()) {
      return [];
    }
    return this.pacientes()
      .filter(
        (paciente) =>
          normalizarTexto(`${paciente.nombres} ${paciente.apellidos}`).includes(termino) ||
          normalizarTexto(paciente.ci).includes(termino),
      )
      .slice(0, 6);
  });

  protected readonly resumen = computed(() => {
    const items = this.planes();
    const saldoCentavos = items.reduce(
      (total, plan) => total + Math.round(Number(plan.saldo_pendiente || 0) * 100),
      0,
    );
    return {
      total: items.length,
      activos: items.filter((plan) => plan.estado === 'ACTIVO').length,
      completados: items.filter((plan) => plan.estado === 'COMPLETADO').length,
      cancelados: items.filter((plan) => plan.estado === 'CANCELADO').length,
      saldo: (saldoCentavos / 100).toFixed(2),
      conSaldo: items.filter((plan) => Number(plan.saldo_pendiente) > 0).length,
      vencidas: items.filter((plan) => plan.tiene_cuotas_vencidas).length,
    };
  });

  protected readonly planesVisibles = computed(() => {
    const filtro = this.orden();
    const visibles = this.planes().filter(
      (plan) => !this.soloVencidas() || plan.tiene_cuotas_vencidas,
    );

    return [...visibles].sort((a, b) => {
      if (filtro === 'saldo') {
        return Number(b.saldo_pendiente) - Number(a.saldo_pendiente);
      }
      if (filtro === 'paciente') {
        return this.nombrePaciente(a.paciente_id).localeCompare(
          this.nombrePaciente(b.paciente_id),
        );
      }
      return b.fecha_creacion.localeCompare(a.fecha_creacion);
    });
  });

  protected readonly proximaCuota = computed(() => {
    const plan = this.planSeleccionado();
    return plan ? proximoVencimiento(plan) : null;
  });

  protected readonly cobrosPendientes = computed(() => {
    const plan = this.planSeleccionado();
    return plan ? pagosPendientesPlan(plan) : [];
  });

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

    if (!permisos.verPlanes) {
      const moduloPagos = modulos.find((modulo) => normalizarTexto(modulo?.nombre) === 'pagos');
      const funcionesPagos =
        moduloPagos && Array.isArray(moduloPagos.funciones) ? moduloPagos.funciones : [];
      this.bloquear(
        !moduloPagos ? 'sin-modulo' : funcionesPagos.length === 0 ? 'sin-funciones' : 'sin-acciones',
      );
      return;
    }

    this.estadoPermiso.set('autorizado');
    this.motivoSinAcceso.set(null);
    this.cargarPacientes();
    // La carga inicial se dispara una sola vez y fuera del grafo reactivo:
    // `cargarPlanes` lee los filtros, así que dentro del effect se repetiría
    // con cada cambio de búsqueda además del que dispara la propia UI.
    if (!this.listadoSolicitado) {
      this.listadoSolicitado = true;
      untracked(() => this.cargarPlanes(1));
    }
  });

  ngOnInit(): void {
    this.menuService.cargar();
  }

  protected seleccionarPestana(pestana: PestanaPlanes): void {
    this.pestana.set(pestana);
  }

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected reintentarMenu(): void {
    this.menuService.reintentar();
  }

  protected reintentar(): void {
    this.cargarPlanes(this.paginaActual());
  }

  protected actualizar(): void {
    this.cacheDetalle.clear();
    this.cargarPlanes(this.paginaActual());
  }

  protected irANuevoPlan(): void {
    if (!this.permisos().escribirPlanes) {
      return;
    }
    void this.router.navigate(['/pagos/planes/nuevo']);
  }

  protected abrirPlan(planId: number): void {
    void this.router.navigate(['/pagos/planes', planId]);
  }

  protected cambiarEstado(valor: string): void {
    this.estadoFiltro.set(
      valor === 'ACTIVO' || valor === 'COMPLETADO' || valor === 'CANCELADO' ? valor : '',
    );
    this.cargarPlanes(1);
  }

  protected cambiarOrden(valor: string): void {
    this.orden.set(valor === 'saldo' || valor === 'paciente' ? valor : 'recientes');
  }

  protected alternarFiltros(): void {
    this.filtrosAbiertos.update((abierto) => !abierto);
  }

  protected alternarSoloVencidas(): void {
    this.soloVencidas.update((valor) => !valor);
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.pacienteFiltro.set(null);
    this.estadoFiltro.set('');
    this.orden.set('recientes');
    this.soloVencidas.set(false);
    this.cargarPlanes(1);
  }

  protected escribirBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.pacienteFiltro.set(null);
    this.sugerenciasVisibles.set(valor.trim().length >= 2);
  }

  protected elegirPaciente(paciente: Paciente): void {
    this.pacienteFiltro.set(paciente);
    this.busqueda.set(this.nombrePaciente(paciente.id));
    this.sugerenciasVisibles.set(false);
    this.cargarPlanes(1);
  }

  protected cerrarSugerencias(): void {
    this.sugerenciasVisibles.set(false);
  }

  protected cambiarPagina(pagina: number): void {
    const datos = this.pagina();
    if (!datos) {
      return;
    }
    const destino = Math.min(Math.max(1, pagina), Math.max(1, datos.total_pages));
    if (destino !== this.paginaActual()) {
      this.cargarPlanes(destino);
    }
  }

  protected seleccionarPlan(plan: PlanPagoListadoItem): void {
    if (this.planSeleccionadoId() === plan.id) {
      return;
    }
    this.planSeleccionadoId.set(plan.id);
    const cache = this.cacheDetalle.get(plan.id);
    if (cache) {
      this.planSeleccionado.set(cache);
      this.errorDetalle.set(null);
      return;
    }
    this.cargarDetalle(plan.id);
  }

  protected nombrePaciente(pacienteId: number): string {
    const paciente = this.pacientesPorId().get(pacienteId);
    return paciente ? `${paciente.nombres} ${paciente.apellidos}` : `Paciente #${pacienteId}`;
  }

  protected iniciales(pacienteId: number): string {
    const paciente = this.pacientesPorId().get(pacienteId);
    return paciente ? inicialesPaciente(paciente.nombres, paciente.apellidos) : '··';
  }

  protected ciPaciente(pacienteId: number): string {
    return this.pacientesPorId().get(pacienteId)?.ci ?? '—';
  }

  private cargarPlanes(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.planesService
      .listarPlanes({
        paciente_id: this.pacienteFiltro()?.id ?? null,
        estado: this.estadoFiltro() || null,
        page: pagina,
        page_size: TAMANO_PAGINA,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.planes.set(respuesta?.items ?? []);
          this.pagina.set(respuesta);
          this.paginaActual.set(respuesta?.page ?? pagina);
          this.cargando.set(false);
          this.seleccionarPlanPorDefecto();
        },
        error: (error: unknown) => {
          this.planes.set([]);
          this.pagina.set(null);
          this.cargando.set(false);
          this.error.set(mensajeErrorPlanes(error, 'cargar los planes de pago'));
        },
      });
  }

  private seleccionarPlanPorDefecto(): void {
    const items = this.planes();
    const actual = this.planSeleccionadoId();
    const siguiente = items.find((plan) => plan.id === actual) ?? items[0];
    if (!siguiente) {
      this.planSeleccionadoId.set(null);
      this.planSeleccionado.set(null);
      return;
    }
    this.planSeleccionadoId.set(siguiente.id);
    const cache = this.cacheDetalle.get(siguiente.id);
    if (cache) {
      this.planSeleccionado.set(cache);
      return;
    }
    this.cargarDetalle(siguiente.id);
  }

  private cargarDetalle(planId: number): void {
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);

    this.planesService
      .obtenerPlan(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.cacheDetalle.set(plan.id, plan);
          if (this.planSeleccionadoId() === plan.id) {
            this.planSeleccionado.set(plan);
          }
          this.cargandoDetalle.set(false);
        },
        error: (error: unknown) => {
          this.cargandoDetalle.set(false);
          this.planSeleccionado.set(null);
          this.errorDetalle.set(mensajeErrorPlanes(error, 'consultar el plan seleccionado'));
        },
      });
  }

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

  private bloquear(motivo: MotivoSinAccesoPlanes): void {
    this.estadoPermiso.set(
      motivo === 'menu-error' || motivo === 'menu-invalido' ? 'error' : 'denegado',
    );
    this.motivoSinAcceso.set(motivo);
    this.permisos.set(sinPermisosPlanesCuotas());
  }
}


