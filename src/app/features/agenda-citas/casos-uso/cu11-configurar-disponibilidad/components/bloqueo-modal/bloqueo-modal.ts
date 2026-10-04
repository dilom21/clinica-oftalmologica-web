import {
  Component,
  effect,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BloqueoHorario,
  BloqueoHorarioGuardar,
} from '../../models/configuracion-disponibilidad.models';

function horaCorta(hora: string | null): string {
  if (!hora) {
    return '';
  }
  return hora.length >= 5 ? hora.slice(0, 5) : hora;
}

function fechaDeHoy(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

@Component({
  selector: 'app-cu11-bloqueo-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './bloqueo-modal.html',
  styleUrl: './bloqueo-modal.css',
})
export class BloqueoModal {
  readonly abierto = input(false);
  readonly bloqueo = input<BloqueoHorario | null>(null);
  readonly guardando = input(false);
  readonly errorServer = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<BloqueoHorarioGuardar>();

  private readonly fb = inject(FormBuilder);

  protected readonly fechaMinima = fechaDeHoy();

  protected readonly bloqueoForm = this.fb.nonNullable.group({
    fecha: ['', [Validators.required]],
    hora_inicio: ['', [Validators.required]],
    hora_fin: ['', [Validators.required]],
    motivo: [''],
  });

  private readonly sincronizarFormulario = effect(() => {
    if (!this.abierto()) {
      return;
    }
    const bloqueo = this.bloqueo();
    this.bloqueoForm.reset({
      fecha: bloqueo?.fecha ?? '',
      hora_inicio: horaCorta(bloqueo?.hora_inicio ?? ''),
      hora_fin: horaCorta(bloqueo?.hora_fin ?? ''),
      motivo: bloqueo?.motivo ?? '',
    });
  });

  private readonly bloquearScroll = effect((onCleanup) => {
    if (this.abierto()) {
      document.body.style.overflow = 'hidden';
    }
    onCleanup(() => {
      document.body.style.overflow = '';
    });
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto() && !this.guardando()) {
      this.close.emit();
    }
  }

  ordenInvalido(): boolean {
    const inicio = this.bloqueoForm.get('hora_inicio')?.value;
    const fin = this.bloqueoForm.get('hora_fin')?.value;
    return !!inicio && !!fin && inicio >= fin;
  }

  hasError(field: string): boolean {
    const control = this.bloqueoForm.get(field);
    return (
      !!control && (control.dirty || control.touched) && control.hasError('required')
    );
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

    if (this.bloqueoForm.invalid || this.ordenInvalido()) {
      this.bloqueoForm.markAllAsTouched();
      return;
    }

    const valores = this.bloqueoForm.getRawValue();
    this.save.emit({
      fecha: valores.fecha,
      hora_inicio: valores.hora_inicio,
      hora_fin: valores.hora_fin,
      motivo: valores.motivo.trim() ? valores.motivo : null,
    });
  }
}
