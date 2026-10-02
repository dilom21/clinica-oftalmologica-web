import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Hero } from '../../components/hero/hero';
import { Nosotros } from '../../components/nosotros/nosotros';
import { Servicios } from '../../components/servicios/servicios';
import { Especialidades } from '../../components/especialidades/especialidades';
import { Especialistas } from '../../components/especialistas/especialistas';
import { Tecnologia } from '../../components/tecnologia/tecnologia';
import { Contacto } from '../../components/contacto/contacto';
import { Footer } from '../../components/footer/footer';
let Home = class Home {
};
Home = __decorate([
    Component({
        selector: 'app-home',
        imports: [
            Navbar,
            Hero,
            Nosotros,
            Servicios,
            Especialidades,
            Especialistas,
            Tecnologia,
            Contacto,
            Footer,
        ],
        templateUrl: './home.html',
        styleUrl: './home.css',
    })
], Home);
export { Home };
