import { __decorate } from "tslib";
import { Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
let Sidebar = class Sidebar {
    menuService;
    mobileOpen = input(false);
    mobileClose = output();
    modulos = signal([]);
    menuError = signal(false);
    openModuleId = signal(null);
    selectedModuleId = signal(null);
    selectedFuncionId = signal(null);
    rutasFunciones = new Map([
        ['gestionar roles y permisos', '/roles'],
    ]);
    iconosPorNombre = [
        { clave: 'seguridad', nombres: ['seguridad', 'autenticacion'] },
        { clave: 'agenda', nombres: ['agenda', 'cita'] },
        { clave: 'pacientes', nombres: ['paciente', 'historial'] },
        { clave: 'inventario', nombres: ['inventario', 'proveedor'] },
        { clave: 'pagos', nombres: ['pago'] },
        { clave: 'reportes', nombres: ['reporte'] },
    ];
    constructor(menuService) {
        this.menuService = menuService;
    }
    ngOnInit() {
        this.menuService.obtenerMenu().subscribe({
            next: (modulos) => this.modulos.set(modulos),
            error: () => this.menuError.set(true),
        });
    }
    iconoPara(modulo) {
        const nombre = modulo.nombre.toLowerCase();
        const coincidencia = this.iconosPorNombre.find((grupo) => grupo.nombres.some((clave) => nombre.includes(clave)));
        return coincidencia?.clave ?? 'modulo';
    }
    rutaDeFuncion(nombre) {
        const clave = nombre.toLowerCase().trim();
        if (this.rutasFunciones.has(clave)) {
            return this.rutasFunciones.get(clave);
        }
        if (clave.includes('roles') && clave.includes('permisos')) {
            return '/roles';
        }
        return null;
    }
    alternarModulo(id) {
        this.openModuleId.update((abierto) => (abierto === id ? null : id));
        this.selectedModuleId.set(id);
        this.selectedFuncionId.set(null);
    }
    seleccionarFuncion(moduloId, funcionId) {
        this.selectedModuleId.set(moduloId);
        this.selectedFuncionId.set(funcionId);
        this.cerrarSiMovil();
    }
    navegarInicio() {
        this.cerrarSiMovil();
    }
    cerrarMovil() {
        this.mobileClose.emit();
    }
    cerrarSiMovil() {
        if (this.mobileOpen()) {
            this.cerrarMovil();
        }
    }
};
Sidebar = __decorate([
    Component({
        selector: 'app-sidebar',
        imports: [RouterLink, RouterLinkActive],
        templateUrl: './sidebar.html',
        styleUrl: './sidebar.css',
    })
], Sidebar);
export { Sidebar };
