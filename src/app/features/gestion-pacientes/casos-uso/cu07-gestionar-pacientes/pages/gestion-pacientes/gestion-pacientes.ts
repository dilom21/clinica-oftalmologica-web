import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { PacientesTable } from '../../components/pacientes-table/pacientes-table';
import {
  PacienteModal,
  PacienteModalGuardar,
} from '../../components/paciente-modal/paciente-modal';
import { AntecedenteModal } from '../../components/antecedente-modal/antecedente-modal';
import { Paciente } from '../../models/pacientes.models';
import { PacientesService } from '../../services/pacientes.service';

@Component({
  selector: 'app-gestion-pacientes',
  imports: [Sidebar, PacientesTable, PacienteModal, AntecedenteModal],
  templateUrl: './gestion-pacientes.html',
  styleUrl: './gestion-pacientes.css',
})
export class GestionPacientes implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);

  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly buscarTermino = signal('');

  protected readonly modalAbierto = signal(false);
  protected readonly pacienteEnEdicion = signal<Paciente | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly modalAntecedentesAbierto = signal(false);
  protected readonly pacienteSeleccionadoParaAntecedentes = signal<Paciente | null>(null);

  protected readonly exito = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly pacientesService = inject(PacientesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pacientesFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    if (!termino) {
      return this.pacientes();
    }
    return this.pacientes().filter((paciente) => {
      const enNombres = paciente.nombres.toLowerCase().includes(termino);
      const enApellidos = paciente.apellidos.toLowerCase().includes(termino);
      const enCI = paciente.ci.toLowerCase().includes(termino);
      const enTelefono = paciente.telefono.toLowerCase().includes(termino);
      return enNombres || enApellidos || enCI || enTelefono;
    });
  });

  ngOnInit(): void {
    this.cargarPacientes();
  }

  private cargarPacientes(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.pacientesService
      .listarPacientes()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (pacientes) => {
          this.pacientes.set(pacientes);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.errorCarga.set(true);
        },
      });
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

  onBuscar(event: Event): void {
    this.buscarTermino.set((event.target as HTMLInputElement).value);
  }

  abrirCrear(): void {
    this.errorModal.set(null);
    this.pacienteEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  abrirEdicion(paciente: Paciente): void {
    this.errorModal.set(null);
    this.pacienteEnEdicion.set(paciente);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }
    this.modalAbierto.set(false);
    this.pacienteEnEdicion.set(null);
    this.errorModal.set(null);
  }

  abrirAntecedentes(paciente: Paciente): void {
    this.pacienteSeleccionadoParaAntecedentes.set(paciente);
    this.modalAntecedentesAbierto.set(true);
  }

  cerrarModalAntecedentes(): void {
    this.modalAntecedentesAbierto.set(false);
    this.pacienteSeleccionadoParaAntecedentes.set(null);
  }

  guardarPaciente(datos: PacienteModalGuardar): void {
    if (this.guardando()) {
      return;
    }

    const paciente = this.pacienteEnEdicion();
    this.guardando.set(true);
    this.errorModal.set(null);

    const peticion = paciente
      ? this.pacientesService.actualizarPaciente(paciente.id, datos)
      : this.pacientesService.crearPaciente(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.pacienteEnEdicion.set(null);
        this.mostrarExito(
          paciente ? 'Paciente actualizado correctamente.' : 'Paciente registrado correctamente.',
        );
        this.cargarPacientes();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorModal.set(this.extraerError(err));
      },
    });
  }

  private mostrarExito(mensaje: string): void {
    this.exito.set(mensaje);
    setTimeout(() => this.exito.set(null), 4000);
  }

  private mostrarError(mensaje: string): void {
    this.error.set(mensaje);
    setTimeout(() => this.error.set(null), 5000);
  }

  private extraerError(err: unknown): string {
    const objeto =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: { detail?: unknown } })
        : null;
    const status = objeto?.status;
    const detail = objeto?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    switch (status) {
      case 400:
        return 'Los datos enviados no son válidos.';
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El paciente solicitado no fue encontrado.';
      case 409:
        return 'Ya existe un paciente con esa cédula.';
      case 422:
        return 'Algunos datos enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return 'Ocurrió un error inesperado.';
    }
  }
}
