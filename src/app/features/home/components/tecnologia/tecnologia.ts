import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

interface EquipoTecnologia {
  titulo: string;
  descripcion: string;
  imagen: string;
  alternado: boolean;
}

@Component({
  selector: 'app-tecnologia',
  imports: [RevealDirective],
  templateUrl: './tecnologia.html',
  styleUrl: './tecnologia.css',
})
export class Tecnologia {
  protected readonly tecnologias: EquipoTecnologia[] = [
    {
      titulo: 'Tomografía de Coherencia Óptica (OCT)',
      descripcion:
        'Permite obtener imágenes detalladas de las estructuras internas del ojo como apoyo al diagnóstico y seguimiento.',
      imagen: '/images/equipos/oct.png',
      alternado: false,
    },
    {
      titulo: 'Diagnóstico oftalmológico digital',
      descripcion:
        'Herramientas de evaluación que facilitan el análisis de diferentes estructuras oculares.',
      imagen: '/images/equipos/diagnostico.png',
      alternado: true,
    },
    {
      titulo: 'Examen con lámpara de hendidura',
      descripcion:
        'Evaluación detallada de las estructuras anteriores del ojo mediante magnificación e iluminación especializada.',
      imagen: '/images/equipos/examen-lampara.png',
      alternado: false,
    },
  ];
}