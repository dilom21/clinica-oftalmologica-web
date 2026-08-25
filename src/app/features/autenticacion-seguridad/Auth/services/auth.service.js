import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
let AuthService = class AuthService {
    http;
    loginUrl = `${environment.apiUrl}/seguridad/login`;
    recuperarPasswordUrl = `${environment.apiUrl}/seguridad/password/recuperar`;
    restablecerPasswordUrl = `${environment.apiUrl}/seguridad/password/restablecer`;
    constructor(http) {
        this.http = http;
    }
    login(datos) {
        return this.http.post(this.loginUrl, datos);
    }
    recuperarPassword(datos) {
        return this.http.post(this.recuperarPasswordUrl, datos);
    }
    restablecerPassword(datos) {
        return this.http.post(this.restablecerPasswordUrl, datos);
    }
    logout() {
        localStorage.removeItem('access_token');
    }
};
AuthService = __decorate([
    Injectable({ providedIn: 'root' })
], AuthService);
export { AuthService };
