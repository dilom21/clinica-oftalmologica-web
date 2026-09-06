import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  Component,
  HostListener,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  RolUsuario,
  Usuario,
  UsuarioActualizar,
  UsuarioCrear,
} from '../../models/usuarios.models';

export type UsuarioModalGuardar = UsuarioCrear | UsuarioActualizar;

interface UsuarioForma {
  correo: FormControl<string>;
  rolId: FormControl<number | null>;
  password: FormControl<string>;
  confirmarPassword: FormControl<string>;
}

/** Retorna error si hay contenido y no contiene al menos una mayúscula. */
const validadorMayuscula: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (!valor) {
    return null;
  }
  return /[A-ZÁÉÍÓÚÜÑ]/.test(valor) ? null : { mayuscula: true };
};

/** Retorna error si hay contenido y no contiene al menos una minúscula. */
const validadorMinuscula: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (!valor) {
    return null;
  }
  return /[a-záéíóúüñ]/.test(valor) ? null : { minuscula: true };
};

/** Retorna error si hay contenido y no contiene al menos un número. */
const validadorNumero: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (!valor) {
    return null;
  }
  return /\d/.test(valor) ? null : { numero: true };
};

/** Valida que contraseña y confirmación coincidan cuando hay contenido. */
const validadorCoincidencia: ValidatorFn = (
  grupo: AbstractControl,
): ValidationErrors | null => {
  const g = grupo as FormGroup;
  const password = String(g.get('password')?.value ?? '');
  const confirmar = String(g.get('confirmarPassword')?.value ?? '');
  if (!password && !confirmar) {
    return null;
  }
  return password === confirmar ? null : { noCoinciden: true };
};

@Component({
  selector: 'app-usuario-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-modal.html',
  styleUrl: './usuario-modal.css',
})
export class UsuarioModal {
  readonly open = input(false);
  readonly usuario = input<Usuario | null>(null);
  readonly roles = input<RolUsuario[]>([]);
  readonly guardando = input(false);
  readonly errorServer = input<string | null>(null);

  readonly close = output<void>();
  readonly save = output<UsuarioModalGuardar>();

  private readonly validadoresPassword: ValidatorFn[] = [
    Validators.minLength(8),
    validadorMayuscula,
    validadorMinuscula,
    validadorNumero,
  ];

  protected readonly mostrarPassword = signal(false);
  protected readonly mostrarConfirmacion = signal(false);

  protected usuarioForm: FormGroup<UsuarioForma> =
    this.construirFormulario(null);

  private readonly sincronizarFormulario = effect(() => {
    if (!this.open()) {
      return;
    }
    this.usuarioForm = this.construirFormulario(this.usuario());
    this.mostrarPassword.set(false);
    this.mostrarConfirmacion.set(false);
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

  esEdicion(): boolean {
    return this.usuario() !== null;
  }

  tipoPassword(): string {
    return this.mostrarPassword() ? 'text' : 'password';
  }

  tipoConfirmacion(): string {
    return this.mostrarConfirmacion() ? 'text' : 'password';
  }

  alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  alternarConfirmacion(): void {
    this.mostrarConfirmacion.update((visible) => !visible);
  }

  mostrarAyudaPassword(): boolean {
    if (this.esEdicion()) {
      return String(this.usuarioForm.get('password')?.value ?? '').length > 0;
    }
    return true;
  }
  private construirFormulario(usuario: Usuario | null): FormGroup<UsuarioForma> {
    const edicion = usuario !== null;
    const validadoresPassword = edicion
      ? [...this.validadoresPassword]
      : [Validators.required, ...this.validadoresPassword];
    const validadoresConfirmacion = edicion ? [] : [Validators.required];

    return new FormGroup<UsuarioForma>(
      {
        correo: new FormControl<string>(usuario?.correo ?? '', {
          nonNullable: true,
          validators: [Validators.required, Validators.email],
        }),
        rolId: new FormControl<number | null>(usuario?.rol_id ?? null, {
          validators: [Validators.required],
        }),
        password: new FormControl<string>('', {
          nonNullable: true,
          validators: validadoresPassword,
        }),
        confirmarPassword: new FormControl<string>('', {
          nonNullable: true,
          validators: validadoresConfirmacion,
        }),
      },
      { validators: validadorCoincidencia },
    );
  }

  private procesado(
    campo: 'correo' | 'rolId' | 'password' | 'confirmarPassword',
  ): boolean {
    const control = this.usuarioForm.get(campo);
    return !!control && (control.dirty || control.touched);
  }

  correoErrorMessage(): string {
    const control = this.usuarioForm.get('correo');
    if (!control || !this.procesado('correo')) {
      return '';
    }
    if (control.hasError('required')) {
      return 'El correo electrónico es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'El correo electrónico no es válido.';
    }
    return '';
  }

  rolErrorMessage(): string {
    if (!this.procesado('rolId')) {
      return '';
    }
    const control = this.usuarioForm.get('rolId');
    if (control?.hasError('required')) {
      return 'Debes seleccionar un rol en el sistema.';
    }
    return '';
  }

  passwordErrorMessage(): string {
    const control = this.usuarioForm.get('password');
    if (!control || !this.procesado('password')) {
      return '';
    }
    if (control.hasError('required')) {
      return 'La contraseña es obligatoria.';
    }
    if (control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (control.hasError('mayuscula')) {
      return 'Debe contener al menos una letra mayúscula.';
    }
    if (control.hasError('minuscula')) {
      return 'Debe contener al menos una letra minúscula.';
    }
    if (control.hasError('numero')) {
      return 'Debe contener al menos un número.';
    }
    return '';
  }

  confirmarErrorMessage(): string {
    const control = this.usuarioForm.get('confirmarPassword');
    if (!control) {
      return '';
    }
    if (!this.procesado('confirmarPassword') && !this.procesado('password')) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Confirma la contraseña.';
    }
    if (this.usuarioForm.hasError('noCoinciden')) {
      const password = String(this.usuarioForm.get('password')?.value ?? '');
      const confirmar = String(control.value ?? '');
      if (!confirmar && password) {
        return 'Debes confirmar la nueva contraseña.';
      }
      return 'Las contraseñas no coinciden.';
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

    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const correo = String(this.usuarioForm.get('correo')?.value ?? '').trim();
    const rolIdValor = this.usuarioForm.get('rolId')?.value;
    if (rolIdValor === null || rolIdValor === undefined) {
      this.usuarioForm.markAllAsTouched();
      return;
    }
    const rolId = Number(rolIdValor);
    const password = String(this.usuarioForm.get('password')?.value ?? '');

    if (this.esEdicion()) {
      const datos: UsuarioActualizar = { correo, rol_id: rolId };
      if (password) {
        datos.password = password;
      }
      this.save.emit(datos);
      return;
    }

    const datos: UsuarioCrear = { correo, password, rol_id: rolId };
    this.save.emit(datos);
  }
}
