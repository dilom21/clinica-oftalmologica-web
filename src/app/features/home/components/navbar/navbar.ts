import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected readonly links: NavLink[] = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Especialidades', href: '#especialidades' },
    { label: 'Especialistas', href: '#especialistas' },
    { label: 'Tecnología', href: '#tecnologia' },
    { label: 'Contacto', href: '#contacto' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}