import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SaasApiService } from '../services/saas-api.service';
import { SaasRestoresComponent } from './saas-restores.component';

describe('SaasRestoresComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  const empresa = { id: 7, codigo: 'CLINICA_A', slug: 'clinica-a', nombre: 'Clínica A', estado: 'ACTIVA', plan: 'PRO', estado_suscripcion: 'ACTIVA', database_name: 'tenant_a', estado_tenant: 'ACTIVA', version_schema: 'v1', fecha_provisionamiento: null };
  const backup = { id: 3, empresa_id: 7, tenant_database_id: 1, tipo: 'MANUAL', estado: 'COMPLETADO', nombre_archivo: null, formato: null, size_bytes: 1024, sha256: 'deadbeef', version_schema: 'v1', fecha_inicio: '2026-01-01T10:00:00', fecha_fin: '2026-01-01T10:05:00' };
  const validValidation = { backup_id: 3, empresa_id: 7, tenant_database_id: 1, estado: 'COMPLETADO', tipo: 'MANUAL', size_bytes: 1024, sha256: 'deadbeef', version_schema: 'v1', valido: true };
  const failedValidation = { ...validValidation, valido: false };
  const restoreRow = { id: 1, empresa_id: 7, tenant_database_id: 1, backup_id: 3, pre_restore_backup_id: 4242, estado: 'COMPLETADO', etapa: 'FINALIZADO', fecha_inicio: '2026-01-01T11:00:00', fecha_fin: '2026-01-01T11:10:00', mensaje_error: null, rollback_estado: null, rollback_mensaje: null };

  function makeApi(overrides: any = {}): any {
    return {
      empresas: vi.fn(() => of([empresa])),
      restores: vi.fn(() => of([])),
      backups: vi.fn(() => of([backup])),
      validarRestore: vi.fn(() => of(validValidation)),
      crearRestore: vi.fn(() => of({ id: 1, estado: 'PENDIENTE', etapa: null })),
      ...overrides,
    };
  }

  async function create(api: any): Promise<ComponentFixture<SaasRestoresComponent>> {
    await TestBed.configureTestingModule({ imports: [SaasRestoresComponent], providers: [{ provide: SaasApiService, useValue: api }] }).compileComponents();
    const fixture = TestBed.createComponent(SaasRestoresComponent);
    fixture.detectChanges();
    return fixture;
  }

  async function arrangeSelected(fixture: ComponentFixture<SaasRestoresComponent>): Promise<void> {
    await fixture.whenStable();
    fixture.componentInstance.selectEmpresa(7);
    await fixture.whenStable();
    fixture.componentInstance.selectBackup(3);
    fixture.detectChanges();
  }

  it('renders the restore history rows asynchronously', async () => {
    const stream = new Subject<any[]>();
    const api = makeApi({ restores: vi.fn(() => stream) });
    const fixture = await create(api);
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    stream.next([restoreRow]);
    stream.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.restores()).toHaveLength(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('exposes pre_restore_backup_id in the history DOM', async () => {
    const stream = new Subject<any[]>();
    const api = makeApi({ restores: vi.fn(() => stream) });
    const fixture = await create(api);
    stream.next([restoreRow]);
    stream.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('4242');
  });

  it('validates the selected backup calling validarRestore(3)', async () => {
    const validated = new Subject<any>();
    const api = makeApi({ validarRestore: vi.fn(() => validated) });
    const fixture = await create(api);
    await arrangeSelected(fixture);
    const button = fixture.nativeElement.querySelector('.validate') as HTMLButtonElement;
    button.click();
    expect(api.validarRestore).toHaveBeenCalledWith(3);
    validated.next(validValidation);
    validated.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.validation()?.valido).toBe(true);
  });

  it('rejects a failed validation and keeps the restore button disabled', async () => {
    const api = makeApi({ validarRestore: vi.fn(() => of(failedValidation)) });
    const fixture = await create(api);
    await arrangeSelected(fixture);
    fixture.componentInstance.validate();
    await fixture.whenStable();
    fixture.componentInstance.confirmText.set('CLINICA_A');
    fixture.detectChanges();
    expect(fixture.componentInstance.validationError()).toContain('no superó la validación');
    expect((fixture.nativeElement.querySelector('.restore') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.restore();
    expect(api.crearRestore).not.toHaveBeenCalled();
  });

  it('rejects a validation error and keeps the restore button disabled', async () => {
    const api = makeApi({ validarRestore: vi.fn(() => throwError(() => new Error('Traceback: secret'))) });
    const fixture = await create(api);
    await arrangeSelected(fixture);
    fixture.componentInstance.validate();
    await fixture.whenStable();
    fixture.componentInstance.confirmText.set('CLINICA_A');
    fixture.detectChanges();
    expect(fixture.componentInstance.validation()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Traceback');
    expect((fixture.nativeElement.querySelector('.restore') as HTMLButtonElement).disabled).toBe(true);
    expect(api.crearRestore).not.toHaveBeenCalled();
  });

  it('requires the exact empresa code to enable the restore button', async () => {
    const fixture = await create(makeApi());
    await arrangeSelected(fixture);
    fixture.componentInstance.validate();
    await fixture.whenStable();
    fixture.componentInstance.confirmText.set('WRONG');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.restore') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.confirmText.set('CLINICA_A');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.restore') as HTMLButtonElement).disabled).toBe(false);
  });

  it('prevents double restore and resets creating when the subject completes', async () => {
    const created = new Subject<any>();
    const api = makeApi({ crearRestore: vi.fn(() => created) });
    const fixture = await create(api);
    await arrangeSelected(fixture);
    fixture.componentInstance.validate();
    await fixture.whenStable();
    fixture.componentInstance.confirmText.set('CLINICA_A');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.restore') as HTMLButtonElement;
    button.click();
    button.click();
    expect(api.crearRestore).toHaveBeenCalledWith(3, 'CLINICA_A');
    expect(api.crearRestore).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.creating()).toBe(true);
    created.next({ id: 1, estado: 'PENDIENTE', etapa: null });
    created.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.creating()).toBe(false);
  });

  it('sets a sanitized error and clears loading when the history request fails', async () => {
    const api = makeApi({ restores: vi.fn(() => throwError(() => new Error('Exception: secret'))) });
    const fixture = await create(api);
    await fixture.whenStable();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las restauraciones. Intenta nuevamente.');
    expect(fixture.nativeElement.textContent).not.toContain('Exception');
  });

  it('sanitizes backend messages before rendering', async () => {
    const fixture = await create(makeApi());
    await fixture.whenStable();
    expect(fixture.componentInstance.sanitizeMessage('Traceback (most recent call last): password=hunter2')).toBe('La operación reportó un error.');
    expect(fixture.componentInstance.sanitizeMessage('connection to postgres://user:secret@db.internal/app failed')).toBe('La operación reportó un error.');
    expect(fixture.componentInstance.sanitizeMessage('Restore failed; tenant rolled back to the pre-restore state')).toBe('Restore failed; tenant rolled back to the pre-restore state');
    expect(fixture.componentInstance.sanitizeMessage(null)).toBe('—');
  });

  it('does not touch localStorage and never renders secret identifiers', async () => {
    const stream = new Subject<any[]>();
    const api = makeApi({ restores: vi.fn(() => stream) });
    const fixture = await create(api);
    stream.next([restoreRow]);
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
    expect(fixture.nativeElement.querySelector('.empresa-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.backup-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.validate')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.restore')).not.toBeNull();
  });
});
