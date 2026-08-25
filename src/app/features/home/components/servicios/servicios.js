import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
let Servicios = class Servicios {
    servicios = [
        {
            titulo: 'Consulta oftalmológica integral',
            descripcion: 'Evaluación completa de la salud ocular para identificar alteraciones, orientar el diagnóstico y definir el seguimiento adecuado.',
            imagen: '/images/servicios/consulta-oftalmologica.jpg',
        },
        {
            titulo: 'Evaluación visual y refracción',
            descripcion: 'Valoración de la agudeza visual y de los defectos refractivos para determinar las necesidades visuales de cada paciente.',
            imagen: '/images/servicios/evaluacion-visual.jpg',
        },
        {
            titulo: 'Diagnóstico por imágenes oftalmológicas',
            descripcion: 'Estudios especializados que permiten obtener información detallada de las estructuras oculares y apoyar un diagnóstico preciso.',
            imagen: '/images/servicios/diagnostico-imagenes.jpg',
        },
        {
            titulo: 'Medición de presión intraocular',
            descripcion: 'Evaluación de la presión ocular como parte del control y detección de alteraciones relacionadas con la salud del nervio óptico.',
            imagen: '/images/servicios/presion-intraocular.jpg',
        },
        {
            titulo: 'Oftalmología pediátrica',
            descripcion: 'Evaluación visual orientada a niños para detectar de forma temprana alteraciones que puedan afectar su desarrollo visual.',
            imagen: '/images/servicios/oftalmologia-pediatrica.png',
        },
        {
            titulo: 'Procedimientos oftalmológicos',
            descripcion: 'Procedimientos diagnósticos y terapéuticos realizados según las necesidades clínicas y la valoración del especialista.',
            imagen: '/images/servicios/procedimientos-oftalmologicos.png',
        },
    ];
};
Servicios = __decorate([
    Component({
        selector: 'app-servicios',
        imports: [RevealDirective],
        templateUrl: './servicios.html',
        styleUrl: './servicios.css',
    })
], Servicios);
export { Servicios };
