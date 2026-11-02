import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  ConsultaPaciente,
  CuotaPlanCrear,
  MAX_CUOTAS,
  PermisosPlanesCuotas,
  PlanPagoCrear,
  ServicioDisponiblePlan,
  centavosAMonto,
  distribuirCuotas,
  fechaHoyISO,
  formatearFechaLarga,
  formatearFechaTabla,
  formatearMontoCorto,
  formatearMontoPlan,
  generarClaveIdempotencia,
  inicialesPaciente,
  mensajeErrorPlanes,
  montoACentavos,
  normalizarTexto,
  permisosPlanesCuotas,
  sinPermisosPlanesCuotas,
  validarCronograma,
} from '../../models/planes-cuotas.models';
import { PlanesPagoService } from '../../services/planes-pago.service';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';

type MotivoSinAcceso =
  | 'menu-error'
  | 'menu-invalido'
  | 'sin-modulo'
  | 'sin-funciones'
  | 'sin-acciones';

/**
 * CU32 — creación de un plan de pago.
 *
 * Flujo real contra el backend: pacientes → consultas del paciente →
 * servicios disponibles de la consulta → cronograma de cuotas → POST
 * `/pagos/planes` con `Idempotency-Key`. Los importes viajan como cadenas
 * decimales y el cronograma se valida con las mismas reglas del backend.
 */
@Component({
  selector: 'app-crear-plan-pago',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './crear-plan-pago.html',
  styleUrl: './crear-plan-pago.css',
})
export class CrearPlanPago implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly motivoSinAcceso = signal<MotivoSinAcceso | null>(null);
  protected readonly permisos = signal<PermisosPlanesCuotas>(sinPermisosPlanesCuotas());

  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly busqueda = signal('');
  protected readonly sugerenciasVisibles = signal(false);
  protected readonly paciente = signal<Paciente | null>(null);

  protected readonly consultas = signal<ConsultaPaciente[]>([]);
  protected readonly cargandoConsultas = signal(false);
  protected readonly errorConsultas = signal<string | null>(null);
  protected readonly origenConsultas = signal<'historial' | 'pagos' | null>(null);
  protected readonly consulta = signal<ConsultaPaciente | null>(null);

  protected readonly servicios = signal<ServicioDisponiblePlan[]>([]);
  protected readonly cargandoServicios = signal(false);
  protected readonly errorServicios = signal<string | null>(null);
  protected readonly seleccion = signal<number[]>([]);

  protected readonly cantidadCuotas = signal(3);
  protected readonly primerVencimiento = signal(fechaHoyISO());
  protected readonly cuotas = signal<CuotaPlanCrear[]>([]);
  protected readonly refrescoCronograma = signal(0);
  protected readonly observaciones = signal('');

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  private claveIdempotencia: string | null = null;

  protected readonly monto = formatearMontoPlan;
  protected readonly montoCorto = formatearMontoCorto;
  protected readonly fechaTabla = formatearFechaTabla;
  protected readonly fechaLarga = formatearFechaLarga;
  protected readonly maxCuotas = MAX_CUOTAS;

  private readonly menuService = inject(MenuService);
  private readonly pacientesService = inject(PacientesService);
  private readonly planesService = inject(PlanesPagoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private pacientesSolicitados = false;

  protected readonly sinEmpresaTenant = !this.authService.tenantCode();

  protected readonly sugerencias = computed(() => {
    const termino = normalizarTexto(this.busqueda());
    if (termino.length < 2) {
      return [];
    }
    return this.pacientes()
      .filter((item) => {
        const nombre = normalizarTexto(`${item.nombres} ${item.apellidos}`);
        return nombre.includes(termino) || normalizarTexto(item.ci).includes(termino);
      })
      .slice(0, 6);
  });

  protected readonly serviciosSeleccionados = computed(() => {
    const ids = new Set(this.seleccion());
    return this.servicios().filter((servicio) => ids.has(servicio.servicio_realizado_id));
  });

  /** Total a financiar en centavos exactos a partir del saldo disponible. */
  protected readonly totalCentavos = computed(() =>
    this.serviciosSeleccionados().reduce(
      (total, servicio) => total + montoACentavos(servicio.saldo_disponible),
      0,
    ),
  );

  protected readonly totalFinanciado = computed(() => centavosAMonto(this.totalCentavos()));

  protected readonly validacion = computed(() =>
    validarCronograma(this.cuotas(), this.totalFinanciado()),
  );

  protected readonly puedeGuardar = computed(
    () =>
      this.estadoPermiso() === 'autorizado' &&
      this.permisos().escribirPlanes &&
      !!this.paciente() &&
      !!this.consulta() &&
      this.serviciosSeleccionados().length > 0 &&
      this.validacion().valido &&
      !this.guardando(),
  );

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
        return 'Tu rol no puede crear planes de pago';
      default:
        return 'Estado de permisos sin determinar';
    }
  });

  protected readonly detalleSinAcceso = computed(() => {
    switch (this.motivoSinAcceso()) {
      case 'menu-error':
        return 'El servicio de menú no respondió, así que no se pudo comprobar el acceso. Vuelve a intentarlo; no se envió ningún dato.';
      case 'menu-invalido':
        return 'El menú recibido no es una lista de módulos con funciones. Vuelve a intentarlo; no se envió ningún dato.';
      case 'sin-modulo':
        return this.sinEmpresaTenant
          ? 'Tu sesión no tiene una empresa (tenant) asociada, por lo que el menú no incluye las funciones de planes de pago. Inicia sesión con tu empresa para habilitarlas.'
          : 'El menú de tu empresa no incluye el módulo «Pagos»: las funciones de planes y cuotas aún no están sincronizadas. Pide a administración que las habilite.';
      case 'sin-funciones':
        return 'El módulo «Pagos» existe en el menú pero sin funciones asociadas: no es posible verificar el permiso de escritura para crear planes.';
      case 'sin-acciones':
        return 'No hay acciones de lectura ni de escritura sobre «Gestionar planes de pago». Solicita a administración revisar los roles de tu usuario.';
      default:
        return 'No se pudo determinar el estado de tus permisos. Vuelve a comprobarlo en unos segundos.';
    }
  });

  /** Recalcula el cronograma cuando cambian el total, la cantidad o la fecha. */
  private readonly generarCronograma = effect(() => {
    const total = this.totalFinanciado();
    const cantidad = this.cantidadCuotas();
    const primera = this.primerVencimiento();
    // `refrescoCronograma` permite volver a la propuesta automática tras ediciones manuales.
    void this.refrescoCronograma();
    this.cuotas.set(
      this.totalCentavos() > 0 ? distribuirCuotas(total, cantidad, primera) : [],
    );
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

    if (!permisos.verPlanes || !permisos.escribirPlanes) {
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
  });

  ngOnInit(): void {
    this.menuService.cargar();
  }

  // --- Interacción --------------------------------------------------------

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected reintentarMenu(): void {
    this.menuService.reintentar();
  }

  protected volver(): void {
    void this.router.navigate(['/pagos/planes']);
  }

  protected iniciales(paciente: Paciente): string {
    return inicialesPaciente(paciente.nombres, paciente.apellidos);
  }

  protected escribirBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.sugerenciasVisibles.set(valor.trim().length >= 2);
  }

  protected cerrarSugerencias(): void {
    this.sugerenciasVisibles.set(false);
  }

  protected elegirPaciente(paciente: Paciente): void {
    this.paciente.set(paciente);
    this.busqueda.set(`${paciente.nombres} ${paciente.apellidos}`);
    this.sugerenciasVisibles.set(false);
    this.consulta.set(null);
    this.servicios.set([]);
    this.seleccion.set([]);
    this.cargarConsultas(paciente.id);
  }

  protected quitarPaciente(): void {
    this.paciente.set(null);
    this.busqueda.set('');
    this.consultas.set([]);
    this.consulta.set(null);
    this.servicios.set([]);
    this.seleccion.set([]);
    this.origenConsultas.set(null);
    this.errorConsultas.set(null);
    this.errorServicios.set(null);
  }

  protected elegirConsulta(valor: string): void {
    const consulta = this.consultas().find((item) => item.id === Number(valor)) ?? null;
    this.consulta.set(consulta);
    this.servicios.set([]);
    this.seleccion.set([]);
    this.errorServicios.set(null);

    const paciente = this.paciente();
    if (paciente && consulta) {
      this.cargarServicios(paciente.id, consulta.id);
    }
  }

  protected estaSeleccionado(servicioId: number): boolean {
    return this.seleccion().includes(servicioId);
  }

  protected alternarServicio(servicio: ServicioDisponiblePlan): void {
    if (!servicio.disponible) {
      return;
    }
    this.seleccion.update((ids) =>
      ids.includes(servicio.servicio_realizado_id)
        ? ids.filter((id) => id !== servicio.servicio_realizado_id)
        : [...ids, servicio.servicio_realizado_id],
    );
  }

  protected cambiarCantidad(valor: string): void {
    const numero = Number.parseInt(valor, 10);
    this.cantidadCuotas.set(
      Number.isFinite(numero) ? Math.min(MAX_CUOTAS, Math.max(1, numero)) : 1,
    );
  }

  protected cambiarPrimerVencimiento(valor: string): void {
    this.primerVencimiento.set(valor || fechaHoyISO());
  }

  protected editarMonto(indice: number, valor: string): void {
    const numero = Number.parseFloat((valor ?? '').replace(',', '.'));
    if (!Number.isFinite(numero) || numero <= 0) {
      return;
    }
    this.cuotas.update((cuotas) =>
      cuotas.map((cuota, posicion) =>
        posicion === indice ? { ...cuota, monto_programado: numero.toFixed(2) } : cuota,
      ),
    );
  }

  protected editarFecha(indice: number, valor: string): void {
    if (!valor) {
      return;
    }
    this.cuotas.update((cuotas) =>
      cuotas.map((cuota, posicion) =>
        posicion === indice ? { ...cuota, fecha_vencimiento: valor } : cuota,
      ),
    );
  }

  protected escribirObservaciones(valor: string): void {
    this.observaciones.set(valor);
  }

  /** Vuelve a proponer cuotas iguales descartando los ajustes manuales. */
  protected restablecerCronograma(): void {
    this.refrescoCronograma.update((valor) => valor + 1);
  }

  protected guardar(): void {
    const paciente = this.paciente();
    const consulta = this.consulta();
    if (!this.puedeGuardar() || !paciente || !consulta) {
      return;
    }

    const datos: PlanPagoCrear = {
      paciente_id: paciente.id,
      consulta_clinica_id: consulta.id,
      servicio_realizado_ids: [...this.seleccion()].sort((a, b) => a - b),
      cuotas: this.cuotas().map((cuota) => ({ ...cuota })),
      observaciones: this.observaciones().trim() || null,
    };

    this.claveIdempotencia ??= generarClaveIdempotencia('plan');
    this.guardando.set(true);
    this.error.set(null);

    this.planesService
      .crearPlan(datos, this.claveIdempotencia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plan) => {
          this.guardando.set(false);
          this.claveIdempotencia = null;
          void this.router.navigate(['/pagos/planes', plan.id]);
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeErrorPlanes(error, 'crear el plan de pago'));
          // Un 400/422 es un rechazo de validación: la clave puede descartarse.
          const estado = (error as { status?: number } | null)?.status;
          if (estado === 400 || estado === 422) {
            this.claveIdempotencia = null;
          }
        },
      });
  }

  // --- Cargas -------------------------------------------------------------

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

  private cargarConsultas(pacienteId: number): void {
    this.cargandoConsultas.set(true);
    this.errorConsultas.set(null);
    this.consultas.set([]);

    this.planesService
      .listarConsultasPaciente(pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.consultas.set(resultado.consultas ?? []);
          this.origenConsultas.set(resultado.origen);
          this.cargandoConsultas.set(false);
        },
        error: (error: unknown) => {
          this.consultas.set([]);
          this.cargandoConsultas.set(false);
          this.errorConsultas.set(mensajeErrorPlanes(error, 'consultar las consultas del paciente'));
        },
      });
  }

  private cargarServicios(pacienteId: number, consultaClinicaId: number): void {
    this.cargandoServicios.set(true);
    this.errorServicios.set(null);

    this.planesService
      .listarServiciosDisponibles(pacienteId, consultaClinicaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.servicios.set(respuesta.servicios ?? []);
          this.cargandoServicios.set(false);
        },
        error: (error: unknown) => {
          this.servicios.set([]);
          this.cargandoServicios.set(false);
          this.errorServicios.set(
            mensajeErrorPlanes(error, 'consultar los servicios disponibles de la consulta'),
          );
        },
      });
  }

  private bloquear(motivo: MotivoSinAcceso): void {
    this.estadoPermiso.set(
      motivo === 'menu-error' || motivo === 'menu-invalido' ? 'error' : 'denegado',
    );
    this.motivoSinAcceso.set(motivo);
    this.permisos.set(sinPermisosPlanesCuotas());
  }
}
