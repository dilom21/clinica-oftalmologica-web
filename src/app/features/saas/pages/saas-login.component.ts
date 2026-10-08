import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SaasAuthService } from '../services/saas-auth.service';

export function safeSaasLoginMessage(error: { status?: number } | null | undefined): string {
  switch (error?.status) {
    case 401: case 403: return 'No se pudo validar el acceso a la plataforma.';
    case 422: return 'Revisa los datos ingresados.';
    default: return error?.status !== undefined && error.status >= 500 ? 'La plataforma no está disponible en este momento.' : 'No se pudo iniciar sesión. Intenta nuevamente.';
  }
}

@Component({
  selector: 'app-saas-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
   template: `<main class="login-page"><section class="login-card" aria-labelledby="title"><div class="brand"><b>S</b><strong>PLATAFORMA SAAS<small>Administración central</small></strong></div><p class="eyebrow">Acceso seguro</p><h1 id="title">Administrador SaaS</h1><p class="intro">Gestiona empresas, planes y tenants desde una consola separada de las clínicas.</p><form [formGroup]="form" (ngSubmit)="submit()"><label for="correo">Correo electrónico</label><input id="correo" type="email" formControlName="correo" autocomplete="username"><label for="password">Contraseña</label><input id="password" type="password" formControlName="password" autocomplete="current-password"><p class="error" role="alert" aria-live="assertive" *ngIf="error()">{{error()}}</p><button type="submit" [disabled]="form.invalid || loading()">{{loading() ? 'Validando…' : 'Ingresar a la plataforma'}}</button></form><p class="notice">No utilices credenciales de una clínica tenant en este acceso.</p></section></main>`,
  styles: [`:host{display:block}.login-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:#f0f7fc}.login-card{width:min(100%,460px);background:#fff;border:1px solid #dbe7f0;border-radius:18px;padding:36px;box-shadow:0 18px 45px #102a4314}.brand{display:flex;align-items:center;gap:12px;margin-bottom:34px;color:#102a43}.brand b{display:grid;place-items:center;background:#102a43;color:#38bdf8;width:42px;height:42px;border-radius:12px;font-size:1.35rem}.brand strong,.brand small{display:block}.brand strong{font-size:.78rem;letter-spacing:.1em}.brand small{color:#64748b;font-size:.75rem;margin-top:3px}.eyebrow{color:#1683b6;text-transform:uppercase;letter-spacing:.11em;font-weight:800;font-size:.72rem;margin:0 0 8px}h1{font-size:2.3rem;margin:0;color:#102a43}.intro,.notice{color:#64748b}.intro{margin:10px 0 28px}form{display:grid;gap:8px}label{font-size:.85rem;font-weight:700;color:#334e68;margin-top:6px}input{padding:12px;border:1px solid #b8d5e8;border-radius:8px;font:inherit}button{margin-top:10px;border:0;border-radius:8px;padding:13px;background:#1261a0;color:#fff;font-weight:800;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}.error{color:#be123c;background:#fff1f2;padding:12px;border-radius:8px}.notice{font-size:.78rem;margin:24px 0 0}`],
})
export class SaasLoginComponent {
  private readonly fb = inject(FormBuilder); private readonly auth = inject(SaasAuthService); private readonly router = inject(Router);
   readonly form = this.fb.nonNullable.group({ correo: ['', [Validators.required, Validators.email]], password: ['', Validators.required] }); readonly loading = signal(false); readonly error = signal('');
   submit(): void { if (this.form.invalid) return; this.loading.set(true); this.error.set(''); this.auth.login(this.form.getRawValue()).subscribe({ next: () => { this.loading.set(false); void this.router.navigate(['/saas']); }, error: (error) => { this.loading.set(false); this.error.set(safeSaasLoginMessage(error)); } }); }
}
