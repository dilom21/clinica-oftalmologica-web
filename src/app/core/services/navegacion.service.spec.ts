import { TestBed } from '@angular/core/testing';
import { NavegacionService } from './navegacion.service';

describe('NavegacionService — funciones del menú', () => {
  let servicio: NavegacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(NavegacionService);
  });

  it('resuelve rutas por nombre exacto', () => {
    expect(servicio.rutaDeFuncion('Gestionar pacientes')).toBe('/pacientes');
    expect(servicio.rutaDeFuncion('Registrar diagnóstico')).toBe('/registrar-diagnostico');
    expect(servicio.rutaDeFuncion('Tratamientos, indicaciones y recetas')).toBe(
      '/tratamientos-recetas',
    );
    expect(servicio.rutaDeFuncion('Programar controles médicos')).toBe(
      '/programar-controles-medicos',
    );
  });

  it('resuelve rutas por palabra clave y tolera variantes sin acento', () => {
    expect(servicio.rutaDeFuncion('REGISTRAR DIAGNOSTICO')).toBe('/registrar-diagnostico');
    expect(servicio.rutaDeFuncion('Registrar receta de medicamentos')).toBe(
      '/tratamientos-recetas',
    );
    expect(servicio.rutaDeFuncion('Consultar bitacora')).toBe('/bitacora');
    expect(servicio.rutaDeFuncion('PROGRAMAR CONTROLES MEDICOS')).toBe(
      '/programar-controles-medicos',
    );
  });

  it('devuelve null cuando la función no tiene ruta web', () => {
    expect(servicio.rutaDeFuncion('Usar asistencia clínica IA')).toBeNull();
  });

  it('resuelve únicamente variantes seguras de la función CU21', () => {
    expect(servicio.rutaDeFuncion('Gestionar servicios oftalmológicos')).toBe(
      '/gestion-servicios',
    );
    expect(servicio.rutaDeFuncion('Gestionar servicio oftalmologico')).toBe(
      '/gestion-servicios',
    );
    expect(servicio.rutaDeFuncion('Gestionar servicios oftalmologico')).toBe(
      '/gestion-servicios',
    );
    expect(servicio.rutaDeFuncion('Consultar servicios oftalmológicos')).toBeNull();
    expect(servicio.rutaDeFuncion('Gestionar servicios generales')).toBeNull();
  });

  it('resuelve únicamente las variantes singular y plural de CU22', () => {
    expect(servicio.rutaDeFuncion('Registrar servicios realizados')).toBe(
      '/registrar-servicios-realizados',
    );
    expect(servicio.rutaDeFuncion('REGISTRAR SERVICIO REALIZADO')).toBe(
      '/registrar-servicios-realizados',
    );
    expect(servicio.rutaDeFuncion('Consultar servicios realizados')).toBeNull();
  });

  it('oculta "Gestionar perfil propio" de la navegación web', () => {
    expect(servicio.estaOcultaEnWeb('Gestionar perfil propio')).toBe(true);
    expect(servicio.estaOcultaEnWeb('GESTIONAR PERFIL PROPIO')).toBe(true);
    expect(servicio.estaOcultaEnWeb('Gestionar pacientes')).toBe(false);
  });

  it('asigna iconografía coherente por módulo y función', () => {
    expect(servicio.iconoDeModulo('Pacientes e Historial Clínico')).toBe('pacientes');
    expect(servicio.iconoDeModulo('Autenticación y Seguridad')).toBe('seguridad');
    expect(servicio.iconoDeFuncion('Registrar diagnóstico')).toBe('diagnostico');
    expect(servicio.iconoDeFuncion('Programar controles médicos')).toBe('agenda');
    expect(servicio.iconoDeFuncion('Tratamientos, indicaciones y recetas')).toBe('tratamiento');
    expect(servicio.iconoDeFuncion('Gestionar roles y permisos')).toBe('roles');
    expect(servicio.iconoDeFuncion('Gestionar servicios oftalmológicos')).toBe('servicios');
    expect(servicio.iconoDeFuncion('Función desconocida')).toBe('documento');
  });
});
