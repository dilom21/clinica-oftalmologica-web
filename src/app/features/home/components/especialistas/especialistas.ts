import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

interface Especialista {
  nombre: string;
  especialidad: string;
  imagen: string;
}

@Component({
  selector: 'app-especialistas',
  imports: [RevealDirective],
  templateUrl: './especialistas.html',
  styleUrl: './especialistas.css',
})
export class Especialistas {
  protected readonly especialistas: Especialista[] = [
    {
      nombre: 'Dr. Mauricio Rojas',
      especialidad: 'Especialista en Retina y Vítreo',
      imagen: '/images/especialistas/mauricio-rojas.png',
    },
    {
      nombre: 'Dra. Andrea Salvatierra',
      especialidad: 'Especialista en Glaucoma',
      imagen: '/images/especialistas/andrea-salvatierra.png',
    },
    {
      nombre: 'Dra. Valeria Mendoza',
      especialidad: 'Especialista en Córnea y Superficie Ocular',
      imagen: '/images/especialistas/valeria-mendoza.png',
    },
  ];
}