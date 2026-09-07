import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
let Footer = class Footer {
    links = [
        { label: 'Inicio', href: '#inicio' },
        { label: 'Nosotros', href: '#nosotros' },
        { label: 'Servicios', href: '#servicios' },
        { label: 'Especialidades', href: '#especialidades' },
        { label: 'Especialistas', href: '#especialistas' },
        { label: 'Tecnología', href: '#tecnologia' },
        { label: 'Contacto', href: '#contacto' },
    ];
    direccion = 'Av. Visión 245, Zona Centro\nSanta Cruz de la Sierra, Bolivia';
    telefono = '+591 700 12345';
    correo = 'contacto@visionclara.bo';
    horario = 'Lun a Vie: 08:00 – 18:00';
    horarioSabado = 'Sábados: 08:00 – 12:00';
};
Footer = __decorate([
    Component({
        selector: 'app-footer',
        imports: [RevealDirective],
        templateUrl: './footer.html',
        styleUrl: './footer.css',
    })
], Footer);
export { Footer };
