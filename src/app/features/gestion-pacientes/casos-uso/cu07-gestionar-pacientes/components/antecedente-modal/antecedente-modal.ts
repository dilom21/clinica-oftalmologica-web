import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Paciente } from '../../models/pacientes.models';
import { AntecedenteClinico } from '../../models/antecedentes.models';
import { PacientesService } from '../../services/pacientes.service';

import { HistorialClinicoService } from '../../../../../gestion-historial-clinico/casos-uso/cu13-consultar-historial-clinico/services/historial-clinico.service';

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

  protected readonly tipo = signal('ENFERMEDAD');
  protected readonly descripcion = signal('');
  protected readonly antecedenteEnEdicionId = signal<number | null>(null);

  private readonly historialClinicoId = signal<number | null>(null);

  private readonly pacientesService = inject(PacientesService);
  private readonly historialClinicoService = inject(HistorialClinicoService);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const paciente = this.paciente();

      if (isOpen && paciente) {
        this.cargarHistorialPaciente(paciente.id);
        this.limpiarFormulario();
      }
    });
  }

  private cargarHistorialPaciente(pacienteId: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.antecedentes.set([]);
    this.historialClinicoId.set(null);

    this.historialClinicoService
      .obtenerHistorialClinico(pacienteId)
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.historial) {
            this.error.set(
              'El paciente todavía no tiene un historial clínico registrado.',
            );
            this.cargando.set(false);
            return;
          }

          this.historialClinicoId.set(respuesta.historial.id);

          this.antecedentes.set(
            respuesta.historial.antecedentes.map((antecedente) => ({
              id: antecedente.id,
              historial_clinico_id: respuesta.historial!.id,
              tipo: antecedente.tipo,
              descripcion: antecedente.descripcion,
              fecha_registro: antecedente.fecha_registro,
            })),
          );

          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el historial clínico del paciente.');
          this.cargando.set(false);
        },
      });
  }

      guardarAntecedente(): void {
      const historialId = this.historialClinicoId();
      const antecedenteId = this.antecedenteEnEdicionId();

      if (
        historialId === null ||
        !this.descripcion().trim() ||
        this.guardando()
      ) {
        return;
      }

      this.guardando.set(true);
      this.error.set(null);

      const datos = {
        historial_clinico_id: historialId,
        tipo: this.tipo(),
        descripcion: this.descripcion().trim(),
      };

      if (antecedenteId !== null) {
        this.pacientesService
          .actualizarAntecedente(antecedenteId, datos)
          .subscribe({
            next: (actualizado) => {
              this.antecedentes.update((lista) =>
                lista.map((item) =>
                  item.id === antecedenteId ? actualizado : item,
                ),
              );

              this.limpiarFormulario();
              this.guardando.set(false);
            },
            error: () => {
              this.error.set('No se pudo actualizar el antecedente.');
              this.guardando.set(false);
            },
          });

        return;
      }

      this.pacientesService.crearAntecedente(datos).subscribe({
        next: (antecedenteGuardado) => {
          this.antecedentes.update((lista) => [
            ...lista,
            antecedenteGuardado,
          ]);

          this.limpiarFormulario();
          this.guardando.set(false);
        },
        error: () => {
          this.error.set('No se pudo guardar el antecedente.');
          this.guardando.set(false);
        },
      });
    }

    editarAntecedente(antecedente: AntecedenteClinico): void {
      if (antecedente.id === undefined) {
        return;
      }

      this.antecedenteEnEdicionId.set(antecedente.id);
      this.tipo.set(antecedente.tipo);
      this.descripcion.set(antecedente.descripcion);
    }
  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }

    this.close.emit();
  }

  private limpiarFormulario(): void {
    this.antecedenteEnEdicionId.set(null);
    this.tipo.set('ENFERMEDAD');
    this.descripcion.set('');
    this.error.set(null);
}
}