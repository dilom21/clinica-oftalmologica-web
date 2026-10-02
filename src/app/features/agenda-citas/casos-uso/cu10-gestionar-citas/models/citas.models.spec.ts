import {
  DURACION_CITA_MINUTOS,
  ETIQUETA_DURACION_CITA,
  horariosReservables,
  IntervaloCita,
} from './citas.models';

/**
 * Turnos que devuelve el backend para el oftalmólogo Salet Ejemplo el
 * 29/09/2026: 16 turnos individuales de 30 minutos, desde 08:00-08:30 hasta
 * 17:30-18:00, con una pausa de 12:00 a 14:00.
 */
const TURNOS_SALET_EJEMPLO: IntervaloCita[] = [
  { hora_inicio: '08:00:00', hora_fin: '08:30:00' },
  { hora_inicio: '08:30:00', hora_fin: '09:00:00' },
  { hora_inicio: '09:00:00', hora_fin: '09:30:00' },
  { hora_inicio: '09:30:00', hora_fin: '10:00:00' },
  { hora_inicio: '10:00:00', hora_fin: '10:30:00' },
  { hora_inicio: '10:30:00', hora_fin: '11:00:00' },
  { hora_inicio: '11:00:00', hora_fin: '11:30:00' },
  { hora_inicio: '11:30:00', hora_fin: '12:00:00' },
  { hora_inicio: '14:00:00', hora_fin: '14:30:00' },
  { hora_inicio: '14:30:00', hora_fin: '15:00:00' },
  { hora_inicio: '15:00:00', hora_fin: '15:30:00' },
  { hora_inicio: '15:30:00', hora_fin: '16:00:00' },
  { hora_inicio: '16:00:00', hora_fin: '16:30:00' },
  { hora_inicio: '16:30:00', hora_fin: '17:00:00' },
  { hora_inicio: '17:00:00', hora_fin: '17:30:00' },
  { hora_inicio: '17:30:00', hora_fin: '18:00:00' },
];

function duracionMinutos(turno: IntervaloCita): number {
  const aMinutos = (hora: string): number => {
    const [horas = '0', minutos = '0'] = hora.split(':');
    return Number(horas) * 60 + Number(minutos);
  };
  return aMinutos(turno.hora_fin) - aMinutos(turno.hora_inicio);
}

describe('modelo de citas (CU10)', () => {
  it('declara la duración oficial de 30 minutos definida por el backend', () => {
    expect(DURACION_CITA_MINUTOS).toBe(30);
    expect(ETIQUETA_DURACION_CITA).toBe('30 min');
  });
});

describe('horariosReservables', () => {
  it('conserva los 16 turnos de 30 minutos del caso Salet Ejemplo (29/09/2026)', () => {
    const opciones = horariosReservables(TURNOS_SALET_EJEMPLO);

    expect(opciones).toHaveLength(16);
    expect(opciones).toEqual(TURNOS_SALET_EJEMPLO);
    expect(opciones[0]).toEqual({ hora_inicio: '08:00:00', hora_fin: '08:30:00' });
    expect(opciones[15]).toEqual({ hora_inicio: '17:30:00', hora_fin: '18:00:00' });
  });

  it('no descarta turnos por durar menos de una hora', () => {
    const opciones = horariosReservables(TURNOS_SALET_EJEMPLO);

    expect(opciones).toHaveLength(TURNOS_SALET_EJEMPLO.length);
    expect(opciones.every((turno) => duracionMinutos(turno) === DURACION_CITA_MINUTOS)).toBe(true);
  });

  it('no vuelve a dividir los turnos recibidos', () => {
    // Con la regla anterior (slots de 60 min) solo sobrevivirían 8 opciones.
    expect(horariosReservables(TURNOS_SALET_EJEMPLO)).toHaveLength(16);
    expect(horariosReservables([{ hora_inicio: '08:00:00', hora_fin: '08:30:00' }])).toEqual([
      { hora_inicio: '08:00:00', hora_fin: '08:30:00' },
    ]);
  });

  it('respeta la pausa del oftalmólogo entre 12:00 y 14:00', () => {
    const opciones = horariosReservables(TURNOS_SALET_EJEMPLO);
    const horasDeInicio = opciones.map((turno) => turno.hora_inicio);

    expect(horasDeInicio).not.toContain('12:00:00');
    expect(horasDeInicio).not.toContain('13:00:00');
    expect(horasDeInicio).not.toContain('13:30:00');
  });

  it('mantiene el formato hora_inicio / hora_fin que espera la API', () => {
    for (const opcion of horariosReservables(TURNOS_SALET_EJEMPLO)) {
      expect(Object.keys(opcion).sort()).toEqual(['hora_fin', 'hora_inicio']);
      expect(opcion.hora_inicio).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(opcion.hora_fin).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });

  it('ordena cronológicamente los turnos aunque lleguen desordenados', () => {
    const desordenados = [...TURNOS_SALET_EJEMPLO].reverse();

    expect(horariosReservables(desordenados)).toEqual(TURNOS_SALET_EJEMPLO);
  });

  it('devuelve una lista vacía cuando el backend no reporta turnos', () => {
    expect(horariosReservables([])).toEqual([]);
  });

  it('no muta el arreglo de intervalos recibido', () => {
    const entrada = [...TURNOS_SALET_EJEMPLO].reverse();
    const copia = [...entrada];

    horariosReservables(entrada);

    expect(entrada).toEqual(copia);
  });
});
