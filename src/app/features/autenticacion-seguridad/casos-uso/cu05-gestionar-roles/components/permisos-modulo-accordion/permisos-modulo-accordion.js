import { __decorate } from "tslib";
import { Component, input, output, signal } from '@angular/core';
let PermisosModuloAccordion = class PermisosModuloAccordion {
    modulos = input([]);
    acciones = input([]);
    seleccion = input({});
    deshabilitado = input(false);
    toggleFuncion = output();
    cambiarAccion = output();
    toggleTodo = output();
    abiertos = signal({});
    estaAbierto(moduloId) {
        return this.abiertos()[moduloId] === true;
    }
    alternarModulo(moduloId) {
        this.abiertos.update((estado) => ({
            ...estado,
            [moduloId]: estado[moduloId] !== true,
        }));
    }
    accionDe(funcionId) {
        return this.seleccion()[funcionId] ?? null;
    }
    contadorSeleccionadas(moduloId) {
        const modulo = this.modulos().find((m) => m.id === moduloId);
        if (!modulo) {
            return 0;
        }
        return modulo.funciones.filter((f) => this.seleccion()[f.id] != null).length;
    }
    moduloCompleto(modulo) {
        return (modulo.funciones.length > 0 &&
            modulo.funciones.every((funcion) => this.seleccion()[funcion.id] != null));
    }
    onToggleFuncion(funcionId, event) {
        const activado = event.target.checked;
        this.toggleFuncion.emit({
            funcionId,
            activado,
            accionId: activado ? this.accionDe(funcionId) : null,
        });
    }
    onCambiarAccion(funcionId, event) {
        const accionId = Number(event.target.value);
        this.cambiarAccion.emit({ funcionId, accionId });
    }
    onToggleTodo(modulo, event) {
        const activado = event.target.checked;
        this.toggleTodo.emit({ moduloId: modulo.id, activado });
    }
};
PermisosModuloAccordion = __decorate([
    Component({
        selector: 'app-permisos-modulo-accordion',
        imports: [],
        templateUrl: './permisos-modulo-accordion.html',
        styleUrl: './permisos-modulo-accordion.css',
    })
], PermisosModuloAccordion);
export { PermisosModuloAccordion };
