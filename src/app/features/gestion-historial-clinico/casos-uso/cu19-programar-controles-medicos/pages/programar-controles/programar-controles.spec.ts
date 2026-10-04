import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { authGuard } from '../../../../../../core/guards/auth.guard';
import { routes } from '../../../../../../app.routes';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { environment } from '../../../../../../../environments/environment';
import { ProgramarControles } from './programar-controles';

describe('ProgramarControles (CU19)', () => {
  let fixture: ComponentFixture<ProgramarControles>;
  let http: HttpTestingController;
  const paciente = { id: 1, nombres: 'Juan', apellidos: 'Quispe', ci: '123', telefono: '70000000' };
  const params = convertToParamMap({ paciente_id: '1', consulta_id: '9' });
  const baseUrl = `${environment.apiUrl}/historial-clinico`;

  beforeEach(async () => {
    localStorage.setItem('access_token', `header.${btoa(JSON.stringify({ sub: '2', rol_id: 2 }))}.sig`);
    await TestBed.configureTestingModule({
      imports: [ProgramarControles],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProgramarControles);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('access_token'); });

  it('reutiliza paciente y consulta enviados desde CU15 sin volver a seleccionarlos', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush([]);
    http.expectOne(`${environment.apiUrl}/pacientes`).flush([paciente]);
    fixture.detectChanges();
    const oftalmologo = { id: 2, nombres: 'Ana', apellidos: 'Pérez', matricula: 'MP-1', especialidad: null };
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush([{ id: 1, nombre: 'Clínico', funciones: [
      { id: 19, nombre: 'Programar controles médicos', accion_id: 2, accion_nombre: 'ESCRITURA' },
    ] }]);
    http.expectOne(`${baseUrl}/controles/oftalmologo-actual`).flush(oftalmologo);
    http.expectOne((r) => r.url === `${baseUrl}/consultas` && r.params.get('paciente_id') === '1').flush([{
      id: 9, historial_clinico_id: 10, cita_id: null, oftalmologo,
      fecha_consulta: '2026-01-01T10:00:00Z', motivo_consulta: 'Seguimiento',
      anamnesis: null, observaciones: null, estado: true,
    }]);
    http.expectOne((r) => r.url === `${baseUrl}/controles` && r.params.get('paciente_id') === '1').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Juan Quispe');
    expect(fixture.nativeElement.textContent).toContain('Atención previa #9');
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect((fixture.nativeElement.querySelector('.historial-selector select') as HTMLSelectElement).value).toBe('1');
  });

  it('conserva protección de autenticación y mapea el menú CU19', () => {
    const ruta = routes.find((r) => r.path === 'programar-controles-medicos');
    expect(ruta?.canActivate).toContain(authGuard);
    const sidebar = TestBed.runInInjectionContext(() => new Sidebar({} as MenuService));
    expect(sidebar.rutaDeFuncion('Programar controles médicos')).toBe('/programar-controles-medicos');
    expect(sidebar.rutaDeFuncion('PROGRAMAR CONTROLES MEDICOS')).toBe('/programar-controles-medicos');
    expect(sidebar.rutaDeFuncion('Consultar historial clínico')).toBe('/historial-clinico');
  });
});
