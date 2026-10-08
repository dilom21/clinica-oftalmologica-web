import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { AgendaService } from '../../../cu09-consultar-agenda-disponibilidad/services/agenda.service';
import {
  CitaMedica,
  DisponibilidadCita,
  IntervaloCita,
  OftalmologoCita,
} from '../../models/citas.models';
import { CitasService } from '../../services/citas.service';
import { CitaForm } from './cita-form';

const FECHA = '2026-09-29';

const PACIENTE: Paciente = {
  id: 1,
  usuario_id: null,
  nombres: 'María',
  apellidos: 'Quispe',
  ci: '12345678',
  fecha_nacimiento: '1990-05-04',
  sexo: 'F',
  telefono: '70000000',
  contacto_emergencia: '70000001',
  fecha_registro: '2026-09-01',
  direccion: 'Av. Siempre Viva 123',
  estado: true,
};

const OFTALMOLOGO: OftalmologoCita = {
  id: 3,
  matricula: 'MAT-003',
  nombres: 'Salet',
  apellidos: 'Ejemplo',
  especialidad: 'Oftalmología general',
};

function horaTexto(minutos: number): string {
  const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
  const mins = String(minutos % 60).padStart(2, '0');
  return `${horas}:${mins}:00`;
}

/** Turnos de 30 min de 08:00 a 12:00 y de 14:00 a 18:00 (16 turnos). */
function turnosDe30Min(): IntervaloCita[] {
  const turnos: IntervaloCita[] = [];
  for (const [inicio, fin] of [
    [8 * 60, 12 * 60],
    [14 * 60, 18 * 60],
  ]) {
    for (let minuto = inicio; minuto + 30 <= fin; minuto += 30) {
      turnos.push({ hora_inicio: horaTexto(minuto), hora_fin: horaTexto(minuto + 30) });
    }
  }
  return turnos;
}

const DISPONIBILIDAD: DisponibilidadCita = {
  oftalmologo: OFTALMOLOGO,
  fecha: FECHA,
  tiene_horario: true,
  horarios_base: [
    { hora_inicio: '08:00:00', hora_fin: '12:00:00' },
    { hora_inicio: '14:00:00', hora_fin: '18:00:00' },
  ],
  intervalos_disponibles: turnosDe30Min(),
};

const CITA_CREADA: CitaMedica = {
  id: 99,
  paciente_id: PACIENTE.id,
  oftalmologo_id: OFTALMOLOGO.id,
  fecha: FECHA,
  hora_inicio: '08:00:00',
  hora_fin: '08:30:00',
  motivo: null,
  observaciones: null,
  estado: 'PROGRAMADA',
  fecha_registro: null,
  fecha_actualizacion: null,
};

function click(fixture: ComponentFixture<CitaForm>, selector: string): void {
  const elemento = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  if (!elemento) {
    throw new Error(`No se encontró el elemento ${selector}`);
  }
  elemento.click();
  fixture.detectChanges();
}

function botonesHorario(fixture: ComponentFixture<CitaForm>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll(
      'app-cu10-selector-horarios .selector-horarios__boton',
    ),
  ) as HTMLButtonElement[];
}

describe('CitaForm (registrar cita)', () => {
  let agendaService: { obtenerDisponibilidad: ReturnType<typeof vi.fn> };
  let citasService: { crearCita: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    agendaService = { obtenerDisponibilidad: vi.fn(() => of(DISPONIBILIDAD)) };
    citasService = { crearCita: vi.fn(() => of(CITA_CREADA)) };

    await TestBed.configureTestingModule({
      imports: [CitaForm],
      providers: [
        { provide: AgendaService, useValue: agendaService },
        { provide: CitasService, useValue: citasService },
      ],
    }).compileComponents();
  });

  /** Completa paciente, oftalmólogo y fecha, y consulta la disponibilidad. */
  function prepararConsulta(fixture: ComponentFixture<CitaForm>): void {
    fixture.componentRef.setInput('pacientes', [PACIENTE]);
    fixture.componentRef.setInput('oftalmologos', [OFTALMOLOGO]);
    fixture.detectChanges();

    click(fixture, '.cita-paciente__campo');
    click(fixture, '.cita-paciente__opcion button');

    const select = fixture.nativeElement.querySelector(
      'select.cita-form__input',
    ) as HTMLSelectElement;
    select.value = String(OFTALMOLOGO.id);
    select.dispatchEvent(new Event('change'));

    const fechaInput = fixture.nativeElement.querySelector(
      'input.cita-form__input[type="date"]',
    ) as HTMLInputElement;
    fechaInput.value = FECHA;
    fechaInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    click(fixture, '.cita-form__boton--consultar');
  }

  it('muestra los 16 turnos de 30 minutos de la disponibilidad consultada', () => {
    const fixture = TestBed.createComponent(CitaForm);
    prepararConsulta(fixture);

    const botones = botonesHorario(fixture);
    expect(agendaService.obtenerDisponibilidad).toHaveBeenCalledWith(OFTALMOLOGO.id, FECHA);
    expect(botones).toHaveLength(16);
    expect(botones[0].textContent).toContain('08:00');
    expect(botones[15].textContent).toContain('17:30');
    expect(fixture.nativeElement.textContent).not.toContain('Sin horarios disponibles');
  });

  it('no ofrece turnos dentro de la pausa (12:00 - 14:00)', () => {
    const fixture = TestBed.createComponent(CitaForm);
    prepararConsulta(fixture);

    const horas = botonesHorario(fixture).map((boton) =>
      (boton.querySelector('time')?.textContent ?? '').trim(),
    );
    expect(horas).not.toContain('12:00');
    expect(horas).not.toContain('13:00');
    expect(horas).not.toContain('13:30');
  });

  it('registra la cita con la hora de inicio del turno elegido (formato de la API)', () => {
    const fixture = TestBed.createComponent(CitaForm);
    prepararConsulta(fixture);

    botonesHorario(fixture)[0].click();
    fixture.detectChanges();
    click(fixture, '.cita-form__boton--registrar');

    expect(citasService.crearCita).toHaveBeenCalledTimes(1);
    const cuerpo = citasService.crearCita.mock.calls[0][0] as Record<string, unknown>;
    expect(cuerpo).toEqual({
      paciente_id: PACIENTE.id,
      oftalmologo_id: OFTALMOLOGO.id,
      fecha: FECHA,
      hora_inicio: '08:00:00',
      motivo: null,
      observaciones: null,
    });
    expect(cuerpo).not.toHaveProperty('hora_fin');
  });

  it('permite registrar una cita en un turno de la tarde', () => {
    const fixture = TestBed.createComponent(CitaForm);
    prepararConsulta(fixture);

    const turnoTarde = botonesHorario(fixture).find((boton) =>
      boton.textContent?.includes('14:00'),
    );
    expect(turnoTarde).toBeTruthy();
    turnoTarde!.click();
    fixture.detectChanges();
    click(fixture, '.cita-form__boton--registrar');

    const cuerpo = citasService.crearCita.mock.calls[0][0] as Record<string, unknown>;
    expect(cuerpo['hora_inicio']).toBe('14:00:00');
  });
});
