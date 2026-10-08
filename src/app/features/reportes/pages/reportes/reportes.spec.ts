import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Reportes } from './reportes';
import { ReportesService } from '../../services/reportes.service';
import { AuthService } from '../../../autenticacion-seguridad/Auth/services/auth.service';
import { VoiceRecognitionService } from '../../../../shared/services/voice-recognition.service';

describe('Reportes', () => {
  let fixture: ComponentFixture<Reportes>;
  let component: Reportes;
  let dynamicEmailResponse: Observable<unknown>;
  let staticEmailResponse: Observable<unknown>;
  let dynamicExportCalls: string[];
  let staticExportCalls: string[];
  let voiceResponse: Record<string, unknown>;
  const catalog = { datasets: [{ key: 'pacientes', label: 'Pacientes', fields: [
    { key: 'id', label: 'ID', type: 'number', operators: ['eq'], sortable: true, default: true },
    { key: 'activo', label: 'Activo', type: 'boolean', operators: ['eq'], sortable: false },
    { key: 'estado', label: 'Estado', type: 'text', operators: ['in'], sortable: false },
    { key: 'fecha', label: 'Fecha', type: 'date', operators: ['between'], sortable: false },
  ] }], staticReports: [{ key: 'pacientes_activos', label: 'Pacientes activos', description: 'Pacientes habilitados.', columns: [{ key: 'id', label: 'ID', type: 'number', operators: [], sortable: false }], filters: [{ key: 'activo', label: 'Activo', type: 'boolean', operators: ['eq'], sortable: false }] }] };
  const preview = { columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 1 }], total: 4, limit: 1 };
  const service = {
    obtenerCatalogo: () => of(catalog), previsualizarDinamico: () => of(preview),
    previsualizarEstatico: () => of({ columns: [], rows: [], total: 0, limit: 10 }),
    exportarDinamico: (format: string) => { dynamicExportCalls.push(format); return of({ body: new Blob(['x']), headers: new Headers() }); },
    exportarEstatico: (format: string) => { staticExportCalls.push(format); return of({ body: new Blob(['x']), headers: new Headers() }); },
     enviarEmailDinamico: () => dynamicEmailResponse, enviarEmailEstatico: () => staticEmailResponse,
     interpretarReporte: () => of(voiceResponse),
  };

  beforeEach(async () => {
     dynamicEmailResponse = of({}); staticEmailResponse = of({}); dynamicExportCalls = []; staticExportCalls = [];
     voiceResponse = { dataset: 'pacientes', columnas: ['id'], filtros: [{ campo: 'activo', operador: 'eq', valor: true }], orden: [{ campo: 'id', direccion: 'desc' }], limit: 25, accion_sugerida: 'previsualizar', formato_sugerido: null };
    await TestBed.configureTestingModule({ imports: [Reportes], providers: [provideRouter([]), { provide: ReportesService, useValue: service }, { provide: AuthService, useValue: { logout: () => undefined } }] }).compileComponents();
    fixture = TestBed.createComponent(Reportes); component = fixture.componentInstance; fixture.detectChanges();
  });

   it('loads catalog, changes dataset and selects columns', () => { expect(component['datasetKey']()).toBe('pacientes'); component.seleccionarDataset('pacientes'); component.alternarColumna('activo', true); expect(component['columnas']()).toEqual(['id', 'activo']); });
   it('opens voice dialog with the required accessible action and applies only valid IA configuration', () => {
     expect(fixture.nativeElement.querySelector('[aria-label="Crear reporte por voz"]')).toBeTruthy();
     component['transcriptVoz'].set('Muéstrame pacientes activos');
     component.interpretarVoz();
     expect(component['modo']()).toBe('dinamico');
     expect(component['columnas']()).toEqual(['id']);
     expect(component['filtros']()[0].field).toBe('activo');
     expect(component['ordenes']()[0].direction).toBe('desc');
     expect(component['limite']()).toBe(25);
     expect(component['preview']()).toBeNull();
     expect(dynamicExportCalls).toEqual([]);
   });
  it('adds filters and changes operators from the selected field', () => { component.seleccionarModo('dinamico'); component.agregarFiltro(); component.cambiarCampoFiltro(0, 'estado'); expect(component['filtros']()[0].operator).toBe('in'); });
   it('builds typed between and in filters without empty filters', () => {
     component.seleccionarModo('dinamico'); component.agregarFiltro(); component.cambiarCampoFiltro(0, 'id'); component.cambiarOperadorFiltro(0, 'in'); component['filtros']()[0].valueText = '1, 2';
     component.agregarFiltro(); component.cambiarCampoFiltro(1, 'fecha'); component['filtros']()[1].valueText = '2026-01-01'; component['filtros']()[1].valueText2 = '2026-01-31';
     expect(component['construirRequest']()).toEqual({ dataset: 'pacientes', columns: ['id'], filters: [{ field: 'id', operator: 'in', value: [1, 2] }, { field: 'fecha', operator: 'between', value: '2026-01-01', value2: '2026-01-31' }] });
   });
   it('disables actions until the selected report or dynamic dataset columns are ready', () => { expect(component['puedeEjecutar']()).toBeTruthy(); component.seleccionarReporte(''); expect(component['puedeEjecutar']()).toBeFalsy(); component.seleccionarModo('dinamico'); component.seleccionarDataset(''); expect(component['puedeEjecutar']()).toBeFalsy(); component.seleccionarDataset('pacientes'); component['columnas'].set([]); expect(component['puedeEjecutar']()).toBeFalsy(); });
  it('limits dynamic sorting to three rules and previews selected columns', () => { component.seleccionarModo('dinamico'); component.agregarOrden(); component.agregarOrden(); component.agregarOrden(); component.agregarOrden(); expect(component['ordenes']()).toHaveLength(3); component.previsualizar(); expect(component['preview']()).toEqual(preview); });
  it('clears dynamic sorting before a static request and validates missing columns', () => { component.seleccionarModo('dinamico'); component.agregarOrden(); component.seleccionarModo('estatico'); expect(component['ordenes']()).toEqual([]); component.seleccionarModo('dinamico'); component['columnas'].set([]); component.previsualizar(); expect(component['error']()).toContain('Revisa'); });
   it('maps friendly errors', () => { expect(component['mensajeError']({ status: 403 })).toBe('No tienes permiso para generar reportes.'); expect(component['mensajeError']({ status: 422 })).toBe('Revisa la configuración del reporte.'); expect(component['mensajeError']({ status: 500 })).toBe('No se pudo completar la operación.'); });

   it('shows HTML export and calls the dynamic export operation', () => {
     expect(fixture.nativeElement.textContent).toContain('HTML (.html)');
     component.seleccionarModo('dinamico');
     component.exportar('html');
     expect(dynamicExportCalls).toEqual(['html']);
   });

    it('opens an accessible email dialog and closes it with Escape', () => {
     component.abrirEmail(); fixture.detectChanges();
     const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
     expect(dialog.getAttribute('aria-modal')).toBe('true');
     expect(dialog.getAttribute('aria-labelledby')).toBe('email-title');
     expect(dialog.textContent).toContain('Enviar reporte por correo');
     component.protegerEscape(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    });

    it('closes the voice dialog with Escape and stops the active recognition', () => {
      const voice = TestBed.inject(VoiceRecognitionService);
      const stopSpy = vi.spyOn(voice, 'stop');
      component.abrirVoz(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#voice-title')).toBeTruthy();
      component.protegerEscape(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
      expect(stopSpy).toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('#voice-title')).toBeNull();
    });

   it('requires a valid recipient and subject before sending', () => {
     component.abrirEmail(); component.enviarEmail();
     expect(component['emailError']()).toBe('Revisa los campos requeridos del correo.');
     component['emailDestinatario'].set('not-an-email'); component['emailAsunto'].set('Reporte'); component.enviarEmail();
     expect(component['emailError']()).toBe('Revisa los campos requeridos del correo.');
     component['emailDestinatario'].set('destino@example.com'); component['emailAsunto'].set(''); component.enviarEmail();
     expect(component['emailError']()).toBe('Revisa los campos requeridos del correo.');
   });

   it('offers all supported email formats', () => {
     component.abrirEmail(); fixture.detectChanges();
     const values = Array.from(fixture.nativeElement.querySelector('#email-formato').options as HTMLOptionElement[]).map((option) => option.value);
     expect(values).toEqual(['pdf', 'xlsx', 'csv', 'html']);
   });

   it('sends dynamic and static email configurations', () => {
     component.abrirEmail(); component['emailDestinatario'].set('destino@example.com'); component['emailAsunto'].set('Reporte');
     component.seleccionarModo('dinamico'); component.enviarEmail(); expect(component['emailExito']()).toBe('Reporte enviado correctamente.');
     component.seleccionarModo('estatico'); component.abrirEmail(); component.enviarEmail(); expect(component['emailExito']()).toBe('Reporte enviado correctamente.');
   });

   it('disables the email submit while loading and reports success afterward', () => {
     const pending = new Subject<unknown>(); dynamicEmailResponse = pending.asObservable();
     component.seleccionarModo('dinamico'); component.abrirEmail(); component['emailDestinatario'].set('destino@example.com'); component['emailAsunto'].set('Reporte'); component.enviarEmail(); fixture.detectChanges();
     expect(component['procesando']()).toBe('email');
     expect(fixture.nativeElement.querySelector('form button[type="submit"]').disabled).toBe(true);
     pending.next({}); pending.complete();
     expect(component['emailExito']()).toBe('Reporte enviado correctamente.');
   });

   it('maps email errors 403, 422 and 503 without technical details', () => {
     for (const [status, message] of [[403, 'No tienes permiso para enviar reportes.'], [422, 'Revisa el destinatario o la configuración.'], [503, 'El servicio de correo no está disponible o no está configurado.']] as const) {
       dynamicEmailResponse = throwError(() => ({ status, detail: 'technical detail' }));
       component.seleccionarModo('dinamico'); component.abrirEmail(); component['emailDestinatario'].set('destino@example.com'); component['emailAsunto'].set('Reporte'); component.enviarEmail();
       expect(component['emailError']()).toBe(message);
     }
   });

   it('blocks messages longer than 1000 characters and does not use browser storage', () => {
     const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
     component.abrirEmail(); component['emailDestinatario'].set('destino@example.com'); component['emailAsunto'].set('Reporte'); component['emailMensaje'].set('x'.repeat(1001)); component.enviarEmail();
     expect(component['emailError']()).toBe('Revisa los campos requeridos del correo.');
     expect(storageSpy).not.toHaveBeenCalled();
   });
});
