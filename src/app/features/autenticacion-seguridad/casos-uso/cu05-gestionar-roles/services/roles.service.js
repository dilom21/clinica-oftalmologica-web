import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { environment } from '../../../../../../environments/environment';
let RolesService = class RolesService {
    http;
    rolesUrl = `${environment.apiUrl}/seguridad/roles`;
    modulosFuncionesUrl = `${environment.apiUrl}/seguridad/modulos-funciones`;
    accionesUrl = `${environment.apiUrl}/seguridad/acciones`;
    constructor(http) {
        this.http = http;
    }
    listarRoles() {
        return this.http.get(this.rolesUrl);
    }
    obtenerRol(rolId) {
        return this.http.get(`${this.rolesUrl}/${rolId}`);
    }
    obtenerPermisosRol(rolId) {
        return this.http.get(`${this.rolesUrl}/${rolId}/permisos`);
    }
    crearRol(datos) {
        return this.http.post(this.rolesUrl, datos);
    }
    actualizarRol(rolId, datos) {
        return this.http.put(`${this.rolesUrl}/${rolId}`, datos);
    }
    desactivarRol(rolId) {
        return this.http.delete(`${this.rolesUrl}/${rolId}`);
    }
    listarModulosFunciones() {
        return this.http.get(this.modulosFuncionesUrl);
    }
    listarAcciones() {
        return this.http.get(this.accionesUrl);
    }
};
RolesService = __decorate([
    Injectable({ providedIn: 'root' })
], RolesService);
export { RolesService };
