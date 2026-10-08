import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SaasApiService } from '../services/saas-api.service';
import { SaasBackupsComponent } from './saas-backups.component';

describe('SaasBackupsComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function makeApi(overrides: any = {}): any {
    return {
      empresas: vi.fn(() => of([])),
      backups: vi.fn(() => of([])),
      crearBackup: vi.fn(() => of({})),
      ...overrides,
    };
  }

  async function create(api: any): Promise<ComponentFixture<SaasBackupsComponent>> {
    await TestBed.configureTestingModule({ imports: [SaasBackupsComponent], providers: [{ provide: SaasApiService, useValue: api }] }).compileComponents();
    const fixture = TestBed.createComponent(SaasBackupsComponent);
    fixture.detectChanges();
    return fixture;
  }

  const backupRow = {
    id: 1, empresa_id: 7, tenant_database_id: 1, tipo: 'MANUAL', estado: 'COMPLETADO',
    nombre_archivo: null, formato: null, size_bytes: 1024, sha256: 'abcdef0123456789abcdef',
    version_schema: 'v1', fecha_inicio: '2026-01-01T10:00:00', fecha_fin: '2026-01-01T10:05:00',
  };

  it('renders backup rows asynchronously and terminates loading', async () => {
    const stream = new Subject<any[]>();
    const api = makeApi({ backups: vi.fn(() => stream) });
    const fixture = await create(api);
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    stream.next([backupRow]);
    stream.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.backups()).toHaveLength(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('renders the empty state when there are no backups', async () => {
    const fixture = await create(makeApi());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No hay backups para mostrar.');
  });

  it('filters by empresa sending { empresa_id: 7 } and clears the filter', async () => {
    const api = makeApi();
    const fixture = await create(api);
    fixture.componentInstance.selectEmpresa(7);
    await fixture.whenStable();
    expect(api.backups).toHaveBeenCalledWith({ empresa_id: 7 });
    fixture.componentInstance.selectEmpresa('');
    await fixture.whenStable();
    expect(api.backups).toHaveBeenCalledWith();
  });

  it('creates a manual backup with only the empresa id and exposes no secret fields', async () => {
    const created = new Subject<any>();
    const api = makeApi({ crearBackup: vi.fn(() => created) });
    const fixture = await create(api);
    fixture.componentInstance.selectEmpresa(7);
    await fixture.whenStable();
    fixture.componentInstance.createManual();
    expect(api.crearBackup).toHaveBeenCalledWith(7);
    expect(api.crearBackup).toHaveBeenCalledTimes(1);
    const component = fixture.componentInstance as unknown as Record<string, unknown>;
    expect(component['database_name']).toBeUndefined();
    expect(component['storage_key']).toBeUndefined();
    expect(component['DATABASE_URL']).toBeUndefined();
    created.next({ id: 1 });
    created.complete();
    await fixture.whenStable();
  });

  it('prevents double manual submit and resets creating when the subject completes', async () => {
    const created = new Subject<any>();
    const api = makeApi({ crearBackup: vi.fn(() => created) });
    const fixture = await create(api);
    fixture.componentInstance.selectEmpresa(7);
    await fixture.whenStable();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.create-manual') as HTMLButtonElement;
    button.click();
    button.click();
    expect(api.crearBackup).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.creating()).toBe(true);
    created.next({ id: 1 });
    created.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.creating()).toBe(false);
  });

  it('renders MANUAL, AUTOMÁTICO and COMPLETADO type and state labels', async () => {
    const stream = new Subject<any[]>();
    const api = makeApi({ backups: vi.fn(() => stream) });
    const fixture = await create(api);
    stream.next([
      { ...backupRow, id: 1, tipo: 'MANUAL', estado: 'COMPLETADO' },
      { ...backupRow, id: 2, tipo: 'AUTOMATICO', estado: 'PENDIENTE' },
    ]);
    stream.complete();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('MANUAL');
    expect(text).toMatch(/AUTOM[ÁA]TICO/);
    expect(text).toContain('COMPLETADO');
  });

  it('formats sizes for null, bytes, KB and MB', async () => {
    const fixture = await create(makeApi());
    await fixture.whenStable();
    expect(fixture.componentInstance.formatSize(null)).toBe('—');
    expect(fixture.componentInstance.formatSize(512)).toBe('512 B');
    expect(fixture.componentInstance.formatSize(1024)).toBe('1.0 KB');
    expect(fixture.componentInstance.formatSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('sets a sanitized error and clears loading when the request fails', async () => {
    const api = makeApi({ backups: vi.fn(() => throwError(() => new Error('Traceback: secret detail'))) });
    const fixture = await create(api);
    await fixture.whenStable();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los backups. Intenta nuevamente.');
    expect(fixture.nativeElement.textContent).not.toContain('Traceback');
  });

  it('does not touch localStorage and never renders secret identifiers', async () => {
    const stream = new Subject<any[]>();
    const api = makeApi({ backups: vi.fn(() => stream) });
    const fixture = await create(api);
    stream.next([backupRow]);
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
    expect(fixture.nativeElement.querySelector('.create-manual')).not.toBeNull();
  });
});
