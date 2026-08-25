import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
let Nosotros = class Nosotros {
    fortalezas = [
        {
            titulo: 'Atención especializada',
            descripcion: 'Evaluación y seguimiento de la salud visual con un enfoque profesional.',
        },
        {
            titulo: 'Tecnología oftalmológica',
            descripcion: 'Recursos de diagnóstico que apoyan una valoración precisa.',
        },
        {
            titulo: 'Cuidado integral de la visión',
            descripcion: 'Acompañamiento en las distintas etapas del cuidado visual.',
        },
    ];
};
Nosotros = __decorate([
    Component({
        selector: 'app-nosotros',
        imports: [RevealDirective],
        templateUrl: './nosotros.html',
        styleUrl: './nosotros.css',
    })
], Nosotros);
export { Nosotros };
