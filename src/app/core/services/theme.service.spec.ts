import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const CLAVE_TEMA = 'tema_app';

describe('ThemeService — modo claro/oscuro', () => {
  let servicio: ThemeService;
  let documento: Document;

  beforeEach(() => {
    localStorage.removeItem(CLAVE_TEMA);
    document.documentElement.classList.remove('tema-oscuro');

    TestBed.configureTestingModule({});
    documento = TestBed.inject(DOCUMENT);
    servicio = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem(CLAVE_TEMA);
    document.documentElement.classList.remove('tema-oscuro');
  });

  it('inicia en modo claro cuando no hay preferencia guardada', () => {
    expect(servicio.tema()).toBe('claro');
    expect(servicio.esOscuro()).toBe(false);
    expect(documento.documentElement.classList.contains('tema-oscuro')).toBe(false);
  });

  it('cambia de claro a oscuro aplicando la clase global', () => {
    servicio.establecer('oscuro');

    expect(servicio.esOscuro()).toBe(true);
    expect(documento.documentElement.classList.contains('tema-oscuro')).toBe(true);
  });

  it('alterna entre claro y oscuro', () => {
    servicio.alternar();
    expect(servicio.tema()).toBe('oscuro');

    servicio.alternar();
    expect(servicio.tema()).toBe('claro');
    expect(documento.documentElement.classList.contains('tema-oscuro')).toBe(false);
  });

  it('persiste la preferencia para futuras recargas', () => {
    servicio.establecer('oscuro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
  });

  it('restaura la preferencia guardada al inicializar', () => {
    localStorage.setItem(CLAVE_TEMA, 'oscuro');

    servicio.restaurar();

    expect(servicio.esOscuro()).toBe(true);
    expect(documento.documentElement.classList.contains('tema-oscuro')).toBe(true);
  });

  it('ignora valores almacenados que no son un tema válido', () => {
    localStorage.setItem(CLAVE_TEMA, 'morado');

    servicio.restaurar();

    expect(servicio.tema()).toBe('claro');
  });
});
