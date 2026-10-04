import { __decorate } from "tslib";
import { Component, input, output } from '@angular/core';
let RolesTable = class RolesTable {
    roles = input([]);
    editar = output();
    eliminar = output();
};
RolesTable = __decorate([
    Component({
        selector: 'app-roles-table',
        imports: [],
        templateUrl: './roles-table.html',
        styleUrl: './roles-table.css',
    })
], RolesTable);
export { RolesTable };
