import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
let ListaUsuariosComponent = class ListaUsuariosComponent {
    usuarioService;
    // Cambiamos Usuario[] por any[] para que acepte las mayúsculas sin quejarse
    usuarios = [];
    constructor(usuarioService) {
        this.usuarioService = usuarioService;
    }
    ngOnInit() {
        this.cargarUsuarios(); // Carga normal al abrir la pantalla
        // --- AQUÍ LA TABLA SE QUEDA ESCUCHANDO AL MENSAJERO ---
        this.usuarioService.actualizacion$.subscribe(() => {
            this.cargarUsuarios(); // Si avisan que hay un nuevo registro, vuelve a cargar
        });
    }
    cargarUsuarios() {
        this.usuarioService.obtenerUsuarios().subscribe({
            next: (datos) => {
                this.usuarios = datos;
            },
            error: (error) => {
                console.error('Error al cargar la lista de usuarios:', error);
            }
        });
    }
    // --- NUEVA FUNCIÓN PARA ELIMINAR / DAR DE BAJA ---
    desactivar(id) {
        const confirmar = confirm('¿Estás seguro de que deseas dar de baja a este usuario?');
        if (confirmar) {
            this.usuarioService.eliminarUsuario(id).subscribe({
                next: (respuesta) => {
                    alert('Usuario dado de baja exitosamente.');
                    this.cargarUsuarios(); // Recargamos la tabla automáticamente para ver el cambio
                },
                error: (error) => {
                    alert('Hubo un error al intentar dar de baja.');
                    console.error('Error:', error);
                }
            });
        }
    }
    editar(usuario) {
        this.usuarioService.enviarDatosParaEdicion(usuario);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Esto sube la pantalla automáticamente al formulario
    }
};
ListaUsuariosComponent = __decorate([
    Component({
        selector: 'app-lista-usuarios',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './lista-usuarios.html',
        styleUrl: './lista-usuarios.css'
    })
], ListaUsuariosComponent);
export { ListaUsuariosComponent };
