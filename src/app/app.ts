import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
 
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // La agregamos a los imports
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Clinica Web';
}
