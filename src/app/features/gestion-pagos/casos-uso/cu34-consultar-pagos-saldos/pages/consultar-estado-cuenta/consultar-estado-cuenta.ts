import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { DetallePago } from '../../../cu31-registrar-pago-comprobante/components/detalle-pago/detalle-pago';
import {
  EstadoPago,
  FiltrosPagos,
  MetodoPagoRegistrado,
  PagoAdministrativo,
  PermisosPagos,
  ESTADOS_PAGO,
  METODOS_FILTRO,
  etiquetaEstadoPago,
  etiquetaMetodoPago,
  fechaFinIso,
  fechaInicioIso,
  formatearFecha,
  formatearMonto,
  normalizarTexto,
  permisosPagos,
  referenciaPago,
} from '../../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../../cu31-registrar-pago-comprobante/services/pagos-administrativos.service';
import {
  formatearFechaTabla,
  permisosPlanesCuotas,
} from '../../../cu32-cu33-gestionar-planes-cuotas/models/planes-cuotas.models';
import {
  EstadoCuentaRespuesta,
  PlanEstadoCuenta,
  ServicioEstadoCuenta,
} from '../../models/estado-cuenta.models';
import { EstadoCuentaService } from '../../services/estado-cuenta.service';
import { IconoCuenta } from '../../components/icono-cuenta';
import { IndicadoresCuenta } from '../../components/indicadores-cuenta';
import { ComposicionSaldo } from '../../components/composicion-saldo';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';
type PestanaCuenta = 'resumen' | 'servicios' | 'planes' | 'historial' | 'pendientes';
type FiltroServicios = 'todos' | 'financiados' | 'no-financiados' | 'con-saldo' | 'sin-saldo';
const SIN_PAGOS: PermisosPagos = { ver: false, registrar: false, confirmar: false };

@Component({
  selector: 'app-consultar-estado-cuenta',
  standalone: true,
  imports: [CommonModule, Sidebar, DetallePago, IconoCuenta, IndicadoresCuenta, ComposicionSaldo],
  templateUrl: './consultar-estado-cuenta.html',
  styleUrl: './consultar-estado-cuenta.css',
})
export class ConsultarEstadoCuenta implements OnInit {
  private readonly menu = inject(MenuService);
  private readonly auth = inject(AuthService);
  private readonly pacientesApi = inject(PacientesService);
  private readonly api = inject(EstadoCuentaService);
  private readonly pagosApi = inject(PagosAdministrativosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly permiso = signal<EstadoPermiso>('verificando');
  protected readonly permisosPagos = signal<PermisosPagos>(SIN_PAGOS);
  protected readonly puedeConsultar = signal(false);
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly cuenta = signal<EstadoCuentaRespuesta | null>(null);
  protected readonly termino = signal('');
  protected readonly mostrarResultados = signal(false);
  protected readonly cargandoPacientes = signal(false);
  protected readonly errorPacientes = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cargandoHistorial = signal(false);
  protected readonly historialError = signal<string | null>(null);
  protected readonly paginaHistorial = signal(1);
  protected readonly tamanoHistorial = signal(5);
  protected readonly pagos = signal<PagoAdministrativo[]>([]);
  protected readonly pagoSeleccionado = signal<PagoAdministrativo | null>(null);
  protected readonly totalPagos = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly filtroDesde = signal('');
  protected readonly filtroHasta = signal('');
  protected readonly filtroMetodo = signal<MetodoPagoRegistrado | ''>('');
  protected readonly filtroEstado = signal<EstadoPago | ''>('');
  protected readonly errorFiltros = signal<string | null>(null);
  protected readonly estadosPago = ESTADOS_PAGO;
  protected readonly metodosPago = METODOS_FILTRO;
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly pestana = signal<PestanaCuenta>('resumen');
  protected readonly pestanas: ReadonlyArray<{ id: PestanaCuenta; nombre: string; icono: string }> =
    [
      { id: 'resumen', nombre: 'Resumen', icono: 'resumen' },
      { id: 'servicios', nombre: 'Servicios', icono: 'servicios' },
      { id: 'planes', nombre: 'Planes y cuotas', icono: 'planes' },
      { id: 'historial', nombre: 'Historial', icono: 'tarjeta' },
      { id: 'pendientes', nombre: 'Pendientes', icono: 'pendientes' },
    ];
  protected readonly servicioSeleccionado = signal<number | null>(null);
  protected readonly planSeleccionadoId = signal<number | null>(null);
  protected readonly filtroServicios = signal<FiltroServicios>('todos');
  protected readonly ordenServicios = signal<'reciente' | 'antigua'>('reciente');
  protected readonly serviciosOrdenados = computed(() =>
    this.ordenarServicios(this.cuenta()?.servicios ?? [], this.ordenServicios()),
  );
  protected readonly serviciosRecientes = computed(() =>
    this.ordenarServicios(this.cuenta()?.servicios ?? [], 'reciente').slice(0, 3),
  );
  protected readonly serviciosFiltrados = computed(() =>
    this.serviciosOrdenados().filter((s) => {
      switch (this.filtroServicios()) {
        case 'financiados':
          return s.financiado;
        case 'no-financiados':
          return !s.financiado;
        case 'con-saldo':
          return Number(s.saldo_pendiente) > 0;
        case 'sin-saldo':
          return Number(s.saldo_pendiente) === 0;
        default:
          return true;
      }
    }),
  );
  protected readonly planSeleccionado = computed(
    () => this.cuenta()?.planes_pago.find((p) => p.id === this.planSeleccionadoId()) ?? null,
  );
  protected readonly sugerencias = computed(() => {
    const q = normalizarTexto(this.termino());
    return q.length < 2
      ? []
      : this.pacientes()
          .filter(
            (p) =>
              p.estado &&
              normalizarTexto(`${p.nombres ?? ''} ${p.apellidos ?? ''} ${p.ci ?? ''}`).includes(q),
          )
          .slice(0, 8);
  });
  protected readonly monto = formatearMonto;
  protected readonly fecha = (value: string | null | undefined) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? formatearFechaTabla(value) : formatearFecha(value);
  protected readonly referencia = referenciaPago;
  protected readonly estadoPago = etiquetaEstadoPago;
  protected readonly metodoPago = etiquetaMetodoPago;

  protected seleccionarPestana(id: PestanaCuenta): void {
    this.pestana.set(id);
  }
  protected navegarPestana(event: KeyboardEvent, indice: number): void {
    const direcciones: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    const delta = direcciones[event.key];
    if (delta === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const siguiente =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? this.pestanas.length - 1
          : (indice + delta + this.pestanas.length) % this.pestanas.length;
    this.seleccionarPestana(this.pestanas[siguiente].id);
    const tablist = (event.currentTarget as HTMLElement).parentElement;
    tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[siguiente]?.focus();
  }
  protected alternarServicio(id: number): void {
    this.servicioSeleccionado.update((actual) => (actual === id ? null : id));
  }
  protected verPlan(id: number): void {
    this.planSeleccionadoId.set(id);
    this.pestana.set('planes');
  }
  protected filtrarServicios(event: Event): void {
    this.filtroServicios.set((event.target as HTMLSelectElement).value as FiltroServicios);
    this.servicioSeleccionado.set(null);
  }
  protected ordenarListado(event: Event): void {
    this.ordenServicios.set((event.target as HTMLSelectElement).value as 'reciente' | 'antigua');
  }
  protected cuotasPagadas(plan: PlanEstadoCuenta): number {
    return plan.cuotas.filter((q) => q.estado === 'PAGADA').length;
  }
  protected iniciales(p: Paciente): string {
    return `${p.nombres?.slice(0, 1) ?? ''}${p.apellidos?.slice(0, 1) ?? ''}`.toUpperCase();
  }
  protected iconoMetodo(metodo: string): string {
    return (
      (
        {
          EFECTIVO: 'efectivo',
          TARJETA: 'tarjeta',
          TRANSFERENCIA: 'transferencia',
          QR: 'qr',
        } as Record<string, string>
      )[metodo] ?? 'tarjeta'
    );
  }
  protected claseEstado(estado: string): string {
    return ['APROBADO', 'COMPLETADO', 'PAGADA'].includes(estado)
      ? 'badge-green'
      : ['VENCIDA', 'RECHAZADO', 'FALLIDO'].includes(estado)
        ? 'badge-red'
        : ['CANCELADO', 'CANCELADA', 'ANULADO', 'REEMBOLSADO'].includes(estado)
          ? ''
          : 'badge-blue';
  }
  private ordenarServicios(
    servicios: ServicioEstadoCuenta[],
    orden: 'reciente' | 'antigua',
  ): ServicioEstadoCuenta[] {
    return [...servicios].sort((a, b) => {
      const fechaA = a.fecha_realizacion ? Date.parse(a.fecha_realizacion) : NaN;
      const fechaB = b.fecha_realizacion ? Date.parse(b.fecha_realizacion) : NaN;
      if (!Number.isFinite(fechaA)) return Number.isFinite(fechaB) ? 1 : 0;
      if (!Number.isFinite(fechaB)) return -1;
      return orden === 'reciente' ? fechaB - fechaA : fechaA - fechaB;
    });
  }
  private reiniciarVista(): void {
    this.pestana.set('resumen');
    this.servicioSeleccionado.set(null);
    this.planSeleccionadoId.set(null);
    this.filtroServicios.set('todos');
    this.ordenServicios.set('reciente');
    this.pagoSeleccionado.set(null);
    this.totalPaginas.set(0);
    this.tamanoHistorial.set(5);
    this.reiniciarFiltrosHistorial();
  }

  private pacientesCargados = false;
  private contextoSesion: string | null = null;
  private secuencia = 0;
  private cuentaSub?: import('rxjs').Subscription;
  private historialSub?: import('rxjs').Subscription;
  private pacientesSub?: import('rxjs').Subscription;
  private readonly resolverPermisos = effect(() => {
    this.auth.revisionSesion();
    this.menu.sincronizarSesion();
    const contexto = this.claveSesion();
    if (this.contextoSesion !== null && contexto !== this.contextoSesion)
      untracked(() => this.limpiarDatos());
    this.contextoSesion = contexto;
    const estado = this.menu.estado();
    if (estado !== 'listo') {
      this.limpiarDatos();
      this.permiso.set(estado === 'error' ? 'error' : 'verificando');
      this.puedeConsultar.set(false);
      this.permisosPagos.set(SIN_PAGOS);
      return;
    }
    const modulos = this.menu.modulos();
    const funciones = Array.isArray(modulos)
      ? modulos.flatMap((m) => (Array.isArray(m?.funciones) ? m.funciones : []))
      : [];
    const pagos = permisosPagos(funciones);
    const planes = permisosPlanesCuotas(funciones);
    const allowed = !!this.auth.tenantCode() && pagos.ver && planes.verPlanes && planes.verCuotas;
    this.permisosPagos.set(allowed ? pagos : SIN_PAGOS);
    this.puedeConsultar.set(allowed);
    this.permiso.set(allowed ? 'autorizado' : 'denegado');
    if (!allowed) {
      this.limpiarDatos();
      return;
    }
    if (!this.pacientesCargados) untracked(() => this.cargarPacientes());
  });

  ngOnInit(): void {
    this.menu.cargar();
  }
  protected reintentarMenu(): void {
    this.menu.reintentar();
  }
  protected reintentarPacientes(): void {
    if (this.puedeConsultar()) this.cargarPacientes();
  }
  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((v) => !v);
  }
  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }
  protected buscar(value: string): void {
    this.termino.set(value);
    this.mostrarResultados.set(true);
  }
  protected seleccionar(p: Paciente): void {
    this.cuentaSub?.unsubscribe();
    this.historialSub?.unsubscribe();
    ++this.secuencia;
    this.paciente.set(p);
    this.termino.set('');
    this.mostrarResultados.set(false);
    this.cuenta.set(null);
    this.pagos.set([]);
    this.pagoSeleccionado.set(null);
    this.error.set(null);
    this.historialError.set(null);
    this.reiniciarVista();
    this.cargarCuenta();
  }
  protected cambiarPaciente(): void {
    ++this.secuencia;
    this.cuentaSub?.unsubscribe();
    this.historialSub?.unsubscribe();
    this.paciente.set(null);
    this.cuenta.set(null);
    this.pagos.set([]);
    this.pagoSeleccionado.set(null);
    this.totalPagos.set(0);
    this.error.set(null);
    this.historialError.set(null);
    this.termino.set('');
    this.mostrarResultados.set(false);
    this.reiniciarVista();
    this.cargando.set(false);
    this.cargandoHistorial.set(false);
  }
  protected actualizar(): void {
    if (this.paciente()) this.cargarCuenta();
  }
  protected cargarCuenta(): void {
    const paciente = this.paciente();
    if (!paciente || !this.puedeConsultar()) return;
    const gen = ++this.secuencia;
    this.cuentaSub?.unsubscribe();
    this.historialSub?.unsubscribe();
    const sesion = this.claveSesion();
    this.cuenta.set(null);
    this.pagos.set([]);
    this.pagoSeleccionado.set(null);
    this.servicioSeleccionado.set(null);
    this.planSeleccionadoId.set(null);
    this.totalPagos.set(0);
    this.error.set(null);
    this.cargando.set(true);
    this.cargandoHistorial.set(true);
    this.paginaHistorial.set(1);
    this.errorFiltros.set(null);
    this.cuentaSub = this.api
      .consultar(paciente.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (
            gen !== this.secuencia ||
            sesion !== this.claveSesion() ||
            this.paciente()?.id !== paciente.id
          )
            return;
          this.cuenta.set(data);
          this.cargando.set(false);
        },
        error: (err) => {
          if (gen !== this.secuencia || sesion !== this.claveSesion()) return;
          this.cuenta.set(null);
          this.cargando.set(false);
          this.error.set(this.errorSeguro(err, 'el estado de cuenta'));
          this.invalidarAccesoSiCorresponde(err);
        },
      });
    this.cargarHistorial(paciente.id, gen, 1);
  }
  protected cargarHistorial(
    pacienteId = this.paciente()?.id,
    gen = this.secuencia,
    page = this.paginaHistorial(),
  ): void {
    if (!pacienteId || !this.puedeConsultar()) return;
    const desde = this.filtroDesde() ? fechaInicioIso(this.filtroDesde()) : null;
    const hasta = this.filtroHasta() ? fechaFinIso(this.filtroHasta()) : null;
    if (
      (this.filtroDesde() && !desde) ||
      (this.filtroHasta() && !hasta) ||
      (desde && hasta && desde > hasta)
    ) {
      this.cargandoHistorial.set(false);
      this.errorFiltros.set(
        'Verifica el intervalo: la fecha Desde debe ser anterior o igual a Hasta.',
      );
      return;
    }
    this.errorFiltros.set(null);
    this.historialSub?.unsubscribe();
    this.cargandoHistorial.set(true);
    this.historialError.set(null);
    this.pagoSeleccionado.set(null);
    const sesion = this.claveSesion();
    // El paciente seleccionado es siempre el filtro obligatorio; no se consulta el listado global.
    const filtros: FiltrosPagos = {
      paciente_id: pacienteId,
      desde,
      hasta,
      metodo_pago: this.filtroMetodo() || null,
      estado: this.filtroEstado() || null,
      page,
      page_size: this.tamanoHistorial(),
    };
    this.historialSub = this.pagosApi
      .listarPagos(filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (
            gen !== this.secuencia ||
            sesion !== this.claveSesion() ||
            pacienteId !== this.paciente()?.id
          )
            return;
          this.pagos.set(data.items ?? []);
          this.pagoSeleccionado.set(data.items?.[0] ?? null);
          this.totalPagos.set(data.total);
          this.totalPaginas.set(data.total_pages);
          this.paginaHistorial.set(data.page);
          this.cargandoHistorial.set(false);
        },
        error: (err) => {
          if (gen !== this.secuencia || sesion !== this.claveSesion()) return;
          this.pagos.set([]);
          this.pagoSeleccionado.set(null);
          this.totalPagos.set(0);
          this.cargandoHistorial.set(false);
          this.historialError.set(this.errorSeguro(err, 'el historial de pagos'));
          this.invalidarAccesoSiCorresponde(err);
        },
      });
  }
  protected cambiarPagina(delta: number): void {
    const next = this.paginaHistorial() + delta;
    if (next >= 1 && next <= this.totalPaginas())
      this.cargarHistorial(this.paciente()?.id, this.secuencia, next);
  }
  protected cambiarTamanoHistorial(event: Event): void {
    const tamano = Number((event.target as HTMLSelectElement).value);
    if (![5, 10, 20].includes(tamano)) return;
    this.tamanoHistorial.set(tamano);
    this.aplicarFiltrosHistorial();
  }
  protected aplicarFiltrosHistorial(): void {
    this.paginaHistorial.set(1);
    this.cargarHistorial(this.paciente()?.id, this.secuencia, 1);
  }
  protected limpiarFiltrosHistorial(): void {
    this.reiniciarFiltrosHistorial();
    this.cargarHistorial(this.paciente()?.id, this.secuencia, 1);
  }
  protected actualizarFiltro(event: Event, campo: 'desde' | 'hasta' | 'metodo' | 'estado'): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    if (campo === 'desde') this.filtroDesde.set(value);
    else if (campo === 'hasta') this.filtroHasta.set(value);
    else if (campo === 'metodo') this.filtroMetodo.set(value as MetodoPagoRegistrado | '');
    else this.filtroEstado.set(value as EstadoPago | '');
  }
  protected retryHistorial(): void {
    this.cargarHistorial();
  }
  protected nombrePaciente(p: Paciente): string {
    return `${p.nombres} ${p.apellidos}`.trim();
  }
  protected trackPago(_: number, pago: PagoAdministrativo): number {
    return pago.id;
  }
  private claveSesion(): string {
    return `${this.auth.revisionSesion()}:${this.auth.tenantCode() ?? ''}`;
  }
  private cargarPacientes(): void {
    this.pacientesCargados = true;
    this.cargandoPacientes.set(true);
    this.errorPacientes.set(null);
    const sesion = this.claveSesion();
    this.pacientesSub?.unsubscribe();
    this.pacientesSub = this.pacientesApi
      .listarPacientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          if (sesion !== this.claveSesion() || !this.puedeConsultar()) return;
          this.pacientes.set(p ?? []);
          this.cargandoPacientes.set(false);
        },
        error: (err) => {
          if (sesion !== this.claveSesion()) return;
          this.pacientes.set([]);
          this.cargandoPacientes.set(false);
          this.pacientesCargados = false;
          this.errorPacientes.set(this.errorSeguro(err, 'el listado de pacientes'));
        },
      });
  }
  private limpiarDatos(): void {
    ++this.secuencia;
    this.cuentaSub?.unsubscribe();
    this.historialSub?.unsubscribe();
    this.pacientesSub?.unsubscribe();
    this.cuenta.set(null);
    this.paciente.set(null);
    this.pacientes.set([]);
    this.pacientesCargados = false;
    this.termino.set('');
    this.pagos.set([]);
    this.pagoSeleccionado.set(null);
    this.totalPagos.set(0);
    this.cargando.set(false);
    this.cargandoHistorial.set(false);
    this.cargandoPacientes.set(false);
    this.errorPacientes.set(null);
    this.mostrarResultados.set(false);
    this.reiniciarVista();
  }
  private reiniciarFiltrosHistorial(): void {
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.filtroMetodo.set('');
    this.filtroEstado.set('');
    this.errorFiltros.set(null);
    this.paginaHistorial.set(1);
  }
  private errorSeguro(error: unknown, recurso: string): string {
    const status = error instanceof HttpErrorResponse ? error.status : -1;
    if (status === 0)
      return 'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo nuevamente.';
    if (status === 401) return 'La sesión expiró o no es válida. Inicia sesión nuevamente.';
    if (status === 403) return 'No tienes autorización para consultar esta información.';
    if (status === 404) return 'No se encontró el paciente o el recurso solicitado.';
    if (status === 409)
      return 'El servidor detectó una inconsistencia financiera. Actualiza la consulta o solicita revisión administrativa.';
    if (status === 422)
      return 'La solicitud no es válida. Revisa los filtros e inténtalo nuevamente.';
    if (status >= 500)
      return 'El servidor no pudo completar la consulta. Inténtalo nuevamente más tarde.';
    return `No se pudo cargar ${recurso}. Inténtalo nuevamente.`;
  }
  private invalidarAccesoSiCorresponde(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || (error.status !== 401 && error.status !== 403))
      return;
    this.limpiarDatos();
    this.permisosPagos.set(SIN_PAGOS);
    this.puedeConsultar.set(false);
    this.permiso.set(error.status === 401 ? 'error' : 'denegado');
  }
}
