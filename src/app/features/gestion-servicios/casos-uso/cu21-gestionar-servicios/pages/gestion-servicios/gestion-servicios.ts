import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioOftalmologico } from '../../../../../../interfaces/servicio-oftalmologico.interface';
import { ServicioOftalmologicoService } from '../../../../../../services/servicio-oftalmologico.service'; 
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';

@Component({
  selector: 'app-gestion-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './gestion-servicios.html',
  styleUrl: './gestion-servicios.css'
})
export class GestionServicios implements OnInit {
  protected readonly servicios = signal<ServicioOftalmologico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly sidebarMovilAbierto = signal(false);

  // --- VARIABLES PARA EL FORMULARIO MODAL ---
  mostrarModal = false;
  modoEdicion = false;
  servicioForm: any = {}; // Objeto que guarda los datos del formulario

  private readonly servicioService = inject(ServicioOftalmologicoService);

  ngOnInit(): void {
    this.cargarServicios();
  }

  alternarSidebar(): void { this.sidebarMovilAbierto.update((a) => !a); }
  cerrarSidebar(): void { this.sidebarMovilAbierto.set(false); }

  cargarServicios(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.servicioService.listarServicios().subscribe({
      next: (datos) => {
        this.servicios.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set(true);
      }
    });
  }

  // --- FUNCIONES DEL FORMULARIO Y CRUD REAL ---

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.servicioForm = { nombre: '', descripcion: '', precio_base: 0, duracion_estimada: 30, estado: true };
    this.mostrarModal = true;
  }

  abrirModalEditar(servicio: ServicioOftalmologico): void {
    this.modoEdicion = true;
    this.servicioForm = { ...servicio }; // Clonamos el objeto para no afectar la tabla directamente
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarServicio(): void {
    if (this.modoEdicion && this.servicioForm.id) {
      // EDITAR
      this.servicioService.actualizarServicio(this.servicioForm.id, this.servicioForm).subscribe({
        next: () => {
          this.cargarServicios(); // Refrescar tabla
          this.cerrarModal();
        },
        error: (err) => alert('Ocurrió un error al actualizar.')
      });
    } else {
      // CREAR NUEVO
      this.servicioService.crearServicio(this.servicioForm).subscribe({
        next: () => {
          this.cargarServicios(); // Refrescar tabla
          this.cerrarModal();
        },
        error: (err) => alert('Ocurrió un error al guardar.')
      });
    }
  }

  eliminarServicio(servicio: ServicioOftalmologico): void {
    if (confirm(`¿Estás seguro de que deseas dar de baja (desactivar) el servicio "${servicio.nombre}"?`)) {
      if (servicio.id) {
        // Clonamos el servicio pero le cambiamos el estado a Inactivo (false)
        const servicioInactivo = { ...servicio, estado: false };
        
        // Usamos la función actualizar que ya sabemos que funciona bien
        this.servicioService.actualizarServicio(servicio.id, servicioInactivo).subscribe({
          next: () => {
            this.cargarServicios(); // Refresca la tabla
          },
          error: (err) => {
            console.error(err);
            alert('Ocurrió un error al intentar dar de baja el servicio.');
          }
        });
      }
    }
  }
}