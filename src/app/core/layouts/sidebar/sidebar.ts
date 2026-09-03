import { Component, input, OnInit, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuModulo } from '../../models/menu.models';
import { MenuService } from '../../services/menu.service';

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
  protected readonly openModuleId = signal<number | null>(null);
  protected readonly selectedModuleId = signal<number | null>(null);
  protected readonly selectedFuncionId = signal<number | null>(null);

  private readonly rutasFunciones: ReadonlyMap<string, string> = new Map([
    ['gestionar usuarios', '/usuarios'],
    ['gestionar roles y permisos', '/roles'],
    ['gestionar pacientes', '/pacientes'],
    ['consultar bitácora', '/bitacora'],
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

  constructor(private readonly menuService: MenuService) {}

  ngOnInit(): void {
    this.menuService.obtenerMenu().subscribe({
      next: (modulos) => this.modulos.set(modulos),
      error: () => this.menuError.set(true),
    });
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

  if (clave.includes('bitácora') || clave.includes('bitacora')) {
    return '/bitacora';
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