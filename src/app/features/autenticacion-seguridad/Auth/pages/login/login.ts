import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly passwordVisible = signal(false);
  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly loginForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.loginForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  hasError(field: 'email' | 'password', error: string): boolean {
    const control = this.loginForm.get(field);
    return !!control && (control.dirty || control.touched) && control.hasError(error);
  }

  showErrorMessage(field: 'email' | 'password'): string {
    const control = this.loginForm.get(field);
    if (!control || !(control.dirty || control.touched)) {
      return '';
    }

    if (control.hasError('required')) {
      return field === 'email'
        ? 'El correo electrónico es obligatorio.'
        : 'La contraseña es obligatoria.';
    }

    if (field === 'email' && control.hasError('email')) {
      return 'Ingresa un correo electrónico válido.';
    }

    return '';
  }

  onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.loading.set(true);

    const { email, password } = this.loginForm.getRawValue();

    const request: LoginRequest = {
      correo: email,
      password,
    };

    this.authService.login(request).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', response.access_token);
        this.loading.set(false);
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleLoginError(err);
      },
    });
  }

  private handleLoginError(err: unknown): void {
    const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;

    if (status === 401) {
      this.serverError.set('Correo o contraseña incorrectos.');
      return;
    }

    if (status === 403) {
      this.serverError.set('Usuario inactivo. Comuníquese con administración.');
      return;
    }

    if (status === 0) {
      this.serverError.set('No se pudo conectar con el servidor.');
      return;
    }

    this.serverError.set('Ocurrió un error al iniciar sesión.');
  }
}