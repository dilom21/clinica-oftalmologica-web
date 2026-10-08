import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BackupPolicy } from '../models/saas.models';
import { SaasApiService } from '../services/saas-api.service';
import { SaasBackupPoliciesComponent } from './saas-backup-policies.component';

describe('SaasBackupPoliciesComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function makeApi(overrides: any = {}): any {
    return {
      backupPolicies: vi.fn(() => of([])),
      actualizarBackupPolicy: vi.fn(() => of({})),
      crearBackup: vi.fn(() => of({})),
      ...overrides,
    };
  }

  async function create(api: any): Promise<ComponentFixture<SaasBackupPoliciesComponent>> {
    await TestBed.configureTestingModule({ imports: [SaasBackupPoliciesComponent], providers: [{ provide: SaasApiService, useValue: api }] }).compileComponents();
    const fixture = TestBed.createComponent(SaasBackupPoliciesComponent);
    fixture.detectChanges();
    return fixture;
  }

  const policy: BackupPolicy = {
    empresa_id: 7, empresa_codigo: 'CLINICA_A', empresa_nombre: 'Clínica A', estado_empresa: 'ACTIVA',
    configurada: true, habilitado: true, frecuencia: 'SEMANAL', hora_local: '04:15:00',
    timezone: 'America/La_Paz', retencion_cantidad: 30, ultimo_backup_automatico: '2026-01-01T04:15:00',
    proximo_backup: '2026-01-08T04:15:00', fecha_actualizacion: '2026-01-01T00:00:00',
  };

  it('renders policy rows asynchronously and terminates loading', async () => {
    const stream = new Subject<BackupPolicy[]>();
    const api = makeApi({ backupPolicies: vi.fn(() => stream) });
    const fixture = await create(api);
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    stream.next([policy]);
    stream.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.policies()).toHaveLength(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Política configurada');
  });

  it('saves the policy with the normalized HH:MM:SS time and correct payload', async () => {
    const saved = new Subject<BackupPolicy>();
    const api = makeApi({ actualizarBackupPolicy: vi.fn(() => saved) });
    const fixture = await create(api);
    fixture.componentInstance.openEditor(policy);
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toEqual(policy);
    fixture.componentInstance.form.patchValue({
      habilitado: true, frecuencia: 'SEMANAL', hora_local: '04:15', timezone: 'America/La_Paz', retencion_cantidad: 30,
    });
    fixture.componentInstance.save();
    expect(api.actualizarBackupPolicy).toHaveBeenCalledWith(7, {
      habilitado: true, frecuencia: 'SEMANAL', hora_local: '04:15:00', timezone: 'America/La_Paz', retencion_cantidad: 30,
    });
    expect(fixture.componentInstance.saving()).toBe(true);
    saved.next(policy);
    saved.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.editing()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Política guardada.');
  });

  it('normalizes a time value from HH:MM to HH:MM:SS', async () => {
    const fixture = await create(makeApi());
    await fixture.whenStable();
    expect(fixture.componentInstance.normalizeTime('03:05')).toBe('03:05:00');
    expect(fixture.componentInstance.normalizeTime('03:05:09')).toBe('03:05:09');
  });

  it.each([0, 400])('keeps the form invalid and does not call the API for retention %s', async (value) => {
    const api = makeApi();
    const fixture = await create(api);
    fixture.componentInstance.openEditor(policy);
    fixture.componentInstance.form.patchValue({ retencion_cantidad: value });
    expect(fixture.componentInstance.form.invalid).toBe(true);
    fixture.componentInstance.save();
    expect(api.actualizarBackupPolicy).not.toHaveBeenCalled();
  });

  it('marks the form invalid for a frequency outside DIARIA/SEMANAL/MENSUAL', async () => {
    const api = makeApi();
    const fixture = await create(api);
    fixture.componentInstance.openEditor(policy);
    fixture.componentInstance.form.patchValue({ frecuencia: '' as never });
    expect(fixture.componentInstance.form.invalid).toBe(true);
    fixture.componentInstance.save();
    expect(api.actualizarBackupPolicy).not.toHaveBeenCalled();
  });

  it('distinguishes the policy from a real scheduler and never executes a backup', async () => {
    const stream = new Subject<BackupPolicy[]>();
    const api = makeApi({ backupPolicies: vi.fn(() => stream) });
    const fixture = await create(api);
    stream.next([policy]);
    stream.complete();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Scheduler externo');
    expect(text).toContain('Política configurada');
    expect(text).not.toContain('Automatización activa en producción');
    expect(api.crearBackup).not.toHaveBeenCalled();
  });

  it('sets a sanitized error and clears loading when policies fail to load', async () => {
    const api = makeApi({ backupPolicies: vi.fn(() => throwError(() => new Error('Exception: secret'))) });
    const fixture = await create(api);
    await fixture.whenStable();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las políticas de backup. Intenta nuevamente.');
    expect(fixture.nativeElement.textContent).not.toContain('Exception');
  });

  it('does not touch localStorage and never renders secret identifiers', async () => {
    const stream = new Subject<BackupPolicy[]>();
    const api = makeApi({ backupPolicies: vi.fn(() => stream) });
    const fixture = await create(api);
    stream.next([policy]);
    stream.complete();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('database_name');
    expect(text).not.toContain('storage_key');
    expect(text).not.toContain('DATABASE_URL');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('saas_access_token')).toBeNull();
  });

  it('renders the scroll container and header controls', async () => {
    const fixture = await create(makeApi());
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.table-wrap')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.refresh')).not.toBeNull();
  });
});
