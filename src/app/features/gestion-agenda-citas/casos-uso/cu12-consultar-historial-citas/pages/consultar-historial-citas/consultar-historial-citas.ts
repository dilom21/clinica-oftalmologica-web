import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { AuthService } from '../../../../../../features/autenticacion-seguridad/Auth/services/auth.service';
import {
  CitaHistorial,
  HistorialCitasFiltros,
  HistorialCitasRespuesta,
} from '../../models/historial-citas.models';
import { HistorialCitasService } from '../../services/historial-citas.service';

@Component({
  selector: 'app-consultar-historial-citas',
  imports: [Sidebar],
  templateUrl: './consultar-historial-citas.html',
  styleUrl: './consultar-historial-citas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultarHistorialCitas {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly tipoBusqueda = signal('nombre');
  protected readonly terminoBusqueda = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly estado = signal('');
  protected readonly consultando = signal(false);
  protected readonly errorConsulta = signal<string | null>(null);
  protected readonly historial = signal<HistorialCitasRespuesta | null>(null);

  protected readonly puedeConsultar = computed(
    () => this.terminoBusqueda().trim().length > 0 && !this.consultando(),
  );

  private readonly historialService = inject(HistorialCitasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  onCambiarTipoBusqueda(event: Event): void {
    this.tipoBusqueda.set((event.target as HTMLSelectElement).value);
    this.limpiarResultado();
  }

  onCambiarTermino(event: Event): void {
    this.terminoBusqueda.set((event.target as HTMLInputElement).value);
  }

  onCambiarFechaDesde(event: Event): void {
    this.fechaDesde.set((event.target as HTMLInputElement).value);
  }

  onCambiarFechaHasta(event: Event): void {
    this.fechaHasta.set((event.target as HTMLInputElement).value);
  }

  onCambiarEstado(event: Event): void {
    this.estado.set((event.target as HTMLSelectElement).value);
  }

  consultar(): void {
    const termino = this.terminoBusqueda().trim();
    const fechaDesde = this.fechaDesde();
    const fechaHasta = this.fechaHasta();

      const rangoFechasInvalido =
        fechaDesde !== '' &&
        fechaHasta !== '' &&
        fechaDesde > fechaHasta;

      if (!termino || rangoFechasInvalido) {
        this.errorConsulta.set(
          rangoFechasInvalido
            ? 'La fecha inicial no puede ser posterior a la fecha final.'
            : 'Indica un nombre, código o número de identificación para buscar.',
        );
        return;
      }

    const filtros: HistorialCitasFiltros = {
      [this.tipoBusqueda()]: termino,
      fecha_desde: this.fechaDesde(),
      fecha_hasta: this.fechaHasta(),
      estado: this.estado(),
    };

    this.consultando.set(true);
    this.errorConsulta.set(null);
    this.historial.set(null);

    this.historialService.consultar(filtros).subscribe({
      next: (historial) => {
        this.historial.set(historial);
        this.consultando.set(false);
      },
      error: (err: unknown) => {
        this.consultando.set(false);
        this.errorConsulta.set(this.extraerError(err));
      },
    });
  }

  limpiar(): void {
    this.terminoBusqueda.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.estado.set('');
    this.limpiarResultado();
  }

  reintentar(): void {
    this.consultar();
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

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  formatearHora(hora: string): string {
    return hora.length >= 5 ? hora.slice(0, 5) : hora;
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      PROGRAMADA: 'Programada',
      CONFIRMADA: 'Confirmada',
      ATENDIDA: 'Atendida',
      CANCELADA: 'Cancelada',
      'NO ASISTIO': 'No asistió',
    };
    return etiquetas[estado.toUpperCase()] ?? estado;
  }

  claseEstado(estado: string): string {
    return estado.toLowerCase().replaceAll(' ', '-');
  }

  trackPorId(_indice: number, cita: CitaHistorial): number {
    return cita.id;
  }

  private limpiarResultado(): void {
    this.errorConsulta.set(null);
    this.historial.set(null);
  }

  private extraerError(err: unknown): string {
    const error = err as { error?: { detail?: unknown }; status?: unknown };
    const detalle = error.error?.detail;
    if (typeof detalle === 'string' && detalle.trim()) {
      return detalle;
    }

    switch (error.status) {
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para consultar el historial de citas.';
      case 404:
        return 'No se encontró un paciente con los datos indicados.';
      case 422:
        return 'Revisa los datos y filtros enviados.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return 'Ocurrió un error inesperado al consultar el historial.';
    }
  }
}
