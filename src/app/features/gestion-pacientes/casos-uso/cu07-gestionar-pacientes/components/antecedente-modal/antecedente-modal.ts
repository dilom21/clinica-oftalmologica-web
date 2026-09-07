import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paciente } from '../../models/pacientes.models';
import { AntecedenteClinico } from '../../models/antecedentes.models';
import { PacientesService } from '../../services/pacientes.service';

@Component({
  selector: 'app-antecedente-modal',
  imports: [FormsModule],
  templateUrl: './antecedente-modal.html',
  styleUrl: './antecedente-modal.css'
})
export class AntecedenteModal {
  readonly open = input(false);
  readonly paciente = input<Paciente | null>(null);
  readonly close = output<void>();

  protected readonly antecedentes = signal<AntecedenteClinico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Formulario
  protected tipo = signal('ENFERMEDAD');
  protected descripcion = signal('');

  private readonly pacientesService = inject(PacientesService);

  constructor() {
    // Escucha cuando el modal se abre para cargar la lista
    effect(() => {
      const isOpen = this.open();
      const pac = this.paciente();
      
      if (isOpen && pac) {
        this.cargarAntecedentes(pac.id);
        this.limpiarFormulario();
      }
    }, { allowSignalWrites: true });
  }

  private cargarAntecedentes(pacienteId: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pacientesService.listarAntecedentesPorHistorial(pacienteId).subscribe({
      next: (datos) => {
        this.antecedentes.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los antecedentes.');
        this.cargando.set(false);
      }
    });
  }

  guardarAntecedente(): void {
    const pac = this.paciente();
    if (!pac || !this.descripcion().trim() || this.guardando()) return;

    this.guardando.set(true);
    this.error.set(null);

    const nuevoAntecedente: AntecedenteClinico = {
      historial_clinico_id: pac.id,
      tipo: this.tipo(),
      descripcion: this.descripcion().trim()
    };

    this.pacientesService.crearAntecedente(nuevoAntecedente).subscribe({
      next: (antecedenteGuardado) => {
        // Actualizamos la lista local añadiendo el nuevo
        this.antecedentes.update(lista => [...lista, antecedenteGuardado]);
        this.limpiarFormulario();
        this.guardando.set(false);
      },
      error: () => {
        this.error.set('No se pudo guardar el antecedente.');
        this.guardando.set(false);
      }
    });
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.close.emit();
  }

  private limpiarFormulario(): void {
    this.tipo.set('ENFERMEDAD');
    this.descripcion.set('');
    this.error.set(null);
  }
}