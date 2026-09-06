import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ID_ROL_USUARIO } from '../../../../../../features/autenticacion-seguridad/Auth/models/auth.models';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import {
  BloqueoHorario,
  BloqueoHorarioGuardar,
  ConfiguracionDisponibilidad,
  DIAS_SEMANA,
  HorarioOftalmologo,
  HorarioOftalmologoGuardar,
  OftalmologoConfiguracion,
  nombreDiaSemana,
} from '../../models/configuracion-disponibilidad.models';
import { ConfiguracionDisponibilidadService } from '../../services/configuracion-disponibilidad.service';
import { BloqueoModal } from '../../components/bloqueo-modal/bloqueo-modal';
import { EstadoDialog } from '../../components/estado-dialog/estado-dialog';
import { HorarioModal } from '../../components/horario-modal/horario-modal';
import {
  esError401,
  mensajeErrorHttp,
} from '../../utils/errores';

type ConfirmacionEstado =
  | { tipo: 'horario'; horario: HorarioOftalmologo }
  | { tipo: 'bloqueo'; bloqueo: BloqueoHorario };

interface DiaConHorarios {
  dia: number;
  nombre: string;
  horarios: HorarioOftalmologo[];
}

@Component({
  selector: 'app-configurar-disponibilidad',
  imports: [Sidebar, HorarioModal, BloqueoModal, EstadoDialog],
  templateUrl: './configurar-disponibilidad.html',
  styleUrls: [
    './configurar-disponibilidad.css',
    './configurar-disponibilidad-listas.css',
  ],
})
export class ConfigurarDisponibilidad implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  protected readonly rolId = signal<number | null>(null);
  protected readonly esOftalmologo = computed(
    () => this.rolId() === ID_ROL_USUARIO.OFTALMOLOGO,
  );
  protected readonly esAdministrador = computed(
    () => this.rolId() === ID_ROL_USUARIO.ADMINISTRADOR,
  );

  protected readonly oftalmologos = signal<OftalmologoConfiguracion[]>([]);
  protected readonly cargandoOftalmologos = signal(true);
  protected readonly errorOftalmologos = signal<string | null>(null);

  protected readonly oftalmologoSeleccionadoId = signal<number | null>(null);
  protected readonly oftalmologoSeleccionado = computed(() => {
    const id = this.oftalmologoSeleccionadoId();
    if (id === null) {
      return null;
    }
    return this.oftalmologos().find((oftalmologo) => oftalmologo.id === id) ?? null;
  });

  protected readonly cargandoConfiguracion = signal(false);
  protected readonly errorConfiguracion = signal<string | null>(null);
  protected readonly configuracion = signal<ConfiguracionDisponibilidad | null>(null);

  protected readonly modalHorarioAbierto = signal(false);
  protected readonly horarioEnEdicion = signal<HorarioOftalmologo | null>(null);
  protected readonly guardandoHorario = signal(false);
  protected readonly errorHorarioModal = signal<string | null>(null);

  protected readonly modalBloqueoAbierto = signal(false);
  protected readonly bloqueoEnEdicion = signal<BloqueoHorario | null>(null);
  protected readonly guardandoBloqueo = signal(false);
  protected readonly errorBloqueoModal = signal<string | null>(null);

  protected readonly confirmacion = signal<ConfirmacionEstado | null>(null);
  protected readonly procesandoEstado = signal(false);
  protected readonly errorEstadoDialog = signal<string | null>(null);

  protected readonly exito = signal<string | null>(null);

  protected readonly ocupado = computed(
    () =>
      this.guardandoHorario() ||
      this.guardandoBloqueo() ||
      this.procesandoEstado(),
  );

  protected readonly puedeAgregar = computed(
    () =>
      this.oftalmologoSeleccionadoId() !== null &&
      !this.cargandoConfiguracion() &&
      !!this.configuracion() &&
      !this.ocupado(),
  );

  protected readonly diasConHorarios = computed<DiaConHorarios[]>(() => {
    const config = this.configuracion();
    const horarios = config?.horarios ?? [];
    const porDia = new Map<number, HorarioOftalmologo[]>();
    for (const horario of horarios) {
      const lista = porDia.get(horario.dia_semana) ?? [];
      lista.push(horario);
      porDia.set(horario.dia_semana, lista);
    }
    return DIAS_SEMANA.map((dia) => ({
      dia: dia.numero,
      nombre: dia.nombre,
      horarios: porDia.get(dia.numero) ?? [],
    }));
  });

  protected readonly bloqueosOrdenados = computed<BloqueoHorario[]>(() => {
    const bloqueos = [...(this.configuracion()?.bloqueos ?? [])];
    return bloqueos.sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        a.hora_inicio.localeCompare(b.hora_inicio),
    );
  });

  protected readonly horariosActivos = computed(
    () => this.configuracion()?.horarios.filter((h) => h.estado).length ?? 0,
  );
  protected readonly bloqueosActivos = computed(
    () => this.configuracion()?.bloqueos.filter((b) => b.estado).length ?? 0,
  );

  protected readonly esActivacion = computed(() => {
    const confirmacion = this.confirmacion();
    if (!confirmacion) {
      return false;
    }
    return confirmacion.tipo === 'horario'
      ? !confirmacion.horario.estado
      : !confirmacion.bloqueo.estado;
  });

  protected readonly textoAccionConfirmacion = computed(() =>
    this.esActivacion() ? 'Reactivar' : 'Desactivar',
  );

  protected readonly tituloConfirmacion = computed(() => {
    const confirmacion = this.confirmacion();
    if (!confirmacion) {
      return '';
    }
    const accion = this.esActivacion() ? 'Reactivar' : 'Desactivar';
    return confirmacion.tipo === 'horario'
      ? `${accion} horario`
      : `${accion} bloqueo`;
  });

  protected readonly detalleConfirmacion = computed(() => {
    const confirmacion = this.confirmacion();
    if (!confirmacion) {
      return '';
    }
    const reactivar = this.esActivacion();

    if (confirmacion.tipo === 'horario') {
      const horario = confirmacion.horario;
      const dia = nombreDiaSemana(horario.dia_semana);
      const rango = `${dia} de ${this.formatearHora(horario.hora_inicio)} a ${this.formatearHora(horario.hora_fin)}`;
      return reactivar
        ? `El horario de ${rango} está inactivo. Al reactivarlo, el intervalo volverá a estar disponible.`
        : `El horario de ${rango} está activo. Al desactivarlo, el intervalo dejará de estar disponible.`;
    }

    const bloqueo = confirmacion.bloqueo;
    const motivo = bloqueo.motivo ? ` (${bloqueo.motivo})` : '';
    const rango = `${this.formatearFecha(bloqueo.fecha)} de ${this.formatearHora(bloqueo.hora_inicio)} a ${this.formatearHora(bloqueo.hora_fin)}${motivo}`;
    return reactivar
      ? `El bloqueo del ${rango} está inactivo. Al reactivarlo, volverá a impedir reservas en ese rango.`
      : `El bloqueo del ${rango} está activo. Al desactivarlo, dejará de aplicarse.`;
  });

  private readonly configuracionService = inject(
    ConfiguracionDisponibilidadService,
  );
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.rolId.set(this.authService.obtenerRolIdActual());
    this.cargarOftalmologos();
  }

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

  onCambiarOftalmologo(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    if (!valor) {
      return;
    }
    const id = Number(valor);
    this.oftalmologoSeleccionadoId.set(id);
    this.cargarConfiguracion(id);
  }

  reintentarOftalmologos(): void {
    this.cargarOftalmologos();
  }

  reintentarConfiguracion(): void {
    const id = this.oftalmologoSeleccionadoId();
    if (id !== null) {
      this.cargarConfiguracion(id);
    }
  }

  abrirCrearHorario(): void {
    if (!this.puedeAgregar()) {
      return;
    }
    this.errorHorarioModal.set(null);
    this.horarioEnEdicion.set(null);
    this.modalHorarioAbierto.set(true);
  }

  abrirEditarHorario(horario: HorarioOftalmologo): void {
    if (this.ocupado()) {
      return;
    }
    this.errorHorarioModal.set(null);
    this.horarioEnEdicion.set(horario);
    this.modalHorarioAbierto.set(true);
  }

  cerrarModalHorario(): void {
    if (this.guardandoHorario()) {
      return;
    }
    this.modalHorarioAbierto.set(false);
    this.horarioEnEdicion.set(null);
    this.errorHorarioModal.set(null);
  }

  guardarHorario(datos: HorarioOftalmologoGuardar): void {
    if (this.guardandoHorario()) {
      return;
    }
    const oftalmologoId = this.oftalmologoSeleccionadoId();
    if (oftalmologoId === null) {
      return;
    }

    const horario = this.horarioEnEdicion();
    this.guardandoHorario.set(true);
    this.errorHorarioModal.set(null);

    const peticion: Observable<unknown> = horario
      ? this.configuracionService.actualizarHorario(
          oftalmologoId,
          horario.id,
          datos,
        )
      : this.configuracionService.crearHorario(oftalmologoId, datos);

    peticion.subscribe({
      next: () => {
        this.guardandoHorario.set(false);
        this.modalHorarioAbierto.set(false);
        this.horarioEnEdicion.set(null);
        this.mostrarExito(
          horario
            ? 'Horario actualizado correctamente.'
            : 'Horario agregado correctamente.',
        );
        this.recargarConfiguracion(oftalmologoId);
      },
      error: (err: unknown) => {
        this.guardandoHorario.set(false);
        if (this.redirigirSiSesionExpirada(err)) {
          return;
        }
        this.errorHorarioModal.set(
          mensajeErrorHttp(err, {
            mensaje403: 'No tienes permisos para modificar la disponibilidad.',
            mensaje404: 'El oftalmólogo u horario no fue encontrado.',
          }),
        );
      },
    });
  }

  abrirCrearBloqueo(): void {
    if (!this.puedeAgregar()) {
      return;
    }
    this.errorBloqueoModal.set(null);
    this.bloqueoEnEdicion.set(null);
    this.modalBloqueoAbierto.set(true);
  }

  abrirEditarBloqueo(bloqueo: BloqueoHorario): void {
    if (this.ocupado()) {
      return;
    }
    this.errorBloqueoModal.set(null);
    this.bloqueoEnEdicion.set(bloqueo);
    this.modalBloqueoAbierto.set(true);
  }

  cerrarModalBloqueo(): void {
    if (this.guardandoBloqueo()) {
      return;
    }
    this.modalBloqueoAbierto.set(false);
    this.bloqueoEnEdicion.set(null);
    this.errorBloqueoModal.set(null);
  }

  guardarBloqueo(datos: BloqueoHorarioGuardar): void {
    if (this.guardandoBloqueo()) {
      return;
    }
    const oftalmologoId = this.oftalmologoSeleccionadoId();
    if (oftalmologoId === null) {
      return;
    }

    const bloqueo = this.bloqueoEnEdicion();
    this.guardandoBloqueo.set(true);
    this.errorBloqueoModal.set(null);

    const peticion: Observable<unknown> = bloqueo
      ? this.configuracionService.actualizarBloqueo(
          oftalmologoId,
          bloqueo.id,
          datos,
        )
      : this.configuracionService.crearBloqueo(oftalmologoId, datos);

    peticion.subscribe({
      next: () => {
        this.guardandoBloqueo.set(false);
        this.modalBloqueoAbierto.set(false);
        this.bloqueoEnEdicion.set(null);
        this.mostrarExito(
          bloqueo
            ? 'Bloqueo actualizado correctamente.'
            : 'Bloqueo agregado correctamente.',
        );
        this.recargarConfiguracion(oftalmologoId);
      },
      error: (err: unknown) => {
        this.guardandoBloqueo.set(false);
        if (this.redirigirSiSesionExpirada(err)) {
          return;
        }
        this.errorBloqueoModal.set(
          mensajeErrorHttp(err, {
            mensaje403: 'No tienes permisos para modificar la disponibilidad.',
            mensaje404: 'El oftalmólogo o bloqueo no fue encontrado.',
          }),
        );
      },
    });
  }

  solicitarCambioEstadoHorario(horario: HorarioOftalmologo): void {
    if (this.ocupado()) {
      return;
    }
    this.errorEstadoDialog.set(null);
    this.procesandoEstado.set(false);
    this.confirmacion.set({ tipo: 'horario', horario });
  }

  solicitarCambioEstadoBloqueo(bloqueo: BloqueoHorario): void {
    if (this.ocupado()) {
      return;
    }
    this.errorEstadoDialog.set(null);
    this.procesandoEstado.set(false);
    this.confirmacion.set({ tipo: 'bloqueo', bloqueo });
  }

  cancelarConfirmacion(): void {
    if (this.procesandoEstado()) {
      return;
    }
    this.confirmacion.set(null);
    this.errorEstadoDialog.set(null);
  }

  confirmarCambioEstado(): void {
    if (this.procesandoEstado()) {
      return;
    }
    const confirmacion = this.confirmacion();
    const oftalmologoId = this.oftalmologoSeleccionadoId();
    if (!confirmacion || oftalmologoId === null) {
      return;
    }

    const activar =
      confirmacion.tipo === 'horario'
        ? !confirmacion.horario.estado
        : !confirmacion.bloqueo.estado;

    this.procesandoEstado.set(true);
    this.errorEstadoDialog.set(null);

    const peticion: Observable<unknown> =
      confirmacion.tipo === 'horario'
        ? this.configuracionService.cambiarEstadoHorario(
            oftalmologoId,
            confirmacion.horario.id,
            activar,
          )
        : this.configuracionService.cambiarEstadoBloqueo(
            oftalmologoId,
            confirmacion.bloqueo.id,
            activar,
          );

    peticion.subscribe({
      next: () => {
        this.procesandoEstado.set(false);
        this.confirmacion.set(null);
        this.mostrarExito(
          confirmacion.tipo === 'horario'
            ? activar
              ? 'Horario reactivado correctamente.'
              : 'Horario desactivado correctamente.'
            : activar
              ? 'Bloqueo reactivado correctamente.'
              : 'Bloqueo desactivado correctamente.',
        );
        this.recargarConfiguracion(oftalmologoId);
      },
      error: (err: unknown) => {
        this.procesandoEstado.set(false);
        if (this.redirigirSiSesionExpirada(err)) {
          return;
        }
        this.errorEstadoDialog.set(
          mensajeErrorHttp(err, {
            mensaje403: 'No tienes permisos para modificar la disponibilidad.',
            mensaje404: 'El registro no fue encontrado o ya no está disponible.',
          }),
        );
      },
    });
  }

  formatearHora(hora: string): string {
    return hora.length >= 5 ? hora.slice(0, 5) : hora;
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) {
      return fecha;
    }
    return `${dia}/${mes}/${anio}`;
  }

  private cargarOftalmologos(): void {
    this.cargandoOftalmologos.set(true);
    this.errorOftalmologos.set(null);
    this.configuracion.set(null);

    this.configuracionService.listarOftalmologosConfigurables().subscribe({
      next: (oftalmologos) => {
        this.cargandoOftalmologos.set(false);
        this.oftalmologos.set(oftalmologos);

        if (oftalmologos.length === 0) {
          this.oftalmologoSeleccionadoId.set(null);
          return;
        }

        const primero = oftalmologos[0];
        this.oftalmologoSeleccionadoId.set(primero.id);
        this.cargarConfiguracion(primero.id);
      },
      error: (err: unknown) => {
        this.cargandoOftalmologos.set(false);
        if (this.redirigirSiSesionExpirada(err)) {
          return;
        }
        this.errorOftalmologos.set(
          mensajeErrorHttp(err, {
            mensaje403:
              'No tienes permisos para configurar la disponibilidad de los oftalmólogos.',
          }),
        );
      },
    });
  }

  private cargarConfiguracion(oftalmologoId: number): void {
    this.cargandoConfiguracion.set(true);
    this.errorConfiguracion.set(null);
    this.configuracion.set(null);

    this.configuracionService.obtenerConfiguracion(oftalmologoId).subscribe({
      next: (configuracion) => {
        this.cargandoConfiguracion.set(false);
        this.configuracion.set(configuracion);
      },
      error: (err: unknown) => {
        this.cargandoConfiguracion.set(false);
        if (this.redirigirSiSesionExpirada(err)) {
          return;
        }
        this.errorConfiguracion.set(
          mensajeErrorHttp(err, {
            mensaje403:
              'No tienes permisos para consultar la configuración de este oftalmólogo.',
            mensaje404: 'El oftalmólogo solicitado no fue encontrado o está inactivo.',
          }),
        );
      },
    });
  }

  private recargarConfiguracion(oftalmologoId: number): void {
    this.cargarConfiguracion(oftalmologoId);
  }

  private mostrarExito(mensaje: string): void {
    this.exito.set(mensaje);
    setTimeout(() => this.exito.set(null), 4000);
  }

  private redirigirSiSesionExpirada(err: unknown): boolean {
    if (!esError401(err)) {
      return false;
    }
    this.authService.logout();
    this.router.navigate(['/login']);
    return true;
  }
}
