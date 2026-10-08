import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Backup, BackupEstado, BackupTipo, Empresa } from '../models/saas.models';
import { SaasApiService } from '../services/saas-api.service';

@Component({
  selector: 'app-saas-backups',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page" [attr.aria-busy]="loading()">
      <div class="page-head">
        <div class="heading">
          <p class="eyebrow">PLATAFORMA SAAS</p>
          <h1>Backups</h1>
          <p>Historial y solicitud de respaldos de las bases de datos tenant.</p>
        </div>
        <div class="controls">
          <button class="refresh" type="button" (click)="load()" [disabled]="loading()">{{ loading() ? 'Actualizando…' : 'Actualizar' }}</button>
          <label class="empresa-select">Empresa
            <select [value]="selectedEmpresa() ?? ''" (change)="selectEmpresa($any($event.target).value)">
              <option value="">Todas las empresas</option>
              <option *ngFor="let empresa of empresas()" [value]="empresa.id">{{ empresa.nombre }}</option>
            </select>
          </label>
          <button class="create-manual" type="button" (click)="createManual()" [disabled]="!selectedEmpresa() || creating()">{{ creating() ? 'Solicitando…' : 'Crear backup manual' }}</button>
        </div>
      </div>
      <p class="status" aria-live="polite" *ngIf="loading()">Cargando backups…</p>
      <p class="error" role="alert" aria-live="assertive" *ngIf="error()">{{ error() }}</p>
      <p class="message" aria-live="polite" *ngIf="createMessage()">{{ createMessage() }}</p>
      <p class="error" role="alert" aria-live="assertive" *ngIf="createError()">{{ createError() }}</p>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Backups</caption>
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Tamaño</th>
              <th>Versión schema</th>
              <th>SHA-256</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let backup of backups()">
              <td>{{ backup.id }}</td>
              <td>{{ empresaLabel(backup.empresa_id) }}</td>
              <td><span class="badge" [ngClass]="tipoClass(backup.tipo)">{{ tipoLabels[backup.tipo] }}</span></td>
              <td><span class="badge" [ngClass]="estadoClass(backup.estado)">{{ backup.estado }}</span></td>
              <td>{{ backup.fecha_inicio }}</td>
              <td>{{ formatSize(backup.size_bytes) }}</td>
              <td>{{ backup.version_schema ?? '—' }}</td>
              <td><span [title]="backup.sha256 ?? ''">{{ shortSha(backup.sha256) }}</span></td>
            </tr>
            <tr *ngIf="!loading() && backups().length === 0">
              <td colspan="8" class="empty">No hay backups para mostrar.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page { max-width: 1500px; margin: auto; }
    .page-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 24px; }
    .eyebrow { margin: 0 0 8px; color: #1683b6; text-transform: uppercase; letter-spacing: .1em; font-weight: 800; font-size: .72rem; }
    h1 { font-size: clamp(1.8rem, 4vw, 2.5rem); margin: 0; color: #102a43; }
    p { color: #64748b; }
    .controls { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
    .controls button { border: 1px solid #b8d5e8; background: #fff; color: #1261a0; border-radius: 8px; padding: 9px 13px; font-weight: 700; cursor: pointer; }
    .controls button:disabled { opacity: .55; cursor: not-allowed; }
    .create-manual { background: #1261a0 !important; color: #fff !important; border-color: #1261a0 !important; }
    .empresa-select { display: flex; flex-direction: column; gap: 4px; font-size: .78rem; color: #486581; font-weight: 700; }
    .empresa-select select { border: 1px solid #cbd8e6; border-radius: 8px; padding: 9px 10px; min-width: 220px; color: #102a43; background: #fff; }
    .table-wrap { background: #fff; border: 1px solid #e1eaf2; border-radius: 14px; overflow: auto; }
    table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: .84rem; }
    th, td { text-align: left; padding: 13px 14px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    th { background: #f7fafc; color: #486581; font-size: .72rem; text-transform: uppercase; white-space: nowrap; }
    td { color: #334e68; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: .72rem; font-weight: 700; border: 1px solid #d7e3ee; background: #eef4fa; color: #334e68; }
    .tipo-manual { background: #e8f4ff; color: #1261a0; border-color: #b8d5e8; }
    .tipo-automatico { background: #eef7ee; color: #2f6b34; border-color: #cfe6cf; }
    .tipo-pre_restore { background: #fff5e6; color: #96631c; border-color: #f0d9b5; }
    .estado-completado { background: #eef7ee; color: #2f6b34; border-color: #cfe6cf; }
    .estado-error { background: #fff1f2; color: #be123c; border-color: #f5c2c7; }
    .estado-en_proceso { background: #fff5e6; color: #96631c; border-color: #f0d9b5; }
    .empty { text-align: center; padding: 40px; color: #64748b; }
    .status { color: #486581; }
    .message { color: #2f6b34; background: #eef7ee; padding: 10px 12px; border-radius: 8px; }
    .error { color: #be123c; background: #fff1f2; padding: 12px; border-radius: 8px; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    @media (max-width: 700px) {
      .page-head { flex-direction: column; }
      .controls { width: 100%; }
      .empresa-select select { min-width: 0; width: 100%; }
    }
  `],
})
export class SaasBackupsComponent implements OnInit {
  private readonly api = inject(SaasApiService);

  readonly empresas = signal<Empresa[]>([]);
  readonly selectedEmpresa = signal<number | null>(null);
  readonly backups = signal<Backup[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly createMessage = signal('');
  readonly tipoLabels: Record<BackupTipo, string> = { MANUAL: 'MANUAL', AUTOMATICO: 'AUTOMÁTICO', PRE_RESTORE: 'PRE_RESTORE' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.empresas().subscribe({ next: (rows) => this.empresas.set(rows), error: () => this.empresas.set([]) });
    this.loadBackups();
  }

  selectEmpresa(value: string | number | null): void {
    this.selectedEmpresa.set(this.normalize(value));
    this.createError.set('');
    this.createMessage.set('');
    this.loadBackups();
  }

  createManual(): void {
    const empresa = this.selectedEmpresa();
    if (this.creating() || empresa === null) return;
    this.creating.set(true);
    this.createError.set('');
    this.createMessage.set('');
    this.api.crearBackup(empresa).pipe(finalize(() => this.creating.set(false))).subscribe({
      next: () => {
        this.createMessage.set('Backup manual solicitado. Actualiza para ver su estado.');
        this.loadBackups();
      },
      error: () => this.createError.set('No se pudo crear el backup. Intenta nuevamente.'),
    });
  }

  formatSize(bytes: number | null): string {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return `${value.toFixed(1)} ${units[index]}`;
  }

  empresaLabel(id: number): string {
    const empresa = this.empresas().find((item) => item.id === id);
    if (!empresa) return `#${id}`;
    return empresa.nombre || empresa.codigo || `#${id}`;
  }

  shortSha(value: string | null): string {
    if (!value) return '—';
    return value.length > 16 ? `${value.slice(0, 16)}…` : value;
  }

  tipoClass(tipo: BackupTipo): string {
    return `tipo-${tipo.toLowerCase()}`;
  }

  estadoClass(estado: BackupEstado): string {
    return `estado-${estado.toLowerCase()}`;
  }

  private loadBackups(): void {
    this.loading.set(true);
    this.error.set('');
    const empresa = this.selectedEmpresa();
    const request = empresa === null ? this.api.backups() : this.api.backups({ empresa_id: empresa });
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (rows) => this.backups.set(rows),
      error: () => this.error.set('No se pudieron cargar los backups. Intenta nuevamente.'),
    });
  }

  private normalize(value: string | number | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
