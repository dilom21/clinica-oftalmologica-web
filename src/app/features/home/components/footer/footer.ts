import { Component } from '@angular/core';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

interface FooterLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-footer',
  imports: [RevealDirective],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly links: FooterLink[] = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Especialidades', href: '#especialidades' },
    { label: 'Especialistas', href: '#especialistas' },
    { label: 'Tecnología', href: '#tecnologia' },
    { label: 'Contacto', href: '#contacto' },
  ];

  protected readonly direccion = 'Av. Visión 245, Zona Centro\nSanta Cruz de la Sierra, Bolivia';
  protected readonly telefono = '+591 700 12345';
  protected readonly correo = 'contacto@visionclara.bo';
  protected readonly horario = 'Lun a Vie: 08:00 – 18:00';
  protected readonly horarioSabado = 'Sábados: 08:00 – 12:00';
}