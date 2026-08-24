import {
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Accion,
  Modulo,
  PermisoRol,
  PermisoRolRespuesta,
  Rol,
  SeleccionPermisos,
} from '../../models/roles.models';
import { PermisosModuloAccordion } from '../permisos-modulo-accordion/permisos-modulo-accordion';

export interface RolModalGuardar {
  nombre: string;
  descripcion: string | null;
  permisos: PermisoRol[];
}

@Component({
  selector: 'app-rol-modal',
  imports: [ReactiveFormsModule, PermisosModuloAccordion],
  templateUrl: './rol-modal.html',
  styleUrl: './rol-modal.css',
})
export class RolModal {
  readonly open = input(false);
  readonly rol = input<Rol | null>(null);
  readonly modulos = input<Modulo[]>([]);
  readonly acciones = input<Accion[]>([]);
  readonly permisosCargando = input(false);
  readonly permisos = input<PermisoRolRespuesta[]>([]);
  readonly guardando = input(false);
  readonly errorServer = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<RolModalGuardar>();

  private readonly fb = inject(FormBuilder);

  protected readonly seleccion = signal<SeleccionPermisos>({});
  protected readonly accionPorDefectoId = computed<number | null>(
    () => this.acciones()[0]?.id ?? null,
  );

  protected readonly rolForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  private readonly sincronizarFormulario = effect(() => {
    if (!this.open()) {
      return;
    }
    const rol = this.rol();
    this.rolForm.reset({
      nombre: rol?.nombre ?? '',
      descripcion: rol?.descripcion ?? '',
    });
    this.seleccion.set({});
  });

  private readonly sincronizarPermisos = effect(() => {
    if (!this.open() || this.permisosCargando()) {
      return;
    }
    const mapa: SeleccionPermisos = {};
    for (const permiso of this.permisos()) {
      mapa[permiso.funcion_id] = permiso.accion_id;
    }
    this.seleccion.set(mapa);
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

  hasError(error: string): boolean {
    const control = this.rolForm.get('nombre');
    return (
      !!control && (control.dirty || control.touched) && control.hasError(error)
    );
  }

  nombreErrorMessage(): string {
    const control = this.rolForm.get('nombre');
    if (!control || !(control.dirty || control.touched)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'El nombre del rol es obligatorio.';
    }
    return '';
  }

  cerrar(): void {
    if (this.guardando()) {
      return;
    }
    this.close.emit();
  }

  alternarFuncion(payload: {
    funcionId: number;
    activado: boolean;
    accionId: number | null;
  }): void {
    this.seleccion.update((actual) => {
      const copia = { ...actual };
      if (payload.activado) {
        copia[payload.funcionId] = payload.accionId ?? this.accionPorDefectoId() ?? 0;
      } else {
        delete copia[payload.funcionId];
      }
      return copia;
    });
  }

  cambiarAccion(payload: { funcionId: number; accionId: number }): void {
    this.seleccion.update((actual) => ({
      ...actual,
      [payload.funcionId]: payload.accionId,
    }));
  }

  alternarTodo(payload: { moduloId: number; activado: boolean }): void {
    const modulo = this.modulos().find((m) => m.id === payload.moduloId);
    if (!modulo) {
      return;
    }
    this.seleccion.update((actual) => {
      const copia = { ...actual };
      for (const funcion of modulo.funciones) {
        if (payload.activado) {
          copia[funcion.id] =
            copia[funcion.id] ?? this.accionPorDefectoId() ?? 0;
        } else {
          delete copia[funcion.id];
        }
      }
      return copia;
    });
  }

  onSubmit(): void {
    if (this.guardando()) {
      return;
    }

    const nombreControl = this.rolForm.get('nombre');
    if (!nombreControl) {
      return;
    }

    const nombre = nombreControl.value.trim();
    if (!nombre || this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }

    const descripcion = (this.rolForm.get('descripcion')?.value ?? '').trim();
    const descripcionEnviar =
      descripcion === '' ? (this.rol() ? '' : null) : descripcion;

    const permisos: PermisoRol[] = Object.entries(this.seleccion()).map(
      ([funcionId, accionId]) => ({
        funcion_id: Number(funcionId),
        accion_id: accionId,
      }),
    );

    this.save.emit({
      nombre,
      descripcion: descripcionEnviar,
      permisos,
    });
  }
}
