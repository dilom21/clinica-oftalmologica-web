import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntervaloCita } from '../../models/citas.models';
import { SelectorHorarios } from './selector-horarios';

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

function crearSelector(
  opciones: IntervaloCita[],
  fecha = '2026-09-29',
): ComponentFixture<SelectorHorarios> {
  const fixture = TestBed.createComponent(SelectorHorarios);
  fixture.componentRef.setInput('opciones', opciones);
  fixture.componentRef.setInput('fecha', fecha);
  fixture.detectChanges();
  return fixture;
}

function botonesHorario(fixture: ComponentFixture<SelectorHorarios>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.selector-horarios__boton'),
  ) as HTMLButtonElement[];
}

describe('SelectorHorarios', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SelectorHorarios] }).compileComponents();
  });

  it('muestra una opción por cada turno individual de 30 minutos', () => {
    const fixture = crearSelector(turnosDe30Min());
    const botones = botonesHorario(fixture);

    expect(botones).toHaveLength(16);
    expect(botones[0].textContent).toContain('08:00');
    expect(botones[7].textContent).toContain('11:30');
    expect(botones[8].textContent).toContain('14:00');
    expect(botones[15].textContent).toContain('17:30');
    expect(fixture.nativeElement.textContent).not.toContain('Sin horarios disponibles');
  });

  it('indica que cada cita dura 30 minutos', () => {
    const fixture = crearSelector(turnosDe30Min());
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Cada cita dura 30 min.');
    expect(texto).toContain('30 min');
    expect(texto).not.toContain('1 hora');
  });

  it('emite el turno seleccionado con el formato hora_inicio / hora_fin', () => {
    const turnos = turnosDe30Min();
    const fixture = crearSelector(turnos);
    const emitidos: IntervaloCita[] = [];
    fixture.componentInstance.seleccionar.subscribe((turno) => emitidos.push(turno));

    botonesHorario(fixture)[1].click();
    fixture.detectChanges();

    expect(emitidos).toEqual([{ hora_inicio: '08:30:00', hora_fin: '09:00:00' }]);
  });

  it('marca como seleccionado el turno activo', () => {
    const turnos = turnosDe30Min();
    const fixture = crearSelector(turnos);
    fixture.componentRef.setInput('seleccionado', turnos[0]);
    fixture.detectChanges();

    const boton = botonesHorario(fixture)[0];
    expect(boton.classList.contains('selector-horarios__boton--activo')).toBe(true);
    expect(boton.textContent).toContain('Seleccionado');
  });

  it('muestra el estado vacío solo cuando no hay turnos disponibles', () => {
    const fixture = crearSelector([]);

    expect(botonesHorario(fixture)).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Sin horarios disponibles');
  });
});
