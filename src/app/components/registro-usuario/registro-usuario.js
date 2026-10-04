import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
let RegistroUsuarioComponent = class RegistroUsuarioComponent {
    usuarioService;
    nuevoUsuario = {
        correo: '',
        password_hash: '',
        rol_id: 1,
        estado: true
    };
    // Variable para saber si estamos editando o creando
    idEnEdicion = null;
    constructor(usuarioService) {
        this.usuarioService = usuarioService;
    }
    ngOnInit() {
        // Escuchamos si llega un usuario desde la tabla
        this.usuarioService.usuarioEdicion$.subscribe(usuario => {
            this.idEnEdicion = usuario.ID; // Guardamos su ID
            this.nuevoUsuario = {
                correo: usuario.Correo,
                password_hash: '', // La dejamos vacía por seguridad
                rol_id: usuario.Id_Rol,
                estado: usuario.Estado
            };
        });
    }
    guardarUsuario() {
        // Si tenemos un ID guardado, significa que vamos a ACTUALIZAR
        if (this.idEnEdicion) {
            this.usuarioService.actualizarUsuario(this.idEnEdicion, this.nuevoUsuario).subscribe({
                next: () => {
                    alert('¡Usuario actualizado con éxito!');
                    this.finalizarProceso();
                },
                error: (error) => console.error('Error al actualizar:', error)
            });
        }
        // Si NO hay ID, significa que vamos a CREAR (como antes)
        else {
            this.usuarioService.registrarUsuario(this.nuevoUsuario).subscribe({
                next: () => {
                    alert('¡Usuario registrado con éxito!');
                    this.finalizarProceso();
                },
                error: (error) => console.error('Error al registrar:', error)
            });
        }
    }
    // Función para limpiar todo y avisar a la tabla
    finalizarProceso() {
        this.usuarioService.notificarActualizacion();
        this.idEnEdicion = null; // Volvemos a modo "Crear"
        this.nuevoUsuario = { correo: '', password_hash: '', rol_id: 1, estado: true };
    }
};
RegistroUsuarioComponent = __decorate([
    Component({
        selector: 'app-registro-usuario',
        standalone: true,
        imports: [CommonModule, FormsModule],
        templateUrl: './registro-usuario.html',
        styleUrl: './registro-usuario.css'
    })
], RegistroUsuarioComponent);
export { RegistroUsuarioComponent };
