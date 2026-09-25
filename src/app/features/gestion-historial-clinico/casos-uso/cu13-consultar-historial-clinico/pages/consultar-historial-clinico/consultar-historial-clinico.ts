import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { Paciente } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../../features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  HistorialClinicoDetalle,
  HistorialClinicoRespuesta,
  PacienteHistorial,
} from '../../models/historial-clinico.models';
import { HistorialClinicoService } from '../../services/historial-clinico.service';

@Component({
  selector: 'app-consultar-historial-clinico',
  imports: [Sidebar],
  templateUrl: './consultar-historial-clinico.html',
  styleUrl: './consultar-historial-clinico.css',
})
export class ConsultarHistorialClinico implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly pacienteSeleccionado = signal<PacienteHistorial | null>(null);
  protected readonly historial = signal<HistorialClinicoDetalle | null>(null);
  protected readonly buscarTermino = signal('');
  protected readonly pacienteId = signal('');
  protected readonly cargandoPacientes = signal(true);
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorCargaPacientes = signal(false);
  protected readonly errorConsulta = signal<string | null>(null);

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pacientesFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    if (!termino) {
      return this.pacientes();
    }

    return this.pacientes().filter((paciente) =>
      `${paciente.nombres} ${paciente.apellidos} ${paciente.ci}`
        .toLowerCase()
        .includes(termino),
    );
  });

  ngOnInit(): void {
    this.cargarPacientes();
  }

  private cargarPacientes(): void {
    this.cargandoPacientes.set(true);
    this.errorCargaPacientes.set(false);

    this.pacientesService.listarPacientes().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.cargandoPacientes.set(false);
      },
      error: () => {
        this.pacientes.set([]);
        this.cargandoPacientes.set(false);
        this.errorCargaPacientes.set(true);
      },
    });
  }

  protected seleccionarPaciente(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.pacienteId.set(id);
    this.errorConsulta.set(null);
    this.historial.set(null);
    this.pacienteSeleccionado.set(null);

    if (id) {
      this.consultarHistorial(Number(id));
    }
  }

  protected onBuscar(event: Event): void {
    this.buscarTermino.set((event.target as HTMLInputElement).value);
  }

  protected consultarPaciente(paciente: Paciente): void {
    this.pacienteId.set(String(paciente.id));
    this.buscarTermino.set('');
    this.errorConsulta.set(null);
    this.consultarHistorial(paciente.id);
  }

  protected reintentarPacientes(): void {
    this.cargarPacientes();
  }

  protected reintentarConsulta(): void {
    const id = Number(this.pacienteId());
    if (id) {
      this.consultarHistorial(id);
    }
  }

  private consultarHistorial(pacienteId: number): void {
    this.cargandoHistorial.set(true);
    this.errorConsulta.set(null);

    this.historialClinicoService
      .obtenerHistorialClinico(pacienteId)
      .pipe(catchError((error: unknown) => of({ error })))
      .subscribe((resultado) => {
        if ('error' in resultado) {
          this.historial.set(null);
          this.pacienteSeleccionado.set(null);
          this.errorConsulta.set(this.extraerError(resultado.error));
        } else {
          this.pacienteSeleccionado.set(resultado.paciente);
          this.historial.set(resultado.historial);
        }
        this.cargandoHistorial.set(false);
      });
  }

  protected formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(
      new Date(fecha),
    );
  }

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private extraerError(err: unknown): string {
    const objeto =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: { detail?: unknown } })
        : null;
    const detail = objeto?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    switch (objeto?.status) {
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para consultar el historial clínico.';
      case 404:
        return 'El paciente solicitado no fue encontrado.';
      case 422:
        return 'El identificador del paciente no es válido.';
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
      default:
        return 'No se pudo consultar el historial clínico. Inténtalo nuevamente.';
    }
  }
}
