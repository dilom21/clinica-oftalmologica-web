import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paciente } from '../../models/pacientes.models';
import { AntecedenteClinico } from '../../models/antecedentes.models';

@Component({
  selector: 'app-antecedente-modal',
  imports: [FormsModule], // Necesario para que funcione [ngModel] y (ngSubmit) en el HTML
  templateUrl: './antecedente-modal.html',
  styleUrl: './antecedente-modal.css'
})
export class AntecedenteModal {
  // Entradas y salidas del componente
  readonly open = input<boolean>(false);
  readonly paciente = input<Paciente | null>(null);
  readonly close = output<void>();

  // Estados de la interfaz
  readonly error = signal<string | null>(null);
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  
  // Variables del formulario
  readonly tipo = signal<string>('ENFERMEDAD');
  readonly descripcion = signal<string>('');

  // Lista de datos
  readonly antecedentes = signal<AntecedenteClinico[]>([]);

  constructor() {
    // Escucha si el modal se abre y hay un paciente seleccionado para cargar sus datos
    effect(() => {
      const p = this.paciente();
      if (p && this.open()) {
        this.cargarAntecedentes(p.id);
      }
    });
  }

  cerrarModal(): void {
    this.close.emit();
    this.resetForm();
  }

  cargarAntecedentes(pacienteId: number): void {
    this.cargando.set(true);
    
    // NOTA: Aquí debes llamar a tu PacientesService real cuando lo conectes a la API.
    // Por ahora, dejamos la lista vacía para que la interfaz compile sin errores.
    this.antecedentes.set([]);
    this.cargando.set(false);
  }

  guardarAntecedente(): void {
    if (!this.descripcion().trim() || this.guardando()) {
      return;
    }
    
    this.guardando.set(true);
    this.error.set(null);
    
    // NOTA: Aquí debes llamar a tu PacientesService real para guardar en la base de datos.
    // Simulamos que termina la carga para limpiar el formulario.
    setTimeout(() => {
      this.guardando.set(false);
      this.resetForm();
    }, 500);
  }

  private resetForm(): void {
    this.tipo.set('ENFERMEDAD');
    this.descripcion.set('');
    this.error.set(null);
  }
}