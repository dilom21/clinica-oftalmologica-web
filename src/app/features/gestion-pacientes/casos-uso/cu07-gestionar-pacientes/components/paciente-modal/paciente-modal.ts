import {
  Component,
  effect,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Paciente } from '../../models/pacientes.models';

export interface PacienteModalGuardar {
  nombres: string;
  apellidos: string;
  ci: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  contacto_emergencia: string;
  direccion: string;
}

@Component({
  selector: 'app-paciente-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './paciente-modal.html',
  styleUrl: './paciente-modal.css',
})
export class PacienteModal {
  readonly open = input(false);
  readonly paciente = input<Paciente | null>(null);
  readonly guardando = input(false);
  readonly errorServer = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<PacienteModalGuardar>();

  private readonly fb = inject(FormBuilder);

  protected readonly pacienteForm = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.minLength(1)]],
    apellidos: ['', [Validators.required, Validators.minLength(1)]],
    ci: ['', [Validators.required]],
    fecha_nacimiento: ['', [Validators.required]],
    sexo: ['', [Validators.required]],
    telefono: ['', [Validators.required]],
    contacto_emergencia: ['', [Validators.required]],
    direccion: [''],
  });

  private readonly sincronizarFormulario = effect(() => {
    if (!this.open()) {
      return;
    }
    const paciente = this.paciente();
    this.pacienteForm.reset({
      nombres: paciente?.nombres ?? '',
      apellidos: paciente?.apellidos ?? '',
      ci: paciente?.ci ?? '',
      fecha_nacimiento: paciente?.fecha_nacimiento ?? '',
      sexo: paciente?.sexo ?? '',
      telefono: paciente?.telefono ?? '',
      contacto_emergencia: paciente?.contacto_emergencia ?? '',
      direccion: paciente?.direccion ?? '',
    });
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
    if (this.open() && !this.guardando()) {
      this.close.emit();
    }
  }

  hasError(field: string, error: string): boolean {
    const control = this.pacienteForm.get(field);
    return !!control && (control.dirty || control.touched) && control.hasError(error);
  }

  getErrorMessage(field: string): string {
    const control = this.pacienteForm.get(field);
    if (!control || !(control.dirty || control.touched)) {
      return '';
    }
    if (control.hasError('required')) {
      return `El campo ${field} es obligatorio.`;
    }
    if (control.hasError('minLength')) {
      return `El campo ${field} debe tener al menos 1 carácter.`;
    }
    return '';
  }

  cerrar(): void {
    if (this.guardando()) {
      return;
    }
    this.close.emit();
  }

  onSubmit(): void {
    if (this.guardando()) {
      return;
    }

    if (this.pacienteForm.invalid) {
      this.pacienteForm.markAllAsTouched();
      return;
    }

    const datos = this.pacienteForm.getRawValue();
    this.save.emit(datos);
  }
}
