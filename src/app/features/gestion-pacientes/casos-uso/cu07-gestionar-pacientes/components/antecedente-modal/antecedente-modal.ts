import { Component, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AntecedenteClinico,
  AntecedenteClinicoActualizar,
  AntecedenteClinicoCrear,
} from '../../models/antecedentes.models';
import { Paciente } from '../../models/pacientes.models';
import { PacientesService } from '../../services/pacientes.service';

@Component({
  selector: 'app-antecedente-modal',
  imports: [FormsModule],
  templateUrl: './antecedente-modal.html',
  styleUrl: './antecedente-modal.css',
})
export class AntecedenteModal {
  readonly open = input(false);
  readonly paciente = input<Paciente | null>(null);
  readonly close = output<void>();

  protected readonly antecedentes = signal<AntecedenteClinico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly sinHistorial = signal(false);

  protected readonly tipo = signal('ENFERMEDAD');
  protected readonly descripcion = signal('');
  protected readonly antecedenteEnEdicionId = signal<number | null>(null);
  protected readonly historialClinicoId = signal<number | null>(null);

  private readonly pacientesService = inject(PacientesService);

  private readonly cargarAlAbrir = effect((onCleanup) => {
    const paciente = this.paciente();

    if (!this.open() || !paciente) {
      return;
    }

    this.reiniciarEstado();
    const suscripcion = this.cargarHistorialPaciente(paciente.id);
    onCleanup(() => suscripcion.unsubscribe());
  });

  private readonly bloquearScroll = effect((onCleanup) => {
    if (this.open()) {
      document.body.style.overflow = 'hidden';
    }
    onCleanup(() => {
      document.body.style.overflow = '';
    });
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.cerrarModal();
    }
  }

  guardarAntecedente(): void {
    const historialClinicoId = this.historialClinicoId();
    const antecedenteId = this.antecedenteEnEdicionId();
    const descripcion = this.descripcion().trim();
    const tipo = this.tipo();

    if (historialClinicoId === null || !descripcion || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(null);

    if (antecedenteId !== null) {
      const datos: AntecedenteClinicoActualizar = { tipo, descripcion };

      this.pacientesService.actualizarAntecedente(antecedenteId, datos).subscribe({
        next: (actualizado) => {
          this.antecedentes.update((lista) =>
            lista.map((item) => (item.id === antecedenteId ? actualizado : item)),
          );
          this.finalizarGuardado('Antecedente actualizado correctamente.');
        },
        error: (err: unknown) => this.manejarErrorGuardado(err, 'actualizar'),
      });
      return;
    }

    const datos: AntecedenteClinicoCrear = {
      historial_clinico_id: historialClinicoId,
      tipo,
      descripcion,
    };

    this.pacientesService.crearAntecedente(datos).subscribe({
      next: (creado) => {
        this.antecedentes.update((lista) => [creado, ...lista]);
        this.finalizarGuardado('Antecedente registrado correctamente.');
      },
      error: (err: unknown) => this.manejarErrorGuardado(err, 'registrar'),
    });
  }

  editarAntecedente(antecedente: AntecedenteClinico): void {
    this.antecedenteEnEdicionId.set(antecedente.id);
    this.tipo.set(antecedente.tipo);
    this.descripcion.set(antecedente.descripcion);
    this.error.set(null);
    this.exito.set(null);
  }

  cancelarEdicion(): void {
    if (!this.guardando()) {
      this.limpiarFormulario();
    }
  }

  cerrarModal(): void {
    if (!this.guardando()) {
      this.close.emit();
    }
  }

  private cargarHistorialPaciente(pacienteId: number) {
    this.cargando.set(true);

    return this.pacientesService.obtenerHistorialClinico(pacienteId).subscribe({
      next: (respuesta) => {
        const historial = respuesta.historial;
        if (!historial) {
          this.sinHistorial.set(true);
          this.cargando.set(false);
          return;
        }

        this.historialClinicoId.set(historial.id);
        this.antecedentes.set(historial.antecedentes);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(this.extraerError(err, 'cargar'));
        this.cargando.set(false);
      },
    });
  }

  private finalizarGuardado(mensaje: string): void {
    this.guardando.set(false);
    this.limpiarFormulario();
    this.exito.set(mensaje);
  }

  private manejarErrorGuardado(err: unknown, operacion: 'registrar' | 'actualizar'): void {
    this.error.set(this.extraerError(err, operacion));
    this.guardando.set(false);
  }

  private reiniciarEstado(): void {
    this.antecedentes.set([]);
    this.historialClinicoId.set(null);
    this.sinHistorial.set(false);
    this.cargando.set(false);
    this.guardando.set(false);
    this.error.set(null);
    this.exito.set(null);
    this.limpiarFormulario();
  }

  private limpiarFormulario(): void {
    this.antecedenteEnEdicionId.set(null);
    this.tipo.set('ENFERMEDAD');
    this.descripcion.set('');
  }

  private extraerError(err: unknown, operacion: 'cargar' | 'registrar' | 'actualizar'): string {
    const respuesta =
      err && typeof err === 'object'
        ? (err as { status?: number; error?: { detail?: unknown } })
        : null;
    const detail = respuesta?.error?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    switch (respuesta?.status) {
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para gestionar antecedentes clínicos.';
      case 404:
        return operacion === 'cargar'
          ? 'No se encontró el paciente o su historial clínico.'
          : 'El antecedente solicitado ya no existe.';
      case 422:
        return 'Los datos del antecedente no son válidos.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return operacion === 'cargar'
          ? 'No se pudo cargar el historial clínico.'
          : `No se pudo ${operacion} el antecedente clínico.`;
    }
  }
}
