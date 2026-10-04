import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Importamos la pantalla que acabas de crear
import { RegistroUsuarioComponent } from './components/registro-usuario/registro-usuario';
import { ListaUsuariosComponent } from './components/lista-usuarios/lista-usuarios'; // <-- Nueva importación
let App = class App {
    title = 'Clinica Web';
};
App = __decorate([
    Component({
        selector: 'app-root',
        standalone: true,
        imports: [RouterOutlet, RegistroUsuarioComponent, ListaUsuariosComponent], // La agregamos a los imports
        templateUrl: './app.html',
        styleUrl: './app.css'
    })
], App);
export { App };
