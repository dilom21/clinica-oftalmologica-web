import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import {
  CitaMedica,
  claseEstadoCita,
  esEstadoCitaTerminal,
  etiquetaEstadoCita,
  formatearFechaCita,
  formatearHoraCita,
  OftalmologoCita,
  PacienteCatalogo,
} from '../../models/citas.models';

interface PosicionMenu {
  left: number;
  top: number;
  arriba: boolean;
}

const ANCHO_MENU = 220;
const MARGEN_BORDE = 8;
const SEPARACION_BOTON = 6;

@Component({
  selector: 'app-cu10-citas-table',
  imports: [],
  templateUrl: './citas-table.html',
  styleUrl: './citas-table.css',
})
export class CitasTable implements OnDestroy {
  readonly citas = input<CitaMedica[]>([]);
  readonly pacientes = input<PacienteCatalogo[]>([]);
  readonly oftalmologos = input<OftalmologoCita[]>([]);

  readonly verDetalle = output<CitaMedica>();
  readonly reprogramar = output<CitaMedica>();
  readonly confirmar = output<CitaMedica>();
  readonly cambiarEstado = output<CitaMedica>();
  readonly cancelar = output<CitaMedica>();

  private readonly elementRef = inject(ElementRef);

  // Menú flotante único (se renderiza fuera del contenedor con overflow).
  protected readonly menuCita = signal<CitaMedica | null>(null);
  protected readonly posicionMenu = signal<PosicionMenu>({
    left: 0,
    top: 0,
    arriba: false,
  });

  private readonly cerrarAlDesplazar = (): void => this.cerrarMenu();

  constructor() {
    // capture: true para detectar scroll de cualquier contenedor interno.
    document.addEventListener('scroll', this.cerrarAlDesplazar, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.cerrarAlDesplazar, true);
  }

  // ----------------------------------------------------------------
  // Estado / resolución de nombres
  // ----------------------------------------------------------------
  esEstadoTerminal(cita: CitaMedica): boolean {
    return esEstadoCitaTerminal(cita.estado);
  }

  esConfirmable(cita: CitaMedica): boolean {
    return cita.estado === 'PROGRAMADA';
  }

  esMenuAbierta(cita: CitaMedica): boolean {
    return this.menuCita()?.id === cita.id;
  }

  clasesEstado(estado: string): string {
    return `citas-table__badge ${claseEstadoCita(estado)}`;
  }

  etiquetaEstado(estado: string): string {
    return etiquetaEstadoCita(estado);
  }

  nombrePaciente(cita: CitaMedica): string {
    const paciente = this.pacientes().find((p) => p.id === cita.paciente_id);
    if (paciente) {
      return `${paciente.nombres} ${paciente.apellidos}`;
    }
    return `Paciente #${cita.paciente_id}`;
  }

  ciPaciente(cita: CitaMedica): string {
    const paciente = this.pacientes().find((p) => p.id === cita.paciente_id);
    return paciente?.ci ? `CI: ${paciente.ci}` : '—';
  }

  nombreOftalmologo(cita: CitaMedica): string {
    const oftalmologo = this.oftalmologos().find((o) => o.id === cita.oftalmologo_id);
    if (oftalmologo) {
      return `${oftalmologo.nombres} ${oftalmologo.apellidos}`;
    }
    return `Oftalmólogo #${cita.oftalmologo_id}`;
  }

  resumenOftalmologo(cita: CitaMedica): string {
    const oftalmologo = this.oftalmologos().find((o) => o.id === cita.oftalmologo_id);
    if (oftalmologo?.especialidad) {
      return oftalmologo.especialidad;
    }
    if (oftalmologo?.matricula) {
      return `Matrícula ${oftalmologo.matricula}`;
    }
    return '—';
  }

  formatearFecha(fecha: string): string {
    return formatearFechaCita(fecha);
  }

  formatearHora(hora: string): string {
    return formatearHoraCita(hora);
  }

  // ----------------------------------------------------------------
  // Apertura/cierre del menú flotante
  // ----------------------------------------------------------------
  alternarMenu(event: Event, cita: CitaMedica): void {
    event.stopPropagation();
    if (this.menuCita()?.id === cita.id) {
      this.cerrarMenu();
      return;
    }

    const boton = event.currentTarget as HTMLElement;
    const rect = boton.getBoundingClientRect();

    this.menuCita.set(cita);
    this.posicionMenu.set(this.posicionInicial(rect));
    this.ajustarPosicion(rect);
  }

  cerrarMenu(): void {
    this.menuCita.set(null);
  }

  private posicionInicial(rect: DOMRect): PosicionMenu {
    return {
      left: this.leftLimitada(rect),
      top: rect.bottom + SEPARACION_BOTON,
      arriba: false,
    };
  }

  private ajustarPosicion(rect: DOMRect): void {
    // Tras renderizar el panel se mide su altura real para abrir hacia
    // arriba cuando no quepa hacia abajo (p. ej. en la última fila).
    setTimeout(() => {
      if (!this.menuCita()) {
        return;
      }
      const panel = this.elementRef.nativeElement.querySelector(
        '.citas-table__menu-panel',
      ) as HTMLElement | null;
      if (!panel) {
        return;
      }

      const altura = panel.offsetHeight;
      const espacioAbajo = window.innerHeight - rect.bottom - SEPARACION_BOTON;
      const cabeArriba = rect.top - altura - SEPARACION_BOTON >= MARGEN_BORDE;
      const arriba = altura > espacioAbajo && cabeArriba;

      this.posicionMenu.set({
        left: this.leftLimitada(rect),
        top: arriba ? rect.top - altura - SEPARACION_BOTON : rect.bottom + SEPARACION_BOTON,
        arriba,
      });
    });
  }

  private leftLimitada(rect: DOMRect): number {
    return Math.max(
      MARGEN_BORDE,
      Math.min(rect.right - ANCHO_MENU, window.innerWidth - ANCHO_MENU - MARGEN_BORDE),
    );
  }

  // ----------------------------------------------------------------
  // Cierre por interacción externa
  // ----------------------------------------------------------------
  @HostListener('document:click', ['$event'])
  onClicFuera(event: Event): void {
    if (!this.menuCita()) {
      return;
    }
    const objetivo = event.target as HTMLElement | null;
    if (!objetivo) {
      return;
    }
    if (
      objetivo.closest('.citas-table__menu-panel') ||
      objetivo.closest('.citas-table__menu-boton')
    ) {
      return;
    }
    this.cerrarMenu();
  }

  @HostListener('window:resize')
  onVentanaResize(): void {
    this.cerrarMenu();
  }

  // ----------------------------------------------------------------
  // Acciones
  // ----------------------------------------------------------------
  verCita(cita: CitaMedica): void {
    this.cerrarMenu();
    this.verDetalle.emit(cita);
  }

  reprogramarCita(cita: CitaMedica): void {
    this.cerrarMenu();
    this.reprogramar.emit(cita);
  }

  confirmarCita(cita: CitaMedica): void {
    this.cerrarMenu();
    this.confirmar.emit(cita);
  }

  cambiarEstadoCita(cita: CitaMedica): void {
    this.cerrarMenu();
    this.cambiarEstado.emit(cita);
  }

  cancelarCita(cita: CitaMedica): void {
    this.cerrarMenu();
    this.cancelar.emit(cita);
  }
}
