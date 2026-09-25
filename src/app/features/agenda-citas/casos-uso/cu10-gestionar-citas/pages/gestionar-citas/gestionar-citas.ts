import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { AgendaService } from '../../../cu09-consultar-agenda-disponibilidad/services/agenda.service';
import { OftalmologoAgenda } from '../../../cu09-consultar-agenda-disponibilidad/models/agenda.models';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { CitasService } from '../../services/citas.service';
import {
  CitaMedica,
  ESTADOS_CITA,
  fechaActualInput,
  formatearFechaLargaConDia,
  formatearFechaSelector,
  sumarDias,
} from '../../models/citas.models';
import { CitaForm } from '../../components/cita-form/cita-form';
import { CitasTable } from '../../components/citas-table/citas-table';
import { CitaDetailModal } from '../../components/cita-detail-modal/cita-detail-modal';
import { ReprogramarModal } from '../../components/reprogramar-modal/reprogramar-modal';
import {
  EstadoCitaModal,
  ModoEstadoCitaModal,
} from '../../components/estado-modal/estado-modal';

export type VistaGestionCitas = 'lista' | 'nueva';

interface ErrorCargaDia {
  tipo: 'permiso' | 'error';
  mensaje: string;
}

@Component({
  selector: 'app-gestionar-citas',
  imports: [
    Sidebar,
    CitaForm,
    CitasTable,
    CitaDetailModal,
    ReprogramarModal,
    EstadoCitaModal,
  ],
  templateUrl: './gestionar-citas.html',
  styleUrl: './gestionar-citas.css',
})
export class GestionarCitas implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  // Vista activa: "Lista de citas" o "Nueva cita" (nunca ambas a la vez).
  protected readonly vista = signal<VistaGestionCitas>('lista');

  // Fecha principal del listado.
  protected readonly fechaSeleccionada = signal(fechaActualInput());
  protected readonly calendarioAbierto = signal(false);

  // Citas del día seleccionado (filtradas por fecha en el servidor).
  protected readonly cargandoDia = signal(false);
  protected readonly citasDia = signal<CitaMedica[]>([]);
  protected readonly errorDia = signal<ErrorCargaDia | null>(null);

  // Catálogos: pacientes y oftalmólogos activos (se usan para mostrar nombres).
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly oftalmologos = signal<OftalmologoAgenda[]>([]);
  protected readonly cargandoCatalogos = signal(true);
  protected readonly errorCatalogos = signal<ErrorCargaDia | null>(null);

  // Filtros secundarios (no incluyen fecha: la fecha es el filtro principal).
  protected readonly filtroBusqueda = signal('');
  protected readonly filtroOftalmologo = signal('');
  protected readonly filtroEstado = signal('');

  protected readonly estadosFiltro: readonly string[] = ['', ...ESTADOS_CITA];

  protected readonly hayFiltrosActivos = computed(
    () =>
      this.filtroBusqueda().trim() !== '' ||
      this.filtroOftalmologo() !== '' ||
      this.filtroEstado() !== '',
  );

  protected readonly citasFiltradas = computed(() => {
    const termino = this.filtroBusqueda().trim().toLowerCase();
    const oftalmologoTexto = this.filtroOftalmologo();
    const oftalmologoId = oftalmologoTexto ? Number(oftalmologoTexto) : null;
    const estado = this.filtroEstado();

    return this.citasDia().filter((cita) => {
      if (oftalmologoId !== null && cita.oftalmologo_id !== oftalmologoId) {
        return false;
      }
      if (estado && cita.estado !== estado) {
        return false;
      }
      if (termino) {
        const paciente = this.pacientes().find((p) => p.id === cita.paciente_id);
        const nombre = paciente
          ? `${paciente.nombres} ${paciente.apellidos}`.toLowerCase()
          : '';
        const ci = (paciente?.ci ?? '').toLowerCase();
        if (
          !nombre.includes(termino) &&
          !ci.includes(termino) &&
          !String(cita.id).includes(termino)
        ) {
          return false;
        }
      }
      return true;
    });
  });

  // Tarjetas resumen: siempre representan el total de citas del día.
  protected readonly totalDia = computed(() => this.citasDia().length);
  protected readonly programadasDia = computed(
    () => this.citasDia().filter((c) => c.estado === 'PROGRAMADA').length,
  );
  protected readonly confirmadasDia = computed(
    () => this.citasDia().filter((c) => c.estado === 'CONFIRMADA').length,
  );
  protected readonly canceladasDia = computed(
    () => this.citasDia().filter((c) => c.estado === 'CANCELADA').length,
  );

  // Modales de acciones sobre una cita.
  protected readonly citaEnDetalle = signal<CitaMedica | null>(null);
  protected readonly detalleAbierto = signal(false);

  protected readonly citaReprogramar = signal<CitaMedica | null>(null);
  protected readonly modalReprogramarAbierto = signal(false);

  protected readonly citaEstado = signal<CitaMedica | null>(null);
  protected readonly modoEstado = signal<ModoEstadoCitaModal>('cambiar');
  protected readonly modalEstadoAbierto = signal(false);

  protected readonly toastExito = signal<string | null>(null);
  protected readonly toastError = signal<string | null>(null);

  private readonly agendaService = inject(AgendaService);
  private readonly pacientesService = inject(PacientesService);
  private readonly citasService = inject(CitasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private peticionDiaEnCurso = 0;

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarCitasDelDia();
  }

  // ----------------------------------------------------------------
  // Sidebar / sesión
  // ----------------------------------------------------------------
  alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ----------------------------------------------------------------
  // Cambio de vista (Lista <-> Nueva cita)
  // ----------------------------------------------------------------
  irALista(): void {
    this.vista.set('lista');
    this.cargarCitasDelDia();
  }

  irANuevaCita(): void {
    this.vista.set('nueva');
    this.calendarioAbierto.set(false);
  }

  esVistaLista(): boolean {
    return this.vista() === 'lista';
  }

  // ----------------------------------------------------------------
  // Navegación por fecha
  // ----------------------------------------------------------------
  formatearSelector(): string {
    return formatearFechaSelector(this.fechaSeleccionada());
  }

  formatearDiaConSemana(): string {
    return formatearFechaLargaConDia(this.fechaSeleccionada());
  }

  diaAnterior(): void {
    this.cambiarFecha(sumarDias(this.fechaSeleccionada(), -1));
  }

  diaSiguiente(): void {
    this.cambiarFecha(sumarDias(this.fechaSeleccionada(), 1));
  }

  alternarCalendario(): void {
    this.calendarioAbierto.update((abierto) => !abierto);
  }

  seleccionarFechaDelCalendario(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    if (valor) {
      this.cambiarFecha(valor);
      this.calendarioAbierto.set(false);
    }
  }

  private cambiarFecha(fecha: string): void {
    if (fecha === this.fechaSeleccionada()) {
      return;
    }
    this.fechaSeleccionada.set(fecha);
    this.calendarioAbierto.set(false);
    this.cargarCitasDelDia();
  }

  // ----------------------------------------------------------------
  // Filtros secundarios (la fecha no es un filtro secundario)
  // ----------------------------------------------------------------
  onBuscarPaciente(event: Event): void {
    this.filtroBusqueda.set((event.target as HTMLInputElement).value);
  }

  cambiarFiltroOftalmologo(event: Event): void {
    this.filtroOftalmologo.set((event.target as HTMLSelectElement).value);
  }

  cambiarFiltroEstado(event: Event): void {
    this.filtroEstado.set((event.target as HTMLSelectElement).value);
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroOftalmologo.set('');
    this.filtroEstado.set('');
  }

  // ----------------------------------------------------------------
  // Acciones de fila
  // ----------------------------------------------------------------
  abrirDetalle(cita: CitaMedica): void {
    this.citaEnDetalle.set(cita);
    this.detalleAbierto.set(true);
  }

  cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.citaEnDetalle.set(null);
  }

  reprogramarDesdeDetalle(cita: CitaMedica): void {
    this.cerrarDetalle();
    this.abrirReprogramar(cita);
  }

  abrirReprogramar(cita: CitaMedica): void {
    this.citaReprogramar.set(cita);
    this.modalReprogramarAbierto.set(true);
  }

  cerrarReprogramar(): void {
    this.modalReprogramarAbierto.set(false);
    this.citaReprogramar.set(null);
  }

  alReprogramar(): void {
    this.cerrarReprogramar();
    this.mostrarExito('Cita reprogramada correctamente.');
    this.cargarCitasDelDia();
  }

  abrirCambiarEstado(cita: CitaMedica): void {
    this.citaEstado.set(cita);
    this.modoEstado.set('cambiar');
    this.modalEstadoAbierto.set(true);
  }

  abrirCancelar(cita: CitaMedica): void {
    this.citaEstado.set(cita);
    this.modoEstado.set('cancelar');
    this.modalEstadoAbierto.set(true);
  }

  cerrarEstadoModal(): void {
    this.modalEstadoAbierto.set(false);
    this.citaEstado.set(null);
  }

  alActualizarEstado(): void {
    const modo = this.modoEstado();
    this.cerrarEstadoModal();
    this.mostrarExito(
      modo === 'cancelar' ? 'Cita cancelada correctamente.' : 'Estado de la cita actualizado.',
    );
    this.cargarCitasDelDia();
  }

  confirmarCita(cita: CitaMedica): void {
    this.cambiarEstadoDesdeServidor(cita, 'CONFIRMADA', 'Cita confirmada correctamente.');
  }

  private cambiarEstadoDesdeServidor(
    cita: CitaMedica,
    estado: string,
    mensajeExito: string,
  ): void {
    this.citasService.cambiarEstadoCita(cita.id, estado).subscribe({
      next: () => {
        this.mostrarExito(mensajeExito);
        this.cargarCitasDelDia();
      },
      error: (err: unknown) => {
        this.mostrarError(this.extraerError(err, 'No se pudo actualizar el estado de la cita.'));
      },
    });
  }

  // ----------------------------------------------------------------
  // Registro de nueva cita
  // ----------------------------------------------------------------
  alRegistrarCita(datos: { fecha: string }): void {
    // Al volver al listado se muestra la fecha de la cita recién creada.
    this.limpiarFiltros();
    this.vista.set('lista');
    this.fechaSeleccionada.set(datos.fecha || fechaActualInput());
    this.mostrarExito('Cita registrada correctamente.');
    this.cargarCitasDelDia();
  }

  // ----------------------------------------------------------------
  // Carga de catálogos (pacientes y oftalmólogos)
  // ----------------------------------------------------------------
  reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  reintentarDia(): void {
    this.cargarCitasDelDia();
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);

    forkJoin({
      pacientes: this.pacientesService.listarPacientes(),
      oftalmologos: this.agendaService.listarOftalmologos(),
    }).subscribe({
      next: ({ pacientes, oftalmologos }) => {
        this.pacientes.set(pacientes);
        this.oftalmologos.set(oftalmologos);
        this.cargandoCatalogos.set(false);
      },
      error: (err: unknown) => {
        this.cargandoCatalogos.set(false);
        this.errorCatalogos.set(this.interpretarError(err, 'No se pudieron cargar los datos.'));
      },
    });
  }

  /** Consulta únicamente las citas del día seleccionado (GET /citas?fecha=...). */
  private cargarCitasDelDia(): void {
    const fecha = this.fechaSeleccionada();
    const idPeticion = ++this.peticionDiaEnCurso;

    this.cargandoDia.set(true);
    this.errorDia.set(null);

    this.citasService.listarCitas({ fecha }).subscribe({
      next: (citas) => {
        if (idPeticion !== this.peticionDiaEnCurso) {
          return; // Llegó una respuesta obsoleta de otra fecha.
        }
        this.citasDia.set(citas);
        this.cargandoDia.set(false);
      },
      error: (err: unknown) => {
        if (idPeticion !== this.peticionDiaEnCurso) {
          return;
        }
        this.citasDia.set([]);
        this.cargandoDia.set(false);
        this.errorDia.set(this.interpretarError(err, 'No se pudieron cargar las citas del día.'));
      },
    });
  }

  private interpretarError(err: unknown, mensajeDefault: string): ErrorCargaDia {
    const status = this.leerStatus(err);
    if (status === 403) {
      return {
        tipo: 'permiso',
        mensaje: 'No tienes permisos para gestionar citas médicas.',
      };
    }
    const detalle = this.leerDetalle(err);
    return {
      tipo: 'error',
      mensaje: detalle || mensajeDefault,
    };
  }

  private mostrarExito(mensaje: string): void {
    this.toastExito.set(mensaje);
    setTimeout(() => this.toastExito.set(null), 4000);
  }

  private mostrarError(mensaje: string): void {
    this.toastError.set(mensaje);
    setTimeout(() => this.toastError.set(null), 5000);
  }

  private extraerError(err: unknown, mensajeDefault: string): string {
    const detalle = this.leerDetalle(err);
    if (detalle) {
      return detalle;
    }
    switch (this.leerStatus(err)) {
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para gestionar citas médicas.';
      case 409:
        return 'El horario seleccionado ya no está disponible.';
      case 422:
        return 'Algunos datos enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return mensajeDefault;
    }
  }

  private leerDetalle(err: unknown): string | null {
    const errObj = err as { error?: { detail?: unknown } } | null;
    const detalle = errObj?.error?.detail;
    return typeof detalle === 'string' && detalle.trim() ? detalle : null;
  }

  private leerStatus(err: unknown): number {
    const errObj = err as { status?: unknown } | null;
    return typeof errObj?.status === 'number' ? errObj.status : 0;
  }
}

