import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { BackupPolicy, BackupPolicyFrecuencia, BackupPolicyUpdate } from '../models/saas.models';
import { SaasApiService } from '../services/saas-api.service';

@Component({
  selector: 'app-saas-backup-policies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page" [attr.aria-busy]="loading()">
      <div class="page-head">
        <div class="heading">
          <p class="eyebrow">PLATAFORMA SAAS</p>
          <h1>Políticas automáticas</h1>
          <p>Configuración de respaldos automáticos por empresa.</p>
        </div>
        <button class="refresh" type="button" (click)="load()" [disabled]="loading()">{{ loading() ? 'Actualizando…' : 'Actualizar' }}</button>
      </div>
      <p class="scheduler-note" role="note">Guardar una política no despliega el scheduler de producción. La automatización solo se ejecuta si un orquestador externo está operativo. <strong>Scheduler externo: sin evidencia en esta consola.</strong></p>
      <p class="status" aria-live="polite" *ngIf="loading()">Cargando políticas…</p>
      <p class="error" role="alert" aria-live="assertive" *ngIf="error()">{{ error() }}</p>
      <p class="message" aria-live="polite" *ngIf="saveMessage()">{{ saveMessage() }}</p>
      <p class="error" role="alert" aria-live="assertive" *ngIf="formError()">{{ formError() }}</p>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">Políticas de backup automático</caption>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Estado empresa</th>
              <th>Política</th>
              <th>Habilitado</th>
              <th>Frecuencia</th>
              <th>Hora local</th>
              <th>Zona horaria</th>
              <th>Retención</th>
              <th>Último backup automático</th>
              <th>Próximo backup</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let policy of policies()">
              <td>{{ policy.empresa_codigo }}</td>
              <td>{{ policy.estado_empresa }}</td>
              <td><span class="badge" [ngClass]="policy.configurada ? 'on' : 'off'">{{ policy.configurada ? 'Política configurada' : 'Sin política' }}</span></td>
              <td><span class="badge" [ngClass]="policy.habilitado ? 'on' : 'off'">{{ policy.habilitado ? 'Habilitado' : 'Deshabilitado' }}</span></td>
              <td>{{ policy.frecuencia ?? '—' }}</td>
              <td>{{ policy.hora_local ?? '—' }}</td>
              <td>{{ policy.timezone ?? '—' }}</td>
              <td>{{ policy.retencion_cantidad ?? '—' }}</td>
              <td>{{ policy.ultimo_backup_automatico ?? '—' }}</td>
              <td>{{ policy.proximo_backup ?? '—' }}</td>
              <td><button class="edit-policy" type="button" (click)="openEditor(policy)">Editar</button></td>
            </tr>
            <tr *ngIf="!loading() && policies().length === 0">
              <td colspan="11" class="empty">No hay políticas configuradas.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="modal-backdrop" *ngIf="editing()" (click)="closeEditor()">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="policy-title" (click)="$event.stopPropagation()">
          <button class="close" type="button" aria-label="Cerrar" (click)="closeEditor()">×</button>
          <h2 id="policy-title">Política de backup automático</h2>
          <p class="modal-company">{{ editing()?.empresa_codigo }} · {{ editing()?.empresa_nombre ?? '—' }}</p>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label class="checkbox" for="habilitado"><input id="habilitado" #firstField type="checkbox" formControlName="habilitado"> Habilitar backup automático</label>
            <label for="frecuencia">Frecuencia
              <select id="frecuencia" formControlName="frecuencia">
                <option value="">Selecciona una frecuencia</option>
                <option *ngFor="let frecuencia of frecuencias" [value]="frecuencia">{{ frecuencia }}</option>
              </select>
            </label>
            <label for="hora_local">Hora local
              <input id="hora_local" type="time" formControlName="hora_local">
            </label>
            <label for="timezone">Zona horaria
              <input id="timezone" type="text" maxlength="64" formControlName="timezone">
            </label>
            <label for="retencion_cantidad">Retención (1–365)
              <input id="retencion_cantidad" type="number" min="1" max="365" formControlName="retencion_cantidad">
            </label>
            <p class="field-help" *ngIf="retentionInvalid()">La retención debe estar entre 1 y 365 respaldos.</p>
            <p class="error" role="alert" *ngIf="formError()">{{ formError() }}</p>
            <div class="modal-actions">
              <button type="button" (click)="closeEditor()">Cancelar</button>
              <button class="primary" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Guardando…' : 'Guardar política' }}</button>
            </div>
          </form>
        </section>
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
    .scheduler-note { border: 1px solid #b9def1; background: #f0f9ff; color: #35627c; border-radius: 12px; padding: 14px; margin: 0 0 20px; }
    .scheduler-note strong { display: block; color: #1261a0; margin-top: 4px; }
    .table-wrap { background: #fff; border: 1px solid #e1eaf2; border-radius: 14px; overflow: auto; }
    table { width: 100%; min-width: 1200px; border-collapse: collapse; font-size: .84rem; }
    th, td { text-align: left; padding: 13px 14px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    th { background: #f7fafc; color: #486581; font-size: .72rem; text-transform: uppercase; white-space: nowrap; }
    td { color: #334e68; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: .72rem; font-weight: 700; border: 1px solid #d7e3ee; background: #eef4fa; color: #334e68; }
    .badge.on { background: #eef7ee; color: #2f6b34; border-color: #cfe6cf; }
    .badge.off { background: #f4f6f8; color: #64748b; border-color: #e1eaf2; }
    .edit-policy { border: 1px solid #b8d5e8; background: #fff; color: #1261a0; border-radius: 8px; padding: 7px 11px; font-weight: 700; cursor: pointer; }
    .empty { text-align: center; padding: 40px; color: #64748b; }
    .status { color: #486581; }
    .message { color: #2f6b34; background: #eef7ee; padding: 10px 12px; border-radius: 8px; }
    .error { color: #be123c; background: #fff1f2; padding: 12px; border-radius: 8px; }
    .field-help { color: #b45309; font-size: .8rem; margin: 4px 0 0; }
    .modal-backdrop { position: fixed; inset: 0; background: #102a4366; display: grid; place-items: center; padding: 18px; z-index: 20; }
    .modal { position: relative; width: min(100%, 560px); max-height: 90vh; overflow: auto; background: #fff; border-radius: 14px; padding: 28px; box-shadow: 0 20px 60px #102a4350; }
    .modal h2 { color: #102a43; margin-top: 0; }
    .modal-company { color: #486581; font-size: .86rem; }
    .close { position: absolute; right: 14px; top: 10px; background: transparent; border: 0; font-size: 1.7rem; color: #486581; cursor: pointer; }
    form { display: grid; gap: 14px; margin-top: 12px; }
    form label { display: flex; flex-direction: column; gap: 5px; color: #334e68; font-weight: 600; font-size: .88rem; }
    form input, form select { border: 1px solid #cbd8e6; border-radius: 8px; padding: 9px 10px; color: #102a43; background: #fff; font-size: .9rem; }
    .checkbox { flex-direction: row !important; align-items: center; gap: 8px !important; }
    .checkbox input { width: auto; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
    .modal-actions button { border: 1px solid #b8d5e8; background: #fff; color: #1261a0; border-radius: 8px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
    .modal-actions .primary { background: #1261a0 !important; border-color: #1261a0 !important; color: #fff !important; }
    .modal-actions .primary:disabled { opacity: .55; cursor: not-allowed; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    @media (max-width: 700px) { .page-head { flex-direction: column; } .refresh { width: 100%; } }
  `],
})
export class SaasBackupPoliciesComponent implements OnInit, AfterViewChecked {
  private readonly api = inject(SaasApiService);

  @ViewChild('firstField') private firstField?: ElementRef<HTMLElement>;
  private focusEditor = false;

  readonly frecuencias: readonly BackupPolicyFrecuencia[] = ['DIARIA', 'SEMANAL', 'MENSUAL'];
  readonly policies = signal<BackupPolicy[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly editing = signal<BackupPolicy | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly saveMessage = signal('');
  readonly form = new FormGroup({
    habilitado: new FormControl<boolean>(true, { nonNullable: true }),
    frecuencia: new FormControl<BackupPolicyFrecuencia | ''>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(DIARIA|SEMANAL|MENSUAL)$/)],
    }),
    hora_local: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    timezone: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64)] }),
    retencion_cantidad: new FormControl<number>(14, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(365)] }),
  });

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewChecked(): void {
    if (this.focusEditor && this.firstField) {
      this.focusEditor = false;
      this.firstField.nativeElement.focus();
    }
  }

  @HostListener('document:keydown.escape') handleEscape(): void {
    if (this.editing()) this.closeEditor();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.backupPolicies().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (rows) => this.policies.set(rows),
      error: () => this.error.set('No se pudieron cargar las políticas de backup. Intenta nuevamente.'),
    });
  }

  openEditor(policy: BackupPolicy): void {
    this.editing.set(policy);
    this.formError.set('');
    this.saveMessage.set('');
    this.form.reset({
      habilitado: policy.configurada ? Boolean(policy.habilitado) : true,
      frecuencia: this.isFrecuencia(policy.frecuencia) ? policy.frecuencia : 'DIARIA',
      hora_local: policy.configurada ? this.toTimeInput(policy.hora_local) : '03:00',
      timezone: policy.configurada ? (policy.timezone ?? 'America/La_Paz') : 'America/La_Paz',
      retencion_cantidad: policy.configurada ? (policy.retencion_cantidad ?? 14) : 14,
    });
    this.focusEditor = true;
  }

  closeEditor(): void {
    this.editing.set(null);
    this.formError.set('');
  }

  save(): void {
    const policy = this.editing();
    if (!policy || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set('');
    this.saveMessage.set('');
    const payload: BackupPolicyUpdate = {
      habilitado: this.form.controls.habilitado.value,
      frecuencia: this.form.controls.frecuencia.value as BackupPolicyFrecuencia,
      hora_local: this.normalizeTime(this.form.controls.hora_local.value),
      timezone: this.form.controls.timezone.value.trim(),
      retencion_cantidad: this.form.controls.retencion_cantidad.value,
    };
    this.api.actualizarBackupPolicy(policy.empresa_id, payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.editing.set(null);
        this.saveMessage.set('Política guardada. El scheduler de producción no se despliega desde aquí.');
        this.load();
      },
      error: () => this.formError.set('No se pudo guardar la política. Intenta nuevamente.'),
    });
  }

  normalizeTime(value: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    const parts = trimmed.split(':');
    const hours = (parts[0] || '00').padStart(2, '0');
    const minutes = (parts[1] || '00').padStart(2, '0');
    const seconds = (parts[2] || '00').padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  retentionInvalid(): boolean {
    const control = this.form.controls.retencion_cantidad;
    return control.invalid && (control.dirty || control.touched);
  }

  private isFrecuencia(value: string | null): value is BackupPolicyFrecuencia {
    return value === 'DIARIA' || value === 'SEMANAL' || value === 'MENSUAL';
  }

  private toTimeInput(value: string | null): string {
    if (!value) return '03:00';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }
}
