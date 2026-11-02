import { TestBed } from '@angular/core/testing';
import { NavegacionService } from './navegacion.service';

describe('NavegacionService — CU30', () => {
  const servicio = new NavegacionService();
  const modulo = { id: 4, nombre: 'Inventario y Proveedores', funciones: [] };
  const funcion = {
    id: 30,
    nombre: 'Consultar inventario y alertas',
    accion_id: 1,
    accion_nombre: 'LECTURA',
  };
  it('mapea únicamente el nombre canónico literal de la función exigida por la API', () => {
    expect(servicio.rutaDeFuncion('Consultar inventario y alertas')).toBe('/inventario-alertas');
    for (const nombre of ['Consultar inventario y alertas (Web)', 'consultar inventario y alertas', ' CONSULTAR  INVENTARIO Y ALERTAS ', 'Consultar inventario y alertas ', 'Gestionar inventario', 'Consultar inventario', 'Consultar alertas', 'Consultar inventario y alertas de todas las empresas']) {
      expect(servicio.rutaDeFuncion(nombre)).toBeNull();
    }
  });

  it('muestra CU30 únicamente con módulo exacto y lectura o ambas normalizadas', () => {
    for (const accion_nombre of ['LECTURA', 'AMBAS', ' lectura ', ' ambas ']) {
      expect(servicio.puedeMostrarFuncion(modulo, { ...funcion, accion_nombre })).toBe(true);
    }
    for (const accion_nombre of ['ESCRITURA', 'ver', '', 'LECTURA Y ESCRITURA']) {
      expect(servicio.puedeMostrarFuncion(modulo, { ...funcion, accion_nombre })).toBe(false);
    }
    for (const nombre of ['Otro módulo', 'inventario y proveedores', 'Inventario y Proveedores ']) {
      expect(servicio.puedeMostrarFuncion({ ...modulo, nombre }, funcion)).toBe(false);
    }
  });

  it('oculta las variantes de CU30 aunque no tengan ruta y conserva otras funciones', () => {
    for (const nombre of [
      'Consultar inventario y alertas (Web)',
      'consultar inventario y alertas',
      ' CONSULTAR  INVENTARIO Y ALERTAS ',
      'Consultar inventario y alertas ',
      'Consultar inventario y alertas de todas las empresas',
    ]) {
      expect(servicio.puedeMostrarFuncion(modulo, { ...funcion, nombre })).toBe(false);
    }
    expect(servicio.puedeMostrarFuncion(modulo, {
      ...funcion, nombre: 'Gestionar pacientes', accion_nombre: 'ESCRITURA',
    })).toBe(true);
    expect(servicio.puedeMostrarFuncion(modulo, {
      ...funcion, nombre: 'Gestionar productos', accion_nombre: 'ESCRITURA',
    })).toBe(true);
    expect(servicio.puedeMostrarFuncion(modulo, {
      ...funcion, nombre: 'Gestionar perfil propio',
    })).toBe(false);
  });
});

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

  it('resuelve las funciones del CU31 sin falsos positivos', () => {
    expect(servicio.rutaDeFuncion('Gestionar pagos')).toBe('/pagos');
    expect(servicio.rutaDeFuncion('GESTIONAR PAGOS')).toBe('/pagos');
    expect(servicio.rutaDeFuncion('Confirmar pagos bancarios')).toBe(
      '/pagos/confirmaciones',
    );
    expect(servicio.rutaDeFuncion('confirmar pagos bancarios')).toBe(
      '/pagos/confirmaciones',
    );
    expect(servicio.rutaDeFuncion('Gestionar pagos generales')).toBeNull();
    expect(servicio.rutaDeFuncion('Confirmar transferencias')).toBeNull();
  });

  it('asigna iconografía de pagos a las funciones del CU31', () => {
    expect(servicio.iconoDeModulo('Pagos')).toBe('pagos');
    expect(servicio.iconoDeFuncion('Gestionar pagos')).toBe('pagos');
    expect(servicio.iconoDeFuncion('Confirmar pagos bancarios')).toBe('pagos');
  });
});
