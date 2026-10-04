import { TestBed } from '@angular/core/testing';
import { MenuService } from '../../services/menu.service';
import { Sidebar } from './sidebar';

describe('Sidebar — mapeo de funciones a rutas', () => {
  let sidebar: Sidebar;

  beforeEach(() => {
    sidebar = TestBed.runInInjectionContext(
      () => new Sidebar({} as unknown as MenuService),
    );
  });

  it('mapea "Registrar consulta clínica" a /registrar-consulta-clinica', () => {
    expect(sidebar.rutaDeFuncion('Registrar consulta clínica')).toBe(
      '/registrar-consulta-clinica',
    );
  });

  it('mapea "Registrar diagnóstico" a /registrar-diagnostico', () => {
    expect(sidebar.rutaDeFuncion('Registrar diagnóstico')).toBe(
      '/registrar-diagnostico',
    );
    // Tolerancia a variantes sin acento / con mayúsculas.
    expect(sidebar.rutaDeFuncion('REGISTRAR DIAGNOSTICO')).toBe(
      '/registrar-diagnostico',
    );
  });

  it('mantiene los mapeos existentes (sin regresión)', () => {
    expect(sidebar.rutaDeFuncion('Gestionar pacientes')).toBe('/pacientes');
    expect(sidebar.rutaDeFuncion('Consultar historial clínico')).toBe(
      '/historial-clinico',
    );
    expect(sidebar.rutaDeFuncion('Gestionar citas médicas')).toBe(
      '/gestionar-citas',
    );
    expect(sidebar.rutaDeFuncion('Consultar bitácora')).toBe('/bitacora');
    expect(sidebar.rutaDeFuncion('Consultar agenda y disponibilidad médica')).toBe(
      '/agenda-disponibilidad',
    );
  });

  it('devuelve null para funciones sin ruta conocida', () => {
    expect(sidebar.rutaDeFuncion('Función inexistente')).toBeNull();
  });
});

describe('Sidebar — navegación CU21/CU22', () => {
  it('reconoce nombres del menú real y variantes sin acento', () => {
    const sidebar = TestBed.runInInjectionContext(() => new Sidebar({} as MenuService));
    expect(sidebar.rutaDeFuncion('Gestionar servicios oftalmológicos')).toBe('/gestion-servicios');
    expect(sidebar.rutaDeFuncion('GESTIONAR SERVICIOS OFTALMOLOGICOS')).toBe('/gestion-servicios');
    expect(sidebar.rutaDeFuncion('Registrar servicios realizados')).toBe('/registrar-servicios-realizados');
  });
});
