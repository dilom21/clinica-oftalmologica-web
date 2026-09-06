import { Component, input, output } from '@angular/core';
import { Usuario } from '../../models/usuarios.models';

@Component({
  selector: 'app-usuario-estado-dialog',
  imports: [],
  templateUrl: './usuario-estado-dialog.html',
  styleUrl: './usuario-estado-dialog.css',
})
export class UsuarioEstadoDialog {
  readonly usuario = input<Usuario | null>(null);
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly confirm = output<void>();

  objetivo(): boolean {
    const usuario = this.usuario();
    return usuario ? !usuario.estado : false;
  }

  cancelar(): void {
    if (this.procesando()) {
      return;
    }
    this.close.emit();
  }
}
