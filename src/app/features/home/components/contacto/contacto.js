import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
let Contacto = class Contacto {
    items = [
        {
            titulo: 'Ubicación',
            descripcion: 'Av. Visión 245, Zona Centro\nSanta Cruz de la Sierra, Bolivia',
            icono: 'ubicacion',
        },
        {
            titulo: 'Teléfono',
            descripcion: '+591 700 12345',
            icono: 'telefono',
        },
        {
            titulo: 'Correo',
            descripcion: 'contacto@visionclara.bo',
            icono: 'correo',
        },
    ];
    horarios = [
        { dias: 'Lunes a viernes', horario: '08:00 – 18:00' },
        { dias: 'Sábados', horario: '08:00 – 12:00' },
        { dias: 'Domingos', horario: 'Cerrado' },
    ];
};
Contacto = __decorate([
    Component({
        selector: 'app-contacto',
        imports: [RevealDirective],
        templateUrl: './contacto.html',
        styleUrl: './contacto.css',
    })
], Contacto);
export { Contacto };
