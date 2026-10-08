import { Component, input, OnInit, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuModulo } from '../../models/menu.models';
import { MenuService } from '../../services/menu.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/autenticacion-seguridad/Auth/services/auth.service';
import { TenantCompany } from '../../../features/autenticacion-seguridad/Auth/models/auth.models';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  readonly mobileOpen = input(false);
  readonly mobileClose = output<void>();

  protected readonly modulos = signal<MenuModulo[]>([]);
  protected readonly menuError = signal(false);
  protected readonly companyName = signal('Empresa no verificada');
  private companies: TenantCompany[] = [];
  private menuVerified = false;
  private readonly tokenAtLoad = localStorage.getItem('access_token');
  protected readonly openModuleId = signal<number | null>(null);
  protected readonly selectedModuleId = signal<number | null>(null);
  protected readonly selectedFuncionId = signal<number | null>(null);

  private readonly rutasFunciones: ReadonlyMap<string, string> = new Map([
    ['gestionar usuarios', '/usuarios'],
    ['gestionar roles y permisos', '/roles'],
    ['gestionar pacientes', '/pacientes'],
    ['consultar historial clínico', '/historial-clinico'],
    ['registrar consulta clínica', '/registrar-consulta-clinica'],
    ['registrar diagnóstico', '/registrar-diagnostico'],
    ['registrar diagnostico', '/registrar-diagnostico'],
    ['consultar bitácora', '/bitacora'],
    ['consultar agenda y disponibilidad médica', '/agenda-disponibilidad'],
    ['configurar disponibilidad del oftalmólogo', '/configurar-disponibilidad'],
    ['gestionar citas médicas', '/gestionar-citas'],
    ['consultar historial de citas', '/historial-citas'],
    ['generar reportes', '/reportes'],
  ]);

  private readonly iconosPorNombre: ReadonlyArray<{
    clave: string;
    nombres: ReadonlyArray<string>;
  }> = [
    { clave: 'seguridad', nombres: ['seguridad', 'autenticacion'] },
    { clave: 'agenda', nombres: ['agenda', 'cita'] },
    { clave: 'pacientes', nombres: ['paciente', 'historial'] },
    { clave: 'inventario', nombres: ['inventario', 'proveedor'] },
    { clave: 'pagos', nombres: ['pago'] },
    { clave: 'reportes', nombres: ['reporte'] },
  ];

  constructor(private readonly menuService: MenuService,
    private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.menuService.obtenerMenu().subscribe({
      next: (modulos) => { this.modulos.set(modulos); this.menuVerified = true; this.updateCompany(); },
      error: () => this.menuError.set(true),
    });
    if (typeof this.auth.tenantCode === 'function' && this.auth.tenantCode(this.tokenAtLoad)) {
      this.auth.companies().subscribe({
        next: (companies) => { this.companies = companies; this.updateCompany(); },
        error: () => this.companyName.set('Empresa no verificada'),
      });
    } else {
      this.companyName.set('Acceso anterior (sin empresa tenant)');
    }
  }

  private updateCompany(): void {
    if ((!this.menuVerified && !this.auth.hasFreshTenantToken(this.tokenAtLoad)) ||
      localStorage.getItem('access_token') !== this.tokenAtLoad) return;
    const code = this.auth.tenantCode(this.tokenAtLoad);
    const company = this.companies.find((item) => item.codigo === code);
    if (company) this.companyName.set(company.nombre);
  }

  cambiarEmpresa(): void {
    this.auth.logout();
    this.cerrarSiMovil();
    void this.router.navigate(['/login']);
  }

  iconoPara(modulo: MenuModulo): string {
    const nombre = modulo.nombre.toLowerCase();
    const coincidencia = this.iconosPorNombre.find((grupo) =>
      grupo.nombres.some((clave) => nombre.includes(clave)),
    );
    return coincidencia?.clave ?? 'modulo';
  }

 rutaDeFuncion(nombre: string): string | null {
  const clave = nombre.toLowerCase().trim();

  if (this.rutasFunciones.has(clave)) {
    return this.rutasFunciones.get(clave)!;
  }

  if (clave.includes('roles') && clave.includes('permisos')) {
    return '/roles';
  }

  if (clave.includes('usuario')) {
    return '/usuarios';
  }

  if (clave.includes('pacientes')) {
    return '/pacientes';
  }

  if (clave.includes('historial') && clave.includes('clínico')) {
    return '/historial-clinico';
  }

  if (clave.includes('historial') && clave.includes('clinico')) {
    return '/historial-clinico';
  }

  if (clave.includes('bitácora') || clave.includes('bitacora')) {
    return '/bitacora';
  }

  if (clave.includes('agenda') && clave.includes('disponibilidad')) {
    return '/agenda-disponibilidad';
  }

  if (clave.includes('disponibilidad') && clave.includes('configurar')) {
    return '/configurar-disponibilidad';
  }

  if (clave.includes('historial') && clave.includes('cita')) {
    return '/historial-citas';
}
   if (clave.includes('cita') && clave.includes('gestionar')) {
    return '/gestionar-citas';
   }

   if (clave.includes('reporte')) {
     return '/reportes';
   }

  if (clave.includes('registrar') && (clave.includes('diagnóstico') || clave.includes('diagnostico'))) {
    return '/registrar-diagnostico';
  }

  if (clave.includes('registrar') && clave.includes('consulta')) {
    return '/registrar-consulta-clinica';
  }

  return null;
}

  alternarModulo(id: number): void {
    this.openModuleId.update((abierto) => (abierto === id ? null : id));
    this.selectedModuleId.set(id);
    this.selectedFuncionId.set(null);
  }

  seleccionarFuncion(moduloId: number, funcionId: number): void {
    this.selectedModuleId.set(moduloId);
    this.selectedFuncionId.set(funcionId);
    this.cerrarSiMovil();
  }

  navegarInicio(): void {
    this.cerrarSiMovil();
  }

  cerrarMovil(): void {
    this.mobileClose.emit();
  }

  private cerrarSiMovil(): void {
    if (this.mobileOpen()) {
      this.cerrarMovil();
    }
  }
}
