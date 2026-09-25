import { Component, input, output } from '@angular/core';
import { Paciente } from '../../models/pacientes.models';

@Component({
  selector: 'app-pacientes-table',
  imports: [],
  templateUrl: './pacientes-table.html',
  styleUrl: './pacientes-table.css',
})
export class PacientesTable {
  readonly pacientes = input<Paciente[]>([]);
  readonly editar = output<Paciente>();
  readonly verAntecedentes = output<Paciente>();
<<<<<<< HEAD
}
=======
}
>>>>>>> c988c15c98221be3d61f92bb5cd58304cb990fc2
