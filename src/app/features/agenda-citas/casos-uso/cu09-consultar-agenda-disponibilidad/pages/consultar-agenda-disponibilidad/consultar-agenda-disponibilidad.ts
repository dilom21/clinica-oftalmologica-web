import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ID_ROL_USUARIO } from '../../../../../../features/autenticacion-seguridad/Auth/models/auth.models';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import {
  AgendaRespuesta,
  DisponibilidadRespuesta,
  OftalmologoAgenda,
} from '../../models/agenda.models';
import { AgendaService } from '../../services/agenda.service';

@Component({
  selector: 'app-consultar-agenda-disponibilidad',
  imports: [Sidebar],
  templateUrl: './consultar-agenda-disponibilidad.html',
  styleUrl: './consultar-agenda-disponibilidad.css',
})
export class ConsultarAgendaDisponibilidad implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  protected readonly oftalmologos = signal<OftalmologoAgenda[]>([]);
  protected readonly cargandoOftalmologos = signal(true);
  protected readonly errorOftalmologos = signal<string | null>(null);

  protected readonly oftalmologoSeleccionado = signal('');
  protected readonly fecha = signal(this.fechaDeHoy());

  protected readonly consultando = signal(false);
  protected readonly errorConsulta = signal<string | null>(null);
  protected readonly disponibilidad = signal<DisponibilidadRespuesta | null>(null);
  protected readonly agenda = signal<AgendaRespuesta | null>(null);

  protected readonly puedeConsultar = computed(
    () =>
      !this.cargandoOftalmologos() &&
      !this.consultando() &&
      this.oftalmologoSeleccionado() !== '' &&
      this.fecha() !== '',
  );

  protected readonly rolId = signal<number | null>(null);
  protected readonly esOftalmologo = computed(
    () => this.rolId() === ID_ROL_USUARIO.OFTALMOLOGO,
  );
  protected readonly esPaciente = computed(
    () => this.rolId() === ID_ROL_USUARIO.PACIENTE,
  );
  protected readonly puedeVerAgenda = computed(
    () => this.rolId() !== ID_ROL_USUARIO.PACIENTE,
  );

  private readonly agendaService = inject(AgendaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.rolId.set(this.authService.obtenerRolIdActual());
    this.cargarOftalmologos();
  }

  onCambiarOftalmologo(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.oftalmologoSeleccionado.set(valor);
    this.limpiarResultados();
  }

  onCambiarFecha(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.fecha.set(valor);
    this.limpiarResultados();
  }

  consultar(): void {
    const idTexto = this.oftalmologoSeleccionado();
    const fechaTexto = this.fecha();

    if (!idTexto || !fechaTexto) {
      return;
    }

    const oftalmologoId = Number(idTexto);

    this.consultando.set(true);
    this.errorConsulta.set(null);
    this.disponibilidad.set(null);
    this.agenda.set(null);

    if (!this.puedeVerAgenda()) {
      this.agendaService
        .obtenerDisponibilidad(oftalmologoId, fechaTexto)
        .subscribe({
          next: (disponibilidad) => {
            this.disponibilidad.set(disponibilidad);
            this.consultando.set(false);
          },
          error: (err: unknown) => {
            this.consultando.set(false);
            this.errorConsulta.set(this.extraerError(err));
          },
        });
      return;
    }

    forkJoin({
      disponibilidad: this.agendaService.obtenerDisponibilidad(oftalmologoId, fechaTexto),
      agenda: this.agendaService.obtenerAgenda(oftalmologoId, fechaTexto),
    }).subscribe({
      next: (resultado) => {
        this.disponibilidad.set(resultado.disponibilidad);
        this.agenda.set(resultado.agenda);
        this.consultando.set(false);
      },
      error: (err: unknown) => {
        this.consultando.set(false);
        this.errorConsulta.set(this.extraerError(err));
      },
    });
  }

  reintentarCargaOftalmologos(): void {
    this.cargarOftalmologos();
  }

  reintentarConsulta(): void {
    this.consultar();
  }

  limpiar(): void {
    this.fecha.set(this.fechaDeHoy());
    this.limpiarResultados();
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

    this.agendaService.listarOftalmologos().subscribe({
      next: (oftalmologos) => {
        this.oftalmologos.set(oftalmologos);
        this.cargandoOftalmologos.set(false);

        if (oftalmologos.length > 0) {
          this.oftalmologoSeleccionado.set(String(oftalmologos[0].id));
          this.consultar();
        }
      },
      error: (err: unknown) => {
        this.cargandoOftalmologos.set(false);
        this.errorOftalmologos.set(this.extraerError(err));
      },
    });
  }

  private limpiarResultados(): void {
    this.disponibilidad.set(null);
    this.agenda.set(null);
    this.errorConsulta.set(null);
  }

  private fechaDeHoy(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private extraerError(err: unknown): string {
    const detalle = this.leerDetalle(err);
    if (detalle) {
      return detalle;
    }

    switch (this.leerStatus(err)) {
      case 400:
        return 'La solicitud enviada no es válida.';
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para consultar la agenda y disponibilidad médica.';
      case 404:
        return 'El oftalmólogo solicitado no fue encontrado o está inactivo.';
      case 422:
        return 'La fecha o los parámetros enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return 'Ocurrió un error inesperado.';
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
