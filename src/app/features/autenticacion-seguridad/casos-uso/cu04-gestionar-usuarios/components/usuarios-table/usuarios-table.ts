import { Component, input, output } from '@angular/core';
import { Usuario } from '../../models/usuarios.models';

@Component({
  selector: 'app-usuarios-table',
  imports: [],
  templateUrl: './usuarios-table.html',
  styleUrl: './usuarios-table.css',
})
export class UsuariosTable {
  readonly usuarios = input<Usuario[]>([]);
  readonly usuarioActualId = input<number | null>(null);
  readonly mensajeVacio = input('No se encontraron usuarios.');

  readonly editar = output<Usuario>();
  readonly cambiarEstado = output<Usuario>();

  esUsuarioActual(usuario: Usuario): boolean {
    return this.usuarioActualId() !== null && this.usuarioActualId() === usuario.id;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(fecha));
  }

  estadoTooltip(usuario: Usuario): string {
    if (usuario.estado && this.esUsuarioActual(usuario)) {
      return 'No puedes deshabilitar tu propia cuenta';
    }
    return usuario.estado ? 'Deshabilitar usuario' : 'Habilitar usuario';
  }
}
