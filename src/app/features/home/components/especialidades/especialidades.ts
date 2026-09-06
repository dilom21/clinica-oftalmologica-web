import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

interface Especialidad {
  titulo: string;
  descripcion: string;
  imagen: string;
}

@Component({
  selector: 'app-especialidades',
  imports: [RevealDirective],
  templateUrl: './especialidades.html',
  styleUrl: './especialidades.css',
})
export class Especialidades {
  protected readonly especialidades: Especialidad[] = [
    {
      titulo: 'Catarata y segmento anterior',
      descripcion:
        'Atención orientada a la evaluación y tratamiento de alteraciones del cristalino y de las estructuras anteriores del ojo.',
      imagen: '/images/especialidades/catarata-segmento-anterior.png',
    },
    {
      titulo: 'Cirugía refractiva',
      descripcion:
        'Evaluación especializada de defectos refractivos y alternativas quirúrgicas orientadas a mejorar la calidad visual.',
      imagen: '/images/especialidades/cirugia-refractiva.png',
    },
    {
      titulo: 'Córnea y superficie ocular',
      descripcion:
        'Evaluación de enfermedades de la córnea, superficie ocular y alteraciones relacionadas con la calidad de la visión.',
      imagen: '/images/especialidades/cornea-superficie-ocular.png',
    },
    {
      titulo: 'Glaucoma',
      descripcion:
        'Evaluación, diagnóstico y seguimiento de alteraciones relacionadas con la presión ocular y el nervio óptico.',
      imagen: '/images/especialidades/glaucoma.jpg',
    },
    {
      titulo: 'Oftalmología pediátrica',
      descripcion:
        'Atención especializada en la salud visual de niños y detección temprana de alteraciones visuales.',
      imagen: '/images/especialidades/oftalmologia-pediatrica.png',
    },
    {
      titulo: 'Retina y vítreo',
      descripcion:
        'Evaluación especializada de retina, fondo de ojo y estructuras posteriores relacionadas con la visión.',
      imagen: '/images/especialidades/retina-vitreo.png',
    },
  ];
}