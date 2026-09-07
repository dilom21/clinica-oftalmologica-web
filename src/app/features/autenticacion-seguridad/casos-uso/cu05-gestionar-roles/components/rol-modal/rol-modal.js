import { __decorate } from "tslib";
import { Component, computed, effect, HostListener, inject, input, output, signal, } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermisosModuloAccordion } from '../permisos-modulo-accordion/permisos-modulo-accordion';
let RolModal = class RolModal {
    open = input(false);
    rol = input(null);
    modulos = input([]);
    acciones = input([]);
    permisosCargando = input(false);
    permisos = input([]);
    guardando = input(false);
    errorServer = input(null);
    close = output();
    save = output();
    fb = inject(FormBuilder);
    seleccion = signal({});
    accionPorDefectoId = computed(() => this.acciones()[0]?.id ?? null);
    rolForm = this.fb.nonNullable.group({
        nombre: ['', [Validators.required]],
        descripcion: [''],
    });
    sincronizarFormulario = effect(() => {
        if (!this.open()) {
            return;
        }
        const rol = this.rol();
        this.rolForm.reset({
            nombre: rol?.nombre ?? '',
            descripcion: rol?.descripcion ?? '',
        });
        this.seleccion.set({});
    });
    sincronizarPermisos = effect(() => {
        if (!this.open() || this.permisosCargando()) {
            return;
        }
        const mapa = {};
        for (const permiso of this.permisos()) {
            mapa[permiso.funcion_id] = permiso.accion_id;
        }
        this.seleccion.set(mapa);
    });
    bloquearScroll = effect((onCleanup) => {
        if (this.open()) {
            document.body.style.overflow = 'hidden';
        }
        onCleanup(() => {
            document.body.style.overflow = '';
        });
    });
    onEscape() {
        if (this.open() && !this.guardando()) {
            this.close.emit();
        }
    }
    hasError(error) {
        const control = this.rolForm.get('nombre');
        return (!!control && (control.dirty || control.touched) && control.hasError(error));
    }
    nombreErrorMessage() {
        const control = this.rolForm.get('nombre');
        if (!control || !(control.dirty || control.touched)) {
            return '';
        }
        if (control.hasError('required')) {
            return 'El nombre del rol es obligatorio.';
        }
        return '';
    }
    cerrar() {
        if (this.guardando()) {
            return;
        }
        this.close.emit();
    }
    alternarFuncion(payload) {
        this.seleccion.update((actual) => {
            const copia = { ...actual };
            if (payload.activado) {
                copia[payload.funcionId] = payload.accionId ?? this.accionPorDefectoId() ?? 0;
            }
            else {
                delete copia[payload.funcionId];
            }
            return copia;
        });
    }
    cambiarAccion(payload) {
        this.seleccion.update((actual) => ({
            ...actual,
            [payload.funcionId]: payload.accionId,
        }));
    }
    alternarTodo(payload) {
        const modulo = this.modulos().find((m) => m.id === payload.moduloId);
        if (!modulo) {
            return;
        }
        this.seleccion.update((actual) => {
            const copia = { ...actual };
            for (const funcion of modulo.funciones) {
                if (payload.activado) {
                    copia[funcion.id] =
                        copia[funcion.id] ?? this.accionPorDefectoId() ?? 0;
                }
                else {
                    delete copia[funcion.id];
                }
            }
            return copia;
        });
    }
    onSubmit() {
        if (this.guardando()) {
            return;
        }
        const nombreControl = this.rolForm.get('nombre');
        if (!nombreControl) {
            return;
        }
        const nombre = nombreControl.value.trim();
        if (!nombre || this.rolForm.invalid) {
            this.rolForm.markAllAsTouched();
            return;
        }
        const descripcion = (this.rolForm.get('descripcion')?.value ?? '').trim();
        const descripcionEnviar = descripcion === '' ? (this.rol() ? '' : null) : descripcion;
        const permisos = Object.entries(this.seleccion()).map(([funcionId, accionId]) => ({
            funcion_id: Number(funcionId),
            accion_id: accionId,
        }));
        this.save.emit({
            nombre,
            descripcion: descripcionEnviar,
            permisos,
        });
    }
};
__decorate([
    HostListener('document:keydown.escape')
], RolModal.prototype, "onEscape", null);
RolModal = __decorate([
    Component({
        selector: 'app-rol-modal',
        imports: [ReactiveFormsModule, PermisosModuloAccordion],
        templateUrl: './rol-modal.html',
        styleUrl: './rol-modal.css',
    })
], RolModal);
export { RolModal };
