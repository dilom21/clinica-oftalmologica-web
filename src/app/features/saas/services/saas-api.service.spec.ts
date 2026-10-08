import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SaasApiService } from './saas-api.service';

describe('SaasApiService collection contracts', () => {
  let service: SaasApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SaasApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('returns the six real direct-array collection responses unchanged', () => {
    const cases = [
      ['empresas', Array.from({ length: 7 }, (_, id) => ({ id, estado: 'ACTIVA' }))],
      ['planes', Array.from({ length: 3 }, (_, id) => ({ id, precio_mensual: '99.00', estado: true }))],
      ['suscripciones', Array.from({ length: 7 }, (_, id) => ({ id, estado: 'ACTIVA' }))],
      ['tenants', Array.from({ length: 7 }, (_, id) => ({ empresa: id, estado: 'ACTIVA' }))],
      ['provisionamientos', Array.from({ length: 7 }, (_, id) => ({ id, estado: 'COMPLETADO' }))],
      ['bitacora', Array.from({ length: 7 }, (_, id) => ({ id, resultado: 'OK' }))],
    ] as const;
    const methods = {
      empresas: () => service.empresas(), planes: () => service.planes(), suscripciones: () => service.suscripciones(),
      tenants: () => service.tenants(), provisionamientos: () => service.provisionamientos(), bitacora: () => service.bitacora(),
    };

    for (const [kind, expected] of cases) {
      let actual: unknown;
      (methods[kind] as () => Observable<unknown[]>)().subscribe((rows) => actual = rows);
      http.expectOne(`${environment.apiUrl}/saas/${kind}`).flush(expected);
      expect(actual).toBe(expected);
    }
  });

  it('accepts only explicit items/data array envelopes as compatibility forms', () => {
    let actual: unknown;
    service.planes().subscribe((rows) => actual = rows);
    http.expectOne(`${environment.apiUrl}/saas/planes`).flush({ items: [{ estado: true }] });
    expect(actual).toEqual([{ estado: true }]);

    service.planes().subscribe((rows) => actual = rows);
    http.expectOne(`${environment.apiUrl}/saas/planes`).flush({ data: [{ estado: true }] });
    expect(actual).toEqual([{ estado: true }]);
  });

  it('fails visibly for an invalid collection shape instead of returning an empty array', () => {
    let error: Error | undefined;
    service.bitacora().subscribe({ error: (value) => error = value });
    http.expectOne(`${environment.apiUrl}/saas/bitacora`).flush({ records: [] });
    expect(error?.message).toBe('La respuesta de la colección SaaS no tiene un formato válido.');
  });

  it('sends exactly the confirmed { estado } payload for companies and subscriptions', () => {
    service.cambiarEmpresaEstado(7, 'SUSPENDIDA').subscribe();
    const company = http.expectOne(`${environment.apiUrl}/saas/empresas/7/estado`);
    expect(company.request.method).toBe('PATCH');
    expect(company.request.body).toEqual({ estado: 'SUSPENDIDA' });
    company.flush({});

    service.cambiarSuscripcionEstado(8, 'CANCELADA').subscribe();
    const subscription = http.expectOne(`${environment.apiUrl}/saas/suscripciones/8/estado`);
    expect(subscription.request.method).toBe('PATCH');
    expect(subscription.request.body).toEqual({ estado: 'CANCELADA' });
  });

  it('queries backups and restores only with the real filter params', () => {
    let backups: unknown;
    service.backups({ empresa_id: 7, estado: 'COMPLETADO', tipo: 'MANUAL' }).subscribe((rows) => backups = rows);
    const backupRequest = http.expectOne((request) => request.url === `${environment.apiUrl}/saas/backups`);
    expect(backupRequest.request.method).toBe('GET');
    expect(backupRequest.request.params.get('empresa_id')).toBe('7');
    expect(backupRequest.request.params.get('estado')).toBe('COMPLETADO');
    expect(backupRequest.request.params.get('tipo')).toBe('MANUAL');
    backupRequest.flush([]);
    expect(backups).toEqual([]);

    service.restores({ empresa_id: 7, estado: 'COMPLETADO' }).subscribe();
    const restoreRequest = http.expectOne((request) => request.url === `${environment.apiUrl}/saas/restores`);
    expect(restoreRequest.request.params.get('empresa_id')).toBe('7');
    expect(restoreRequest.request.params.get('estado')).toBe('COMPLETADO');
    restoreRequest.flush([]);

    service.backups().subscribe();
    const unfiltered = http.expectOne((request) => request.url === `${environment.apiUrl}/saas/backups`);
    expect(unfiltered.request.params.keys()).toHaveLength(0);
    unfiltered.flush([]);
  });

  it('creates a manual backup sending exactly { empresa_id }', () => {
    service.crearBackup(7).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/saas/backups`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ empresa_id: 7 });
    request.flush({ id: 1, empresa_id: 7, estado: 'COMPLETADO', tipo: 'MANUAL' });
  });

  it('sends exactly the confirmed policy payload on PUT', () => {
    const payload = { habilitado: true, frecuencia: 'DIARIA', hora_local: '03:30:00', timezone: 'America/La_Paz', retencion_cantidad: 14 } as const;
    service.actualizarBackupPolicy(7, payload).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/saas/backup-policies/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({ empresa_id: 7, configurada: true });
  });

  it('validates with { backup_id } and creates a restore with { backup_id, confirmacion }', () => {
    service.validarRestore(3).subscribe();
    const validate = http.expectOne(`${environment.apiUrl}/saas/restores/validate`);
    expect(validate.request.method).toBe('POST');
    expect(validate.request.body).toEqual({ backup_id: 3 });
    validate.flush({ valido: true });

    service.crearRestore(3, 'CLINICA_A').subscribe();
    const create = http.expectOne(`${environment.apiUrl}/saas/restores`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ backup_id: 3, confirmacion: 'CLINICA_A' });
    create.flush({ id: 1 });
  });
});
