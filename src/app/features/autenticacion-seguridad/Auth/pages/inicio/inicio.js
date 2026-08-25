import { __decorate } from "tslib";
import { Component, signal } from '@angular/core';
import { Sidebar } from '../../../../../core/layouts/sidebar/sidebar';
let Inicio = class Inicio {
    authService;
    router;
    sidebarMovilAbierto = signal(false);
    constructor(authService, router) {
        this.authService = authService;
        this.router = router;
    }
    alternarSidebar() {
        this.sidebarMovilAbierto.update((abierto) => !abierto);
    }
    cerrarSidebar() {
        this.sidebarMovilAbierto.set(false);
    }
    cerrarSesion() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
};
Inicio = __decorate([
    Component({
        selector: 'app-inicio',
        imports: [Sidebar],
        templateUrl: './inicio.html',
        styleUrl: './inicio.css',
    })
], Inicio);
export { Inicio };
