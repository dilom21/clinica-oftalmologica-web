import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
let UsuarioService = class UsuarioService {
    http;
    apiUrl = 'http://127.0.0.1:8000/usuarios-seguridad/usuarios';
    // Mensajero para actualizar la tabla
    actualizacionSource = new Subject();
    actualizacion$ = this.actualizacionSource.asObservable();
    // --- NUEVO MENSAJERO PARA LLEVAR DATOS AL FORMULARIO ---
    usuarioEdicionSource = new Subject();
    usuarioEdicion$ = this.usuarioEdicionSource.asObservable();
    constructor(http) {
        this.http = http;
    }
    registrarUsuario(usuario) {
        return this.http.post(this.apiUrl, usuario);
    }
    obtenerUsuarios() {
        return this.http.get(this.apiUrl);
    }
    eliminarUsuario(id) {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
    // --- NUEVA FUNCIÓN PUT ---
    actualizarUsuario(id, usuario) {
        return this.http.put(`${this.apiUrl}/${id}`, usuario);
    }
    notificarActualizacion() {
        this.actualizacionSource.next();
    }
    // --- FUNCIÓN PARA MANDAR DATOS AL FORMULARIO ---
    enviarDatosParaEdicion(usuario) {
        this.usuarioEdicionSource.next(usuario);
    }
};
UsuarioService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], UsuarioService);
export { UsuarioService };
