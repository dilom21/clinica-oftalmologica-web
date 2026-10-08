import { Injectable } from '@angular/core';

/**
 * Resolución compartida entre el sidebar y el inicio:
 * traduce los nombres de funciones que devuelve el backend (`/seguridad/menu`)
 * a rutas web, y asigna iconografía coherente.
 *
 * Se centraliza aquí para no duplicar el mapeo en cada consumidor.
 */
@Injectable({ providedIn: 'root' })
export class NavegacionService {
  private readonly nombresGestionServicios = new Set([
    'gestionar servicio oftalmologico',
    'gestionar servicio oftalmologicos',
    'gestionar servicios oftalmologico',
    'gestionar servicios oftalmologicos',
  ]);

  /** Funciones que no deben aparecer en la navegación web. */
  private readonly funcionesOcultasWeb: ReadonlyArray<RegExp> = [
    /perfil\s+propio/i,
    /^gestionar\s+perfil$/i,
  ];

  private readonly rutasFunciones: ReadonlyMap<string, string> = new Map([
    ['gestionar usuarios', '/usuarios'],
    ['gestionar roles y permisos', '/roles'],
    ['gestionar pacientes', '/pacientes'],
    ['consultar historial clínico', '/historial-clinico'],
    ['registrar consulta clínica', '/registrar-consulta-clinica'],
    ['registrar diagnóstico', '/registrar-diagnostico'],
    ['registrar diagnostico', '/registrar-diagnostico'],
    ['programar controles médicos', '/programar-controles-medicos'],
    ['programar controles medicos', '/programar-controles-medicos'],
    ['registrar tratamiento', '/tratamientos-recetas'],
    ['registrar tratamientos', '/tratamientos-recetas'],
    ['registrar indicación', '/tratamientos-recetas'],
    ['registrar indicacion', '/tratamientos-recetas'],
    ['registrar indicaciones', '/tratamientos-recetas'],
    ['registrar receta', '/tratamientos-recetas'],
    ['registrar recetas', '/tratamientos-recetas'],
    ['tratamientos y recetas', '/tratamientos-recetas'],
    ['tratamientos, indicaciones y recetas', '/tratamientos-recetas'],
    ['registrar examen', '/examenes-oftalmologicos'],
    ['registrar exámenes', '/examenes-oftalmologicos'],
    ['registrar examen oftalmológico', '/examenes-oftalmologicos'],
    ['registrar examen oftalmologico', '/examenes-oftalmologicos'],
    ['exámenes oftalmológicos', '/examenes-oftalmologicos'],
    ['examenes oftalmologicos', '/examenes-oftalmologicos'],
    ['registrar resultados de exámenes', '/examenes-oftalmologicos'],
    ['resultados de exámenes', '/examenes-oftalmologicos'],
    ['consultar bitácora', '/bitacora'],
    ['consultar agenda y disponibilidad médica', '/agenda-disponibilidad'],
    ['configurar disponibilidad del oftalmólogo', '/configurar-disponibilidad'],
    ['gestionar citas médicas', '/gestionar-citas'],
    ['consultar historial de citas', '/historial-citas'],
    ['generar reportes', '/reportes'],
  ]);

  private readonly iconosModulo: ReadonlyArray<{
    icono: string;
    claves: ReadonlyArray<string>;
  }> = [
    { icono: 'seguridad', claves: ['seguridad', 'autenticacion', 'autenticación'] },
    { icono: 'pacientes', claves: ['paciente', 'historial'] },
    { icono: 'agenda', claves: ['agenda', 'cita'] },
    { icono: 'inventario', claves: ['inventario', 'proveedor'] },
    { icono: 'pagos', claves: ['pago'] },
    { icono: 'reportes', claves: ['reporte'] },
    { icono: 'servicios', claves: ['servicio oftalmol', 'servicios oftalmol'] },
  ];

  /** Icono por función; el orden importa (primero las coincidencias específicas). */
  private readonly iconosFuncion: ReadonlyArray<{
    icono: string;
    claves: ReadonlyArray<string>;
  }> = [
    { icono: 'servicios', claves: ['servicio oftalmol', 'servicios oftalmol'] },
    { icono: 'citas', claves: ['historial de citas'] },
    { icono: 'examen', claves: ['examen', 'exámen'] },
    { icono: 'antecedentes', claves: ['antecedente'] },
    { icono: 'diagnostico', claves: ['diagnostico', 'diagnóstico'] },
    { icono: 'agenda', claves: ['control'] },
    { icono: 'tratamiento', claves: ['tratamiento'] },
    { icono: 'receta', claves: ['receta', 'medicamento'] },
    { icono: 'indicacion', claves: ['indicacion', 'indicación'] },
    { icono: 'disponibilidad', claves: ['disponibilidad'] },
    { icono: 'agenda', claves: ['agenda'] },
    { icono: 'citas', claves: ['cita'] },
    { icono: 'historial', claves: ['historial'] },
    { icono: 'pacientes', claves: ['paciente'] },
    { icono: 'consulta', claves: ['consulta'] },
    { icono: 'perfil', claves: ['perfil'] },
    { icono: 'usuarios', claves: ['usuario'] },
    { icono: 'roles', claves: ['rol', 'permiso'] },
    { icono: 'bitacora', claves: ['bitacora', 'bitácora'] },
    { icono: 'ia', claves: ['asistencia', 'inteligencia', ' ia'] },
    { icono: 'pagos', claves: ['pago'] },
    { icono: 'reportes', claves: ['reporte'] },
    { icono: 'inventario', claves: ['inventario', 'proveedor'] },
    { icono: 'ajustes', claves: ['configurar'] },
  ];

  /** Ruta web asociada a una función del backend, o `null` si no aplica. */
  rutaDeFuncion(nombre: string): string | null {
    const clave = (nombre ?? '').toLowerCase().trim();

    if (this.nombresGestionServicios.has(this.normalizarNombre(clave))) {
      return '/gestion-servicios';
    }

    if (this.rutasFunciones.has(clave)) {
      return this.rutasFunciones.get(clave)!;
    }

    if (clave.includes('roles') && clave.includes('permisos')) {
      return '/roles';
    }

    if (clave.includes('usuario')) {
      return '/usuarios';
    }

    if (clave.includes('pacientes')) {
      return '/pacientes';
    }

    if (clave.includes('historial') && clave.includes('clínico')) {
      return '/historial-clinico';
    }

    if (clave.includes('historial') && clave.includes('clinico')) {
      return '/historial-clinico';
    }

    if (clave.includes('bitácora') || clave.includes('bitacora')) {
      return '/bitacora';
    }

    if (clave.includes('agenda') && clave.includes('disponibilidad')) {
      return '/agenda-disponibilidad';
    }

    if (clave.includes('disponibilidad') && clave.includes('configurar')) {
      return '/configurar-disponibilidad';
    }

    if (clave.includes('historial') && clave.includes('cita')) {
      return '/historial-citas';
    }

    if (clave.includes('cita') && clave.includes('gestionar')) {
      return '/gestionar-citas';
    }

    if (clave.includes('reporte')) {
      return '/reportes';
    }

    if (
      clave.includes('registrar') &&
      (clave.includes('diagnóstico') || clave.includes('diagnostico'))
    ) {
      return '/registrar-diagnostico';
    }

    if (clave.includes('programar') && clave.includes('control')) {
      return '/programar-controles-medicos';
    }

    if (
      clave.includes('tratamiento') ||
      clave.includes('receta') ||
      clave.includes('indicacion') ||
      clave.includes('indicación')
    ) {
      return '/tratamientos-recetas';
    }

    if (clave.includes('examen') || clave.includes('exámen')) {
      return '/examenes-oftalmologicos';
    }

    if (clave.includes('registrar') && clave.includes('consulta')) {
      return '/registrar-consulta-clinica';
    }

    return null;
  }

  private normalizarNombre(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  iconoDeModulo(nombre: string): string {
    const clave = this.normalizarNombre(nombre ?? '');
    const coincidencia = this.iconosModulo.find((grupo) =>
      grupo.claves.some((texto) => clave.includes(this.normalizarNombre(texto))),
    );
    return coincidencia?.icono ?? 'modulo';
  }

  iconoDeFuncion(nombre: string): string {
    const clave = this.normalizarNombre(nombre ?? '');
    const coincidencia = this.iconosFuncion.find((grupo) =>
      grupo.claves.some((texto) => clave.includes(this.normalizarNombre(texto))),
    );
    return coincidencia?.icono ?? 'documento';
  }

  /** Indica si una función debe ocultarse en la navegación web. */
  estaOcultaEnWeb(nombre: string): boolean {
    const valor = (nombre ?? '').trim();
    return this.funcionesOcultasWeb.some((patron) => patron.test(valor));
  }
}
