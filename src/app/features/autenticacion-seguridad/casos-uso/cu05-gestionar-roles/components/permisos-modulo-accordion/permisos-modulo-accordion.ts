import { Component, input, output, signal } from '@angular/core';
import { Accion, Modulo, SeleccionPermisos } from '../../models/roles.models';

@Component({
  selector: 'app-permisos-modulo-accordion',
  imports: [],
  templateUrl: './permisos-modulo-accordion.html',
  styleUrl: './permisos-modulo-accordion.css',
})
export class PermisosModuloAccordion {
  readonly modulos = input<Modulo[]>([]);
  readonly acciones = input<Accion[]>([]);
  readonly seleccion = input<SeleccionPermisos>({});
  readonly deshabilitado = input(false);

  readonly toggleFuncion = output<{
    funcionId: number;
    activado: boolean;
    accionId: number | null;
  }>();
  readonly cambiarAccion = output<{ funcionId: number; accionId: number }>();
  readonly toggleTodo = output<{ moduloId: number; activado: boolean }>();

  protected readonly abiertos = signal<Record<number, boolean>>({});

  estaAbierto(moduloId: number): boolean {
    return this.abiertos()[moduloId] === true;
  }

  alternarModulo(moduloId: number): void {
    this.abiertos.update((estado) => ({
      ...estado,
      [moduloId]: estado[moduloId] !== true,
    }));
  }

  accionDe(funcionId: number): number | null {
    return this.seleccion()[funcionId] ?? null;
  }

  contadorSeleccionadas(moduloId: number): number {
    const modulo = this.modulos().find((m) => m.id === moduloId);
    if (!modulo) {
      return 0;
    }
    return modulo.funciones.filter((f) => this.seleccion()[f.id] != null).length;
  }

  moduloCompleto(modulo: Modulo): boolean {
    return (
      modulo.funciones.length > 0 &&
      modulo.funciones.every((funcion) => this.seleccion()[funcion.id] != null)
    );
  }

  onToggleFuncion(funcionId: number, event: Event): void {
    const activado = (event.target as HTMLInputElement).checked;
    this.toggleFuncion.emit({
      funcionId,
      activado,
      accionId: activado ? this.accionDe(funcionId) : null,
    });
  }

  onCambiarAccion(funcionId: number, event: Event): void {
    const accionId = Number((event.target as HTMLSelectElement).value);
    this.cambiarAccion.emit({ funcionId, accionId });
  }

  onToggleTodo(modulo: Modulo, event: Event): void {
    const activado = (event.target as HTMLInputElement).checked;
    this.toggleTodo.emit({ moduloId: modulo.id, activado });
  }
}
