import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('clinica-oftalmologica-web');

  /**
   * El tema se inicializa en la raíz de la aplicación para aplicarlo en cuanto
   * arranca el shell (antes de que se monte el sidebar) y evitar destellos.
   */
  private readonly themeService = inject(ThemeService);
}
