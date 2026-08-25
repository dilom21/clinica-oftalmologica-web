import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-restablecer-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './restablecer-password.html',
  styleUrl: './restablecer-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');

  protected readonly resetForm = this.fb.nonNullable.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmarPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly tokenValido = computed(() => this.token().trim().length > 0);

  hasError(field: 'nuevaPassword' | 'confirmarPassword', error: string): boolean {
    const control = this.resetForm.get(field);
    return !!control && (control.dirty || control.touched) && control.hasError(error);
  }

  passwordMismatch(): boolean {
    const { nuevaPassword, confirmarPassword } = this.resetForm.getRawValue();
    const confirmar = this.resetForm.get('confirmarPassword');
    return (
      !!confirmar &&
      (confirmar.dirty || confirmar.touched) &&
      nuevaPassword.length > 0 &&
      confirmarPassword.length > 0 &&
      nuevaPassword !== confirmarPassword
    );
  }

  onSubmit(): void {
    if (this.loading() || !this.tokenValido()) {
      return;
    }

    if (this.resetForm.invalid || this.passwordMismatch()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { nuevaPassword } = this.resetForm.getRawValue();

    this.serverError.set(null);
    this.successMessage.set(null);
    this.loading.set(true);

    this.authService
      .restablecerPassword({
        token: this.token().trim(),
        nueva_password: nuevaPassword,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.successMessage.set(response.mensaje);
          this.resetForm.reset();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.handleError(err);
        },
      });
  }

  private handleError(err: unknown): void {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? (err as { status?: number }).status
        : undefined;

    const detail =
      err && typeof err === 'object' && 'error' in err
        ? (err as { error?: { detail?: string } }).error?.detail
        : undefined;

    if (status === 400) {
      this.serverError.set(detail ?? 'El enlace es invalido o expiro.');
      return;
    }

    if (status === 0) {
      this.serverError.set('No se pudo conectar con el servidor.');
      return;
    }

    this.serverError.set('No fue posible restablecer la contrasena.');
  }
}
