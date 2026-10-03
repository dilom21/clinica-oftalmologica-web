import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgendaService } from '../../../cu09-consultar-agenda-disponibilidad/services/agenda.service';
import {
  CitaMedica,
  DisponibilidadCita,
  IntervaloCita,
  OftalmologoCita,
  PacienteCatalogo,
} from '../../models/citas.models';
import { CitasService } from '../../services/citas.service';
import { ReprogramarModal } from './reprogramar-modal';

const FECHA = '2026-09-29';

const CITA: CitaMedica = {
  id: 42,
  paciente_id: 1,
  oftalmologo_id: 3,
  fecha: FECHA,
  hora_inicio: '09:00:00',
  hora_fin: '09:30:00',
  motivo: 'Control de agudeza visual',
  observaciones: null,
  estado: 'PROGRAMADA',
  fecha_registro: null,
  fecha_actualizacion: null,
};

const PACIENTE: PacienteCatalogo = {
  id: 1,
  nombres: 'María',
  apellidos: 'Quispe',
  ci: '12345678',
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

const CITA_REPROGRAMADA: CitaMedica = {
  ...CITA,
  hora_inicio: '14:00:00',
  hora_fin: '14:30:00',
};

function click(fixture: ComponentFixture<ReprogramarModal>, selector: string): void {
  const elemento = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  if (!elemento) {
    throw new Error(`No se encontró el elemento ${selector}`);
  }
  elemento.click();
  fixture.detectChanges();
}

function botonesHorario(fixture: ComponentFixture<ReprogramarModal>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll(
      'app-cu10-selector-horarios .selector-horarios__boton',
    ),
  ) as HTMLButtonElement[];
}

describe('ReprogramarModal', () => {
  let agendaService: { obtenerDisponibilidad: ReturnType<typeof vi.fn> };
  let citasService: { reprogramarCita: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    agendaService = { obtenerDisponibilidad: vi.fn(() => of(DISPONIBILIDAD)) };
    citasService = { reprogramarCita: vi.fn(() => of(CITA_REPROGRAMADA)) };

    await TestBed.configureTestingModule({
      imports: [ReprogramarModal],
      providers: [
        { provide: AgendaService, useValue: agendaService },
        { provide: CitasService, useValue: citasService },
      ],
    }).compileComponents();
  });

  /** Abre el modal con la cita a reprogramar y consulta la nueva fecha. */
  function abrirYConsultar(fixture: ComponentFixture<ReprogramarModal>): void {
    fixture.componentRef.setInput('abierto', true);
    fixture.componentRef.setInput('cita', CITA);
    fixture.componentRef.setInput('pacientes', [PACIENTE]);
    fixture.componentRef.setInput('oftalmologos', [OFTALMOLOGO]);
    fixture.detectChanges();

    click(fixture, '.reprogramar-modal__boton-consultar');
  }

  it('ofrece los 16 turnos de 30 minutos al consultar la nueva fecha', () => {
    const fixture = TestBed.createComponent(ReprogramarModal);
    abrirYConsultar(fixture);

    const botones = botonesHorario(fixture);
    expect(agendaService.obtenerDisponibilidad).toHaveBeenCalledWith(OFTALMOLOGO.id, FECHA);
    expect(botones).toHaveLength(16);
    expect(botones[0].textContent).toContain('08:00');
    expect(botones[15].textContent).toContain('17:30');
    expect(fixture.nativeElement.textContent).toContain('16 turno(s) de 30 min');
    expect(fixture.nativeElement.textContent).not.toContain('Sin horarios disponibles');
  });

  it('reprograma la cita con la hora de inicio del turno elegido (sin hora_fin)', () => {
    const fixture = TestBed.createComponent(ReprogramarModal);
    abrirYConsultar(fixture);

    const turnoTarde = botonesHorario(fixture).find((boton) =>
      boton.textContent?.includes('14:00'),
    );
    expect(turnoTarde).toBeTruthy();
    turnoTarde!.click();
    fixture.detectChanges();

    click(fixture, '.reprogramar-modal__btn--guardar');

    expect(citasService.reprogramarCita).toHaveBeenCalledTimes(1);
    const [citaId, cuerpo] = citasService.reprogramarCita.mock.calls[0] as [
      number,
      Record<string, unknown>,
    ];
    expect(citaId).toBe(CITA.id);
    expect(cuerpo).toEqual({ fecha: FECHA, hora_inicio: '14:00:00' });
    expect(cuerpo).not.toHaveProperty('hora_fin');
  });

  it('mantiene deshabilitado el guardado hasta elegir un turno', () => {
    const fixture = TestBed.createComponent(ReprogramarModal);
    abrirYConsultar(fixture);

    const guardar = fixture.nativeElement.querySelector(
      '.reprogramar-modal__btn--guardar',
    ) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    botonesHorario(fixture)[0].click();
    fixture.detectChanges();

    expect(guardar.disabled).toBe(false);
  });
});
