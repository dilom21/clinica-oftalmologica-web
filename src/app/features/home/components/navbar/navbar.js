import { __decorate } from "tslib";
import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
let Navbar = class Navbar {
    menuOpen = signal(false);
    scrolled = signal(false);
    links = [
        { label: 'Inicio', href: '#inicio' },
        { label: 'Nosotros', href: '#nosotros' },
        { label: 'Servicios', href: '#servicios' },
        { label: 'Especialidades', href: '#especialidades' },
        { label: 'Especialistas', href: '#especialistas' },
        { label: 'Tecnología', href: '#tecnologia' },
        { label: 'Contacto', href: '#contacto' },
    ];
    onScroll() {
        this.scrolled.set(window.scrollY > 24);
    }
    toggleMenu() {
        this.menuOpen.update((open) => !open);
    }
    closeMenu() {
        this.menuOpen.set(false);
    }
};
__decorate([
    HostListener('window:scroll')
], Navbar.prototype, "onScroll", null);
Navbar = __decorate([
    Component({
        selector: 'app-navbar',
        imports: [RouterLink],
        templateUrl: './navbar.html',
        styleUrl: './navbar.css',
    })
], Navbar);
export { Navbar };
