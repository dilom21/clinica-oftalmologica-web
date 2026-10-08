import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../autenticacion-seguridad/Auth/services/auth.service';
import { TenantCompany } from '../../autenticacion-seguridad/Auth/models/auth.models';
import { SaasCollectionComponent } from './saas-collection.component';

@Component({
  selector: 'app-saas-companies',
  imports: [SaasCollectionComponent],
  template: `
    <section class="open-company" aria-labelledby="open-company-title">
      <h2 id="open-company-title">Abrir empresa en el sistema clínico</h2>
      <p>Requiere credenciales propias de la empresa; no se inicia sesión automáticamente.</p>
      @if (loading()) { <p role="status">Cargando empresas disponibles…</p> }
      @if (error()) { <p role="alert">No se pudo cargar la lista de empresas disponibles.</p> }
      @if (!loading() && !error()) {
        <ul>
          @for (company of companies(); track company.codigo) {
            <li><span>{{ company.nombre }}</span><button type="button" (click)="open(company.codigo)" [attr.aria-label]="'Abrir empresa ' + company.nombre">Abrir empresa</button></li>
          } @empty { <li>No hay empresas disponibles para iniciar sesión.</li> }
        </ul>
      }
    </section>
    <app-saas-collection />
  `,
  styles: [`
    .open-company { background:#fff; border:1px solid #e1eaf2; border-radius:12px; padding:1rem; margin:0 auto 1rem; max-width:1500px; }
    h2 { font-size:1.1rem; color:#102a43; margin:0; }
    p { color:#486581; }
    ul { display:flex; flex-wrap:wrap; gap:.65rem; list-style:none; padding:0; }
    li { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; border:1px solid #e1eaf2; padding:.5rem; border-radius:8px; }
    button { border:1px solid #b8d5e8; background:#fff; color:#1261a0; border-radius:6px; padding:.5rem; cursor:pointer; }
    button:focus-visible { outline:2px solid #1261a0; outline-offset:2px; }
  `],
})
export class SaasCompaniesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly companies = signal<TenantCompany[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.auth.companies().subscribe({
      next: (companies) => { this.companies.set(companies); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); },
    });
  }

  open(code: string): void {
    if (!this.companies().some((company) => company.codigo === code)) return;
    this.auth.logout();
    void this.router.navigate(['/login'], { queryParams: { empresa: code } });
  }
}
