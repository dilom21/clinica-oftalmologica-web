import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
let MenuService = class MenuService {
    http;
    menuUrl = `${environment.apiUrl}/seguridad/menu`;
    constructor(http) {
        this.http = http;
    }
    obtenerMenu() {
        return this.http.get(this.menuUrl);
    }
};
MenuService = __decorate([
    Injectable({ providedIn: 'root' })
], MenuService);
export { MenuService };
