import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../../environments/environment';
import { fechaActualClinica, formatearFechaControl } from '../../models/control-medico.models';
import { ConsultarHistorialClinico } from '../../../cu13-consultar-historial-clinico/pages/consultar-historial-clinico/consultar-historial-clinico';
import { SeguimientoControles } from './seguimiento-controles';

describe('SeguimientoControles (CU19)', () => {
  let fixture: ComponentFixture<SeguimientoControles>;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/historial-clinico`;
  const oftalmologo = { id: 2, nombres: 'Ana', apellidos: 'Pérez', matricula: 'MP-1', especialidad: null };
  const consulta = {
    id: 9, historial_clinico_id: 10, cita_id: null, oftalmologo,
    fecha_consulta: '2026-10-01T10:00:00', motivo_consulta: 'Visión borrosa',
    anamnesis: 'Consulta previa', observaciones: null, estado: true,
  };
  const control = {
    id: 8, consulta_clinica_id: 9, paciente_id: 1, oftalmologo_id: 2,
    fecha_programada: '2026-10-05', motivo: 'Seguimiento', observaciones: null, estado: 'PROGRAMADO',
  };
  const menu = [{ id: 1, nombre: 'Historial clínico', funciones: [
    { id: 19, nombre: 'Programar controles médicos', accion_id: 2, accion_nombre: 'ESCRITURA' },
  ] }];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-04T07:30:00Z'));
    localStorage.setItem('access_token', `header.${btoa(JSON.stringify({ sub: '2', rol_id: 2 }))}.sig`);
    await TestBed.configureTestingModule({
      imports: [SeguimientoControles, ConsultarHistorialClinico],
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeguimientoControles);
    fixture.componentRef.setInput('pacienteId', 1);
  });

  afterEach(() => {
    try { http.verify(); } finally { localStorage.removeItem('access_token'); vi.useRealTimers(); }
  });

  function iniciar(opciones: {
    permiso?: boolean;
    accion?: 'LECTURA' | 'ESCRITURA' | 'AMBAS';
    perfil?: typeof oftalmologo | null;
    consultas?: unknown[];
    controles?: unknown[];
    conservarListaPendiente?: boolean;
  } = {}): void {
    fixture.detectChanges();
    const menuSesion = opciones.accion
      ? [{ ...menu[0], funciones: [{ ...menu[0].funciones[0], accion_nombre: opciones.accion }] }]
      : menu;
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush(opciones.permiso === false ? [] : menuSesion);
    http.expectOne(`${baseUrl}/controles/oftalmologo-actual`).flush(opciones.perfil === undefined ? oftalmologo : opciones.perfil);
    const consultas = http.expectOne((r) => r.url === `${baseUrl}/consultas` && r.params.get('paciente_id') === '1');
    consultas.flush(opciones.consultas ?? [consulta]);
    if (!opciones.conservarListaPendiente) {
      http.expectOne((r) => r.url === `${baseUrl}/controles`).flush(opciones.controles ?? [control]);
    }
    fixture.detectChanges();
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((elemento) => elemento.textContent?.trim() === texto)!;
  }

  function programar(): void { boton('Programar control').click(); fixture.detectChanges(); }
  function campo(selector: string, valor: string, evento = 'input'): void {
    const elemento = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    elemento.value = valor;
    elemento.dispatchEvent(new Event(evento));
    fixture.detectChanges();
  }
  function completar(fecha = '2026-10-06', motivo = ' Seguimiento de evolución '): void {
    campo('input[type="date"]', fecha);
    campo('input[formControlName="motivo"]', motivo);
    campo('textarea', ' Indicaciones del control ');
  }
  function enviar(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('programa desde la atención seleccionada, evita doble envío y actualiza el listado', () => {
    fixture.componentRef.setInput('consultaInicialId', 9);
    iniciar();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Atención previa #9 · Ana Pérez');
    completar(); enviar(); enviar();
    const req = http.expectOne(`${baseUrl}/consultas/9/controles`);
    expect(req.request.body).toEqual({ fecha_programada: '2026-10-06', motivo: 'Seguimiento de evolución', observaciones: 'Indicaciones del control' });
    req.flush({ ...control, id: 11, fecha_programada: '2026-10-06' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Control médico programado correctamente');
    const tarjetas = fixture.nativeElement.querySelectorAll('.control-tarjeta');
    expect(tarjetas.length).toBe(2);
    expect(tarjetas[0].textContent).toContain('06/10/2026');
  });

  it('impide campos vacíos, espacios y fechas pasadas', () => {
    iniciar(); programar(); enviar();
    expect(fixture.nativeElement.textContent).toContain('Ingresa el motivo del control');
    completar('2026-10-03', '   '); enviar();
    completar('2026-10-03', 'Seguimiento'); enviar();
    http.expectNone(`${baseUrl}/consultas/9/controles`);
    expect(fixture.nativeElement.textContent).toContain('Revisa los campos obligatorios y la fecha');
  });

  it('muestra los errores del backend y conserva el formulario para corregirlos', () => {
    iniciar(); programar(); completar(); enviar();
    http.expectOne(`${baseUrl}/consultas/9/controles`).flush({ detail: 'Consulta clínica no encontrada o inactiva' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Consulta clínica no encontrada o inactiva');
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect((fixture.nativeElement.querySelector('input[formControlName="motivo"]') as HTMLInputElement).value).toContain('Seguimiento');
  });

  it('administra un control vencido sin reenviar su fecha y cambia su estado', () => {
    const vencido = { ...control, fecha_programada: '2026-10-02' };
    iniciar({ controles: [vencido] });
    boton('Administrar control').click(); fixture.detectChanges();
    http.expectOne(`${baseUrl}/controles/8`).flush(vencido); fixture.detectChanges();
    campo('select[formControlName="estado"]', 'REALIZADO', 'change'); enviar();
    const req = http.expectOne(`${baseUrl}/controles/8`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ motivo: 'Seguimiento', observaciones: null, estado: 'REALIZADO' });
    req.flush({ ...vencido, estado: 'REALIZADO' }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Control médico actualizado correctamente');
    expect(fixture.nativeElement.textContent).toContain('Realizado');
  });

  it('no ofrece escritura sin permiso y mantiene la lectura del seguimiento', () => {
    iniciar({ permiso: false });
    expect(boton('Programar control')).toBeUndefined();
    expect(boton('Administrar control')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Seguimiento');
    expect(fixture.nativeElement.textContent).toContain('Tu cuenta no tiene permiso de escritura para programar controles médicos');
    expect(fixture.nativeElement.querySelectorAll('.controles-consulta .controles-estado').length).toBe(0);
  });

  it('explica la falta de perfil activo aunque la cuenta tenga rol y permiso de escritura', () => {
    iniciar({ perfil: null });
    expect(boton('Programar control')).toBeUndefined();
    expect(boton('Administrar control')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Tu cuenta no tiene un perfil de oftalmólogo activo');
    expect(fixture.nativeElement.textContent).toContain('inicia sesión con el oftalmólogo responsable de la atención');
    expect(fixture.nativeElement.textContent).toContain('Consulta #9');
    expect(fixture.nativeElement.querySelectorAll('.controles-consulta .controles-estado').length).toBe(0);
  });

  it('explica el permiso de solo lectura sin ofrecer acciones de escritura', () => {
    iniciar({ accion: 'LECTURA' });
    expect(fixture.nativeElement.textContent).toContain('Tu cuenta no tiene permiso de escritura para programar controles médicos');
    expect(boton('Programar control')).toBeUndefined();
    expect(boton('Administrar control')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Control #8');
  });

  it.each(['ESCRITURA', 'AMBAS'] as const)('mantiene las acciones para la consulta propia con permiso %s', (accion) => {
    iniciar({ accion });
    expect(boton('Programar control')).toBeTruthy();
    expect(boton('Administrar control')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Tu cuenta no tiene');
    expect(fixture.nativeElement.querySelectorAll('.controles-consulta .controles-estado').length).toBe(0);
  });

  it.each(['perfil', 'permisos'] as const)('espera la respuesta de %s sin mostrar restricciones transitorias', (pendiente) => {
    fixture.detectChanges();
    const permiso = http.expectOne(`${environment.apiUrl}/seguridad/menu`);
    const perfil = http.expectOne(`${baseUrl}/controles/oftalmologo-actual`);
    if (pendiente === 'perfil') permiso.flush(menu);
    else perfil.flush(oftalmologo);
    http.expectOne((r) => r.url === `${baseUrl}/consultas`).flush([consulta]);
    http.expectOne((r) => r.url === `${baseUrl}/controles`).flush([control]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verificando permisos y perfil del oftalmólogo');
    expect(fixture.nativeElement.textContent).not.toContain('Tu cuenta no tiene');
    expect(fixture.nativeElement.querySelectorAll('.controles-consulta .controles-estado').length).toBe(0);
    expect(boton('Programar control')).toBeUndefined();
    if (pendiente === 'perfil') perfil.flush(oftalmologo);
    else permiso.flush(menu);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Verificando permisos y perfil del oftalmólogo');
    expect(boton('Programar control')).toBeTruthy();
  });

  it('explica que la sesión requiere rol Oftalmólogo sin consultar un perfil de otro rol', () => {
    localStorage.setItem('access_token', `header.${btoa(JSON.stringify({ sub: '3', rol_id: 3 }))}.sig`);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush(menu);
    http.expectNone(`${baseUrl}/controles/oftalmologo-actual`);
    http.expectOne((r) => r.url === `${baseUrl}/consultas`).flush([consulta]);
    http.expectOne((r) => r.url === `${baseUrl}/controles`).flush([control]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Solo un oftalmólogo puede programar controles médicos');
    expect(fixture.nativeElement.textContent).not.toContain('Verificando permisos');
    expect(boton('Programar control')).toBeUndefined();
    expect(boton('Administrar control')).toBeUndefined();
  });

  it('no permite administrar atenciones de otro oftalmólogo ni registros anteriores sin atención', () => {
    iniciar({ consultas: [{ ...consulta, oftalmologo: { ...oftalmologo, id: 3, nombres: 'Salet', apellidos: 'Ejemplo' } }], controles: [{ ...control, consulta_clinica_id: null }] });
    expect(boton('Programar control')).toBeUndefined();
    expect(boton('Administrar control')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Registro anterior sin atención asociada');
    expect(fixture.nativeElement.querySelector('.controles-consulta .controles-estado').textContent).toContain('Solo Salet Ejemplo puede programar controles de esta atención');
    expect(fixture.nativeElement.textContent).toContain('Selecciona una consulta tuya o inicia sesión con su cuenta');
  });

  it('oculta la programación para atenciones futuras, inactivas o con fecha inválida', () => {
    iniciar({ consultas: [
      { ...consulta, id: 1, fecha_consulta: '2026-10-05T10:00:00Z' },
      { ...consulta, id: 2, fecha_consulta: null },
      { ...consulta, id: 3, fecha_consulta: 'incorrecta' },
      { ...consulta, id: 4, estado: false },
    ] });
    expect(boton('Programar control')).toBeUndefined();
    const mensajes = Array.from(fixture.nativeElement.querySelectorAll('.controles-consulta .controles-estado') as NodeListOf<HTMLParagraphElement>)
      .map((elemento) => elemento.textContent);
    expect(mensajes[0]).toContain('Esta atención tiene una fecha futura');
    expect(mensajes[1]).toContain('La fecha de esta consulta no es válida');
    expect(mensajes[2]).toContain('La fecha de esta consulta no es válida');
    expect(mensajes[3]).toContain('Esta consulta está inactiva');
  });

  it('espera la lista pendiente antes de escribir y conserva los controles anteriores y el nuevo', () => {
    iniciar({ conservarListaPendiente: true });
    const listaAnterior = http.expectOne((r) => r.url === `${baseUrl}/controles`);
    expect(boton('Programar control').disabled).toBe(true);
    boton('Programar control').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    http.expectNone(`${baseUrl}/consultas/9/controles`);
    listaAnterior.flush([control]); fixture.detectChanges();
    programar(); completar(); enviar();
    http.expectOne(`${baseUrl}/consultas/9/controles`).flush({ ...control, id: 11 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Control #11');
    expect(fixture.nativeElement.textContent).toContain('Control #8');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando controles');
  });

  it('cancela solicitudes anteriores al cambiar de paciente y no mezcla contextos', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush(menu);
    http.expectOne(`${baseUrl}/controles/oftalmologo-actual`).flush(oftalmologo);
    const consultasAnteriores = http.expectOne((r) => r.url === `${baseUrl}/consultas`);
    const controlesAnteriores = http.expectOne((r) => r.url === `${baseUrl}/controles`);
    fixture.componentRef.setInput('pacienteId', 4); fixture.detectChanges();
    expect(consultasAnteriores.cancelled).toBe(true);
    expect(controlesAnteriores.cancelled).toBe(true);
    http.expectOne((r) => r.url === `${baseUrl}/consultas` && r.params.get('paciente_id') === '4').flush([]);
    http.expectOne((r) => r.url === `${baseUrl}/controles` && r.params.get('paciente_id') === '4').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Visión borrosa');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('filtra los controles de una atención sin cambiar de paciente', () => {
    iniciar({ consultas: [consulta, { ...consulta, id: 10 }], controles: [control, { ...control, id: 12, consulta_clinica_id: 10 }] });
    campo('.controles-campo--filtro select', '10', 'change');
    expect(fixture.nativeElement.querySelectorAll('.control-tarjeta').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.control-tarjeta').textContent).toContain('Control #12');
  });

  it('bloquea el guardado durante una actualización del listado y conserva ambos registros', () => {
    iniciar(); programar(); completar();
    boton('Actualizar').click(); fixture.detectChanges();
    enviar(); http.expectNone(`${baseUrl}/consultas/9/controles`);
    http.expectOne((r) => r.url === `${baseUrl}/consultas`).flush([consulta]);
    http.expectOne((r) => r.url === `${baseUrl}/controles`).flush([control]);
    fixture.detectChanges(); enviar();
    http.expectOne(`${baseUrl}/consultas/9/controles`).flush({ ...control, id: 11 }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.control-tarjeta').length).toBe(2);
  });

  it('reintenta una carga fallida y abre el contexto de consulta cuando la carga completa termina', () => {
    fixture.componentRef.setInput('consultaInicialId', 9);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush(menu);
    http.expectOne(`${baseUrl}/controles/oftalmologo-actual`).flush(oftalmologo);
    http.expectOne((r) => r.url === `${baseUrl}/consultas`).flush([consulta]);
    http.expectOne((r) => r.url === `${baseUrl}/controles`).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(boton('Actualizar').disabled).toBe(false);
    boton('Actualizar').click(); fixture.detectChanges();
    http.expectOne((r) => r.url === `${baseUrl}/consultas`).flush([consulta]);
    http.expectOne((r) => r.url === `${baseUrl}/controles`).flush([control]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('mantiene el historial y los antecedentes existentes si falla la carga de controles CU19', () => {
    fixture.destroy();
    const historialFixture = TestBed.createComponent(ConsultarHistorialClinico);
    historialFixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/seguridad/menu`).flush(menu);
    const paciente = {
      id: 1, nombres: 'Juan', apellidos: 'Quispe', ci: '123',
      fecha_nacimiento: '1990-01-01', sexo: 'M', telefono: '70000000',
    };
    http.expectOne(`${environment.apiUrl}/pacientes`).flush([paciente]); historialFixture.detectChanges();
    (historialFixture.nativeElement.querySelector('.selector__paciente') as HTMLButtonElement).click();
    historialFixture.detectChanges();
    http.expectOne(`${baseUrl}/1`).flush({ paciente, historial: {
      id: 10, fecha_apertura: '2026-01-01', observaciones_generales: 'Historial conservado',
      antecedentes: [{ id: 1, tipo: 'ALERGIA', descripcion: 'Penicilina', fecha_registro: '2026-01-02' }],
    } }); historialFixture.detectChanges();
    http.expectOne(`${baseUrl}/controles/oftalmologo-actual`).flush(oftalmologo);
    const consultas = http.match((r) => r.url === `${baseUrl}/consultas`);
    expect(consultas.length).toBe(2);
    consultas.forEach((request) => request.flush([]));
    http.expectOne((r) => r.url === `${baseUrl}/controles`).flush({}, { status: 500, statusText: 'Server Error' });
    historialFixture.detectChanges();
    expect(historialFixture.nativeElement.querySelector('.bloque').textContent).toContain('Historial conservado');
    expect(historialFixture.nativeElement.querySelector('.antecedentes').textContent).toContain('Penicilina');
    expect(historialFixture.nativeElement.querySelector('app-seguimiento-controles').textContent).toContain('Ocurrió un error en el servidor');
  });

  it('calcula hoy en Bolivia y muestra fechas DATE sin restar un día', () => {
    vi.setSystemTime(new Date('2026-10-05T02:30:00Z'));
    expect(fechaActualClinica()).toBe('2026-10-04');
    expect(formatearFechaControl('2026-10-05')).toBe('05/10/2026');
  });
});
