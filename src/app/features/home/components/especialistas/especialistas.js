import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
let Especialistas = class Especialistas {
    especialistas = [
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
};
Especialistas = __decorate([
    Component({
        selector: 'app-especialistas',
        imports: [RevealDirective],
        templateUrl: './especialistas.html',
        styleUrl: './especialistas.css',
    })
], Especialistas);
export { Especialistas };
