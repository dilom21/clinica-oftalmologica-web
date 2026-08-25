import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Importamos la pantalla que acabas de crear
import { RegistroUsuarioComponent } from './components/registro-usuario/registro-usuario';
import { ListaUsuariosComponent } from './components/lista-usuarios/lista-usuarios'; // <-- Nueva importación

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RegistroUsuarioComponent, ListaUsuariosComponent], // La agregamos a los imports
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Clinica Web';
}
