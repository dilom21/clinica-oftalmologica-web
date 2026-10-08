import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Backup, Empresa, Restore, RestoreEstado, RestoreValidation } from '../models/saas.models';
import { SaasApiService } from '../services/saas-api.service';

@Component({
  selector: 'app-saas-restores',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page" [attr.aria-busy]="loading()">
      <div class="page-head">
        <div class="heading">
          <p class="eyebrow">PLATAFORMA SAAS</p>
          <h1>Restauraciones</h1>
          <p>Restauración controlada de una base de datos tenant desde un backup validado.</p>
        </div>
        <button class="refresh" type="button" (click)="load()" [disabled]="loading()">{{ loading() ? 'Actualizando…' : 'Actualizar' }}</button>
      </div>

      <div class="selector-grid">
        <label class="empresa-select">Empresa
          <select [value]="selectedEmpresa() ?? ''" (change)="selectEmpresa($any($event.target).value)">
            <option value="">Selecciona una empresa</option>
            <option *ngFor="let empresa of empresas()" [value]="empresa.id">{{ empresa.codigo }} · {{ empresa.nombre }}</option>
          </select>
        </label>
        <label class="backup-select">Backup completado
          <select [value]="selectedBackup()?.id ?? ''" [disabled]="selectedEmpresa() === null" (change)="selectBackup($any($event.target).value)">
            <option value="">Selecciona un backup</option>
            <option *ngFor="let backup of completedBackups()" [value]="backup.id">#{{ backup.id }} · {{ backup.tipo }} · {{ backup.version_schema ?? '—' }} | {{ backup.fecha_inicio }}</option>
          </select>
        </label>
        <button class="validate" type="button" (click)="validate()" [disabled]="!selectedBackup() || validating()">{{ validating() ? 'Validando…' : 'Validar backup' }}</button>
      </div>

      <div class="validation-panel" *ngIf="validation() as result">
        <p><strong>Resultado:</strong> {{ result.valido ? 'Backup válido' : 'Backup no válido' }}</p>
        <p>Estado: {{ result.estado }} · Tipo: {{ result.tipo }} · Versión schema: {{ result.version_schema ?? '—' }} · Tamaño: {{ result.size_bytes ?? '—' }}</p>
      </div>
      <p class="error" role="alert" aria-live="assertive" *ngIf="validationError()">{{ validationError() }}</p>

      <p class="maintenance-warning" role="alert">La restauración interrumpe el servicio de la empresa mientras el backend crea un respaldo PRE_RESTORE obligatorio y reemplaza la base de datos.</p>

      <div class="confirm">
        <label for="restore-confirm">Escribe el código exacto de la empresa ({{ selectedEmpresaCodigo() }}) para confirmar</label>
        <input id="restore-confirm" class="confirm-input" type="text" [value]="confirmText()" (input)="confirmText.set($any($event.target).value)">
        <button class="restore" type="button" (click)="restore()" [disabled]="!canRestore()">{{ creating() ? 'Restaurando…' : 'Restaurar backup' }}</button>
      </div>

      <p class="status" aria-live="polite" *ngIf="loading()">Cargando restauraciones…</p>
      <p class="error" role="alert" aria-live="assertive" *ngIf="error()">{{ error() }}</p>
      <p class="message" aria-live="polite" *ngIf="createMessage()">{{ createMessage() }}</p>
      <p class="error" role="alert" aria-live="assertive" *ngIf="createError()">{{ createError() }}</p>

      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Historial de restauraciones</caption>
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Backup</th>
              <th>PRE_RESTORE</th>
              <th>Estado</th>
              <th>Etapa</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let restore of restores()">
              <td>{{ restore.id }}</td>
              <td>{{ empresaLabel(restore.empresa_id) }}</td>
              <td>#{{ restore.backup_id }}</td>
              <td>{{ restore.pre_restore_backup_id ?? '—' }}</td>
              <td><span class="badge" [ngClass]="estadoClass(restore.estado)">{{ restore.estado }}</span></td>
              <td>{{ restore.etapa ?? '—' }}</td>
              <td>{{ restore.fecha_inicio }}</td>
              <td>{{ restore.fecha_fin ?? '—' }}</td>
              <td>
                <span>{{ sanitizeMessage(restore.mensaje_error) }}</span>
                <span class="rollback" *ngIf="restore.rollback_estado">Rollback: {{ restore.rollback_estado }} — {{ sanitizeMessage(restore.rollback_mensaje) }}</span>
              </td>
            </tr>
            <tr *ngIf="!loading() && restores().length === 0">
              <td colspan="9" class="empty">No hay restauraciones registradas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page { max-width: 1500px; margin: auto; }
    .page-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 20px; }
    .eyebrow { margin: 0 0 8px; color: #1683b6; text-transform: uppercase; letter-spacing: .1em; font-weight: 800; font-size: .72rem; }
    h1 { font-size: clamp(1.8rem, 4vw, 2.5rem); margin: 0; color: #102a43; }
    p { color: #64748b; }
    .refresh { border: 1px solid #b8d5e8; background: #fff; color: #1261a0; border-radius: 8px; padding: 9px 13px; font-weight: 700; cursor: pointer; }
    .refresh:disabled { opacity: .55; cursor: not-allowed; }
    .selector-grid { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 18px; }
    .selector-grid label { display: flex; flex-direction: column; gap: 4px; font-size: .78rem; color: #486581; font-weight: 700; }
    .selector-grid select { border: 1px solid #cbd8e6; border-radius: 8px; padding: 9px 10px; min-width: 240px; color: #102a43; background: #fff; }
    .validate { border: 1px solid #b8d5e8; background: #fff; color: #1261a0; border-radius: 8px; padding: 9px 13px; font-weight: 700; cursor: pointer; }
    .validate:disabled { opacity: .55; cursor: not-allowed; }
    .validation-panel { border: 1px solid #e1eaf2; background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
    .validation-panel p { margin: 2px 0; }
    .maintenance-warning { border: 1px solid #f0d9b5; background: #fff5e6; color: #96631c; border-radius: 12px; padding: 14px; margin: 0 0 16px; }
    .confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; background: #fff; border: 1px solid #e1eaf2; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .confirm label { color: #334e68; font-weight: 600; font-size: .86rem; flex: 1 1 320px; }
    .confirm-input { border: 1px solid #cbd8e6; border-radius: 8px; padding: 9px 10px; min-width: 220px; color: #102a43; }
    .restore { background: #b91c1c !important; border: 1px solid #b91c1c !important; color: #fff !important; border-radius: 8px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
    .restore:disabled { opacity: .5; cursor: not-allowed; }
    .table-wrap { background: #fff; border: 1px solid #e1eaf2; border-radius: 14px; overflow: auto; }
    table { width: 100%; min-width: 1100px; border-collapse: collapse; font-size: .84rem; }
    th, td { text-align: left; padding: 13px 14px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    th { background: #f7fafc; color: #486581; font-size: .72rem; text-transform: uppercase; white-space: nowrap; }
    td { color: #334e68; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: .72rem; font-weight: 700; border: 1px solid #d7e3ee; background: #eef4fa; color: #334e68; }
    .estado-completado, .estado-rollback_completado { background: #eef7ee; color: #2f6b34; border-color: #cfe6cf; }
    .estado-error, .estado-rollback_error { background: #fff1f2; color: #be123c; border-color: #f5c2c7; }
    .estado-en_proceso, .estado-rollback_en_proceso { background: #fff5e6; color: #96631c; border-color: #f0d9b5; }
    .rollback { display: block; margin-top: 4px; color: #96631c; font-size: .78rem; }
    .empty { text-align: center; padding: 40px; color: #64748b; }
    .status { color: #486581; }
    .message { color: #2f6b34; background: #eef7ee; padding: 10px 12px; border-radius: 8px; }
    .error { color: #be123c; background: #fff1f2; padding: 12px; border-radius: 8px; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    @media (max-width: 700px) {
      .page-head { flex-direction: column; }
      .refresh { width: 100%; }
      .selector-grid { flex-direction: column; align-items: stretch; }
      .selector-grid select { min-width: 0; width: 100%; }
      .validate { width: 100%; }
      .confirm { flex-direction: column; align-items: stretch; }
      .confirm-input { width: 100%; }
    }
  `],
})
export class SaasRestoresComponent implements OnInit {
  private readonly api = inject(SaasApiService);

  readonly empresas = signal<Empresa[]>([]);
  readonly selectedEmpresa = signal<number | null>(null);
  readonly completedBackups = signal<Backup[]>([]);
  readonly selectedBackup = signal<Backup | null>(null);
  readonly restores = signal<Restore[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly validating = signal(false);
  readonly validation = signal<RestoreValidation | null>(null);
  readonly validationError = signal('');
  readonly confirmText = signal('');
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly createMessage = signal('');

  readonly selectedEmpresaCodigo = computed(() => {
    const id = this.selectedEmpresa();
    if (id === null) return '';
    const empresa = this.empresas().find((item) => item.id === id);
    return empresa?.codigo ?? '';
  });

  readonly canRestore = computed(() =>
    this.validation()?.valido === true &&
    this.selectedBackup() !== null &&
    this.selectedEmpresaCodigo() !== '' &&
    this.confirmText().trim() === this.selectedEmpresaCodigo() &&
    !this.creating(),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.empresas().subscribe({ next: (rows) => this.empresas.set(rows), error: () => this.empresas.set([]) });
    const empresa = this.selectedEmpresa();
    const request = empresa === null ? this.api.restores() : this.api.restores({ empresa_id: empresa });
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (rows) => this.restores.set(rows),
      error: () => this.error.set('No se pudieron cargar las restauraciones. Intenta nuevamente.'),
    });
  }

  selectEmpresa(value: string | number | null): void {
    const empresa = this.normalize(value);
    this.selectedEmpresa.set(empresa);
    this.selectedBackup.set(null);
    this.validation.set(null);
    this.validationError.set('');
    this.confirmText.set('');
    this.createMessage.set('');
    this.createError.set('');
    if (empresa === null) {
      this.completedBackups.set([]);
      return;
    }
    this.api.backups({ empresa_id: empresa, estado: 'COMPLETADO' }).subscribe({
      next: (rows) => this.completedBackups.set(rows),
      error: () => this.completedBackups.set([]),
    });
  }

  selectBackup(value: string | number | null): void {
    const id = this.normalize(value);
    this.selectedBackup.set(id === null ? null : (this.completedBackups().find((item) => item.id === id) ?? null));
    this.validation.set(null);
    this.validationError.set('');
    this.createMessage.set('');
    this.createError.set('');
    this.confirmText.set('');
  }

  validate(): void {
    const backup = this.selectedBackup();
    if (!backup || this.validating()) return;
    this.validating.set(true);
    this.validationError.set('');
    this.api.validarRestore(backup.id).pipe(finalize(() => this.validating.set(false))).subscribe({
      next: (result) => {
        this.validation.set(result);
        if (!result.valido) this.validationError.set('El backup no superó la validación y no puede restaurarse.');
      },
      error: () => {
        this.validation.set(null);
        this.validationError.set('No se pudo validar el backup. Intenta nuevamente.');
      },
    });
  }

  restore(): void {
    const backup = this.selectedBackup();
    if (!backup || !this.canRestore()) return;
    this.creating.set(true);
    this.createError.set('');
    this.createMessage.set('');
    this.api.crearRestore(backup.id, this.confirmText().trim()).pipe(finalize(() => this.creating.set(false))).subscribe({
      next: (restore) => {
        const etapa = restore.etapa ? ` · etapa: ${restore.etapa}` : '';
        this.createMessage.set(`Restauración solicitada (estado: ${restore.estado}${etapa}). Actualiza para ver el avance.`);
        // Prevent a second destructive submit while the reserved restore is still running.
        this.validation.set(null);
        this.selectedBackup.set(null);
        this.validationError.set('');
        this.confirmText.set('');
        this.load();
      },
      error: () => this.createError.set('No se pudo iniciar la restauración. Intenta nuevamente.'),
    });
  }

  empresaLabel(id: number): string {
    const empresa = this.empresas().find((item) => item.id === id);
    if (!empresa) return `#${id}`;
    return empresa.codigo || empresa.nombre || `#${id}`;
  }

  sanitizeMessage(value: string | null): string {
    if (!value) return '—';
    const collapsed = value.replace(/[\r\n]+/g, ' ').trim();
    const suspicious = /(?:Traceback|Exception|Stack trace|:\/\/|password|passwd|secret|token|api[_-]?key|database_name|storage_key|[A-Za-z]:\\|\/(?:var|home|tmp|usr|etc|app)\/)/i.test(collapsed);
    if (suspicious || !/^(?:Backup|Restore|Pre-restore|Rollback|Tenant|Company|Manual|Automatic)\b/i.test(collapsed)) {
      return 'La operación reportó un error.';
    }
    return collapsed.slice(0, 180);
  }

  estadoClass(estado: RestoreEstado): string {
    return `estado-${estado.toLowerCase()}`;
  }

  private normalize(value: string | number | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
