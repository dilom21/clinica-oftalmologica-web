import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, TenantCompany } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly companies = signal<TenantCompany[]>([]);
  protected readonly companiesLoading = signal(true);
  protected readonly companiesError = signal(false);
  protected readonly legacy = signal(false);
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
      company: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void { this.loadCompanies(); }

  protected loadCompanies(): void {
    this.companiesLoading.set(true);
    this.companiesError.set(false);
    this.authService.companies().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (companies) => {
        this.companies.set(companies);
        const requested = this.route.snapshot.queryParamMap.get('empresa');
        const selected = companies.find((company) => company.codigo === requested);
        this.loginForm.controls.company.setValue(selected?.codigo ?? '');
        this.companiesLoading.set(false);
      },
      error: () => { this.companiesLoading.set(false); this.companiesError.set(true); },
    });
  }

  protected toggleLegacy(): void {
    if (this.loading()) return;
    this.legacy.update((value) => !value);
    this.serverError.set(null);
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

    if (this.loginForm.controls.email.invalid || this.loginForm.controls.password.invalid ||
      (!this.legacy() && (this.loginForm.controls.company.invalid || this.companiesLoading() || this.companiesError()))) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.loading.set(true);

    const { email, password, company } = this.loginForm.getRawValue();

    const request: LoginRequest = {
      correo: email,
      password,
    };

    const isLegacy = this.legacy();
    const call = isLegacy ? this.authService.login(request) :
      this.authService.tenantLogin({ ...request, empresa_codigo: company });
    // Never retain company A's clinical token while authenticating to B.
    this.authService.logout();
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (isLegacy) {
          this.authService.logout();
          localStorage.setItem('access_token', response.access_token);
        } else if (!this.authService.acceptTenantToken(response.access_token, company)) {
          this.authService.logout();
          this.loading.set(false);
          this.serverError.set('No se pudo validar la sesión de esta empresa. Intenta nuevamente.');
          return;
        }
        this.loading.set(false);
        void this.router.navigate(['/inicio']);
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
      this.serverError.set(this.legacy() ? 'Usuario inactivo. Comuníquese con administración.' : 'No se puede acceder a esta empresa. Consulta con administración.');
      return;
    }

    if (status === 0) {
      this.serverError.set('No se pudo conectar con el servidor.');
      return;
    }

    this.serverError.set('Ocurrió un error al iniciar sesión.');
  }
}
