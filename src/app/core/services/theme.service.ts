import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type TemaApp = 'claro' | 'oscuro';

const CLAVE_TEMA = 'tema_app';
const CLASE_OSCURO = 'tema-oscuro';

/**
 * Servicio de tema claro/oscuro.
 *
 * Aplica una clase global en `<html>` y persiste la preferencia en
 * `localStorage`. No depende del backend: si no hay preferencia guardada se
 * respeta `prefers-color-scheme` del sistema.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly documento = inject(DOCUMENT);
  private readonly temaSignal = signal<TemaApp>('claro');

  readonly tema = this.temaSignal.asReadonly();
  readonly esOscuro = computed(() => this.temaSignal() === 'oscuro');

  constructor() {
    this.restaurar();
  }

  /** Aplica y persiste un tema concreto. */
  establecer(tema: TemaApp): void {
    this.temaSignal.set(tema);
    this.aplicar(tema);
    this.persistir(tema);
  }

  /** Alterna entre claro y oscuro. */
  alternar(): void {
    this.establecer(this.esOscuro() ? 'claro' : 'oscuro');
  }

  /** Restaura la preferencia guardada o, si no existe, la del sistema. */
  restaurar(): void {
    const guardado = this.leerPersistido();
    const inicial: TemaApp = guardado ?? this.preferenciaDelSistema();
    this.temaSignal.set(inicial);
    this.aplicar(inicial);
  }

  private aplicar(tema: TemaApp): void {
    const raiz = this.documento.documentElement;
    if (!raiz) {
      return;
    }
    raiz.classList.toggle(CLASE_OSCURO, tema === 'oscuro');
    raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }

  private persistir(tema: TemaApp): void {
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // Almacenamiento no disponible: el tema sigue aplicado en memoria.
    }
  }

  private leerPersistido(): TemaApp | null {
    try {
      const valor = localStorage.getItem(CLAVE_TEMA);
      return valor === 'claro' || valor === 'oscuro' ? valor : null;
    } catch {
      return null;
    }
  }

  private preferenciaDelSistema(): TemaApp {
    const ventana = this.documento.defaultView;
    if (ventana?.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'oscuro';
    }
    return 'claro';
  }
}
