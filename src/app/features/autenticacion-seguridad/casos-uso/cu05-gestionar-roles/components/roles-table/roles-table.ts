import { Component, input, output } from '@angular/core';
import { Rol } from '../../models/roles.models';

@Component({
  selector: 'app-roles-table',
  imports: [],
  templateUrl: './roles-table.html',
  styleUrl: './roles-table.css',
})
export class RolesTable {
  readonly roles = input<Rol[]>([]);
  readonly editar = output<Rol>();
  readonly eliminar = output<Rol>();
}
