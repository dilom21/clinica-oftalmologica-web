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
  DIAS_SEMANA,
  HorarioOftalmologo,
  HorarioOftalmologoGuardar,
} from '../../models/configuracion-disponibilidad.models';

function horaCorta(hora: string | null): string {
  if (!hora) {
    return '';
  }
  return hora.length >= 5 ? hora.slice(0, 5) : hora;
}

@Component({
  selector: 'app-cu11-horario-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './horario-modal.html',
  styleUrl: './horario-modal.css',
})
export class HorarioModal {
  readonly abierto = input(false);
  readonly horario = input<HorarioOftalmologo | null>(null);
  readonly guardando = input(false);
  readonly errorServer = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<HorarioOftalmologoGuardar>();

  protected readonly diasSemana = DIAS_SEMANA;

  private readonly fb = inject(FormBuilder);

  protected readonly horarioForm = this.fb.nonNullable.group({
    dia_semana: ['', [Validators.required]],
    hora_inicio: ['', [Validators.required]],
    hora_fin: ['', [Validators.required]],
  });

  private readonly sincronizarFormulario = effect(() => {
    if (!this.abierto()) {
      return;
    }
    const horario = this.horario();
    this.horarioForm.reset({
      dia_semana: horario ? String(horario.dia_semana) : '',
      hora_inicio: horaCorta(horario?.hora_inicio ?? ''),
      hora_fin: horaCorta(horario?.hora_fin ?? ''),
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
    const inicio = this.horarioForm.get('hora_inicio')?.value;
    const fin = this.horarioForm.get('hora_fin')?.value;
    return !!inicio && !!fin && inicio >= fin;
  }

  nombreDiaHorario(): string {
    const horario = this.horario();
    if (!horario) {
      return '';
    }
    const dia = this.diasSemana.find((d) => d.numero === horario.dia_semana);
    return dia?.nombre ?? '';
  }

  tituloModal(): string {
    const horario = this.horario();
    if (!horario) {
      return 'Agregar horario semanal';
    }
    const dia = this.nombreDiaHorario();
    return dia ? `Editar horario de ${dia}` : 'Editar horario';
  }

  hasError(field: string): boolean {
    const control = this.horarioForm.get(field);
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

    if (this.horarioForm.invalid || this.ordenInvalido()) {
      this.horarioForm.markAllAsTouched();
      return;
    }

    const valores = this.horarioForm.getRawValue();
    this.save.emit({
      dia_semana: Number(valores.dia_semana),
      hora_inicio: valores.hora_inicio,
      hora_fin: valores.hora_fin,
    });
  }
}
