import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Backup, BackupEstado, BackupPolicy, BackupPolicyUpdate, BackupTipo, Bitacora, Empresa, EmpresaEstado, Plan, Provisionamiento, Restore, RestoreEstado, RestoreValidation, Suscripcion, SuscripcionEstado, Tenant } from '../models/saas.models';

@Injectable({ providedIn: 'root' })
export class SaasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/saas`;
  private collection<T>(url: string, params?: HttpParams): Observable<T[]> {
    return this.http.get<unknown>(url, params ? { params } : {}).pipe(map((payload) => {
      if (Array.isArray(payload)) return payload as T[];
      if (this.isRecord(payload) && Array.isArray(payload['items'])) return payload['items'] as T[];
      if (this.isRecord(payload) && Array.isArray(payload['data'])) return payload['data'] as T[];
      throw new Error('La respuesta de la colección SaaS no tiene un formato válido.');
    }));
  }

  private isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }

  empresas(): Observable<Empresa[]> { return this.collection<Empresa>(`${this.base}/empresas`); }
  empresa(id: number): Observable<Empresa> { return this.http.get<Empresa>(`${this.base}/empresas/${id}`); }
  planes(): Observable<Plan[]> { return this.collection<Plan>(`${this.base}/planes`); }
  suscripciones(): Observable<Suscripcion[]> { return this.collection<Suscripcion>(`${this.base}/suscripciones`); }
  tenants(): Observable<Tenant[]> { return this.collection<Tenant>(`${this.base}/tenants`); }
  provisionamientos(): Observable<Provisionamiento[]> { return this.collection<Provisionamiento>(`${this.base}/provisionamientos`); }
  bitacora(): Observable<Bitacora[]> { return this.collection<Bitacora>(`${this.base}/bitacora`); }
  cambiarEmpresaEstado(id: number, estado: EmpresaEstado): Observable<Empresa> { return this.http.patch<Empresa>(`${this.base}/empresas/${id}/estado`, { estado }); }
  cambiarSuscripcionEstado(id: number, estado: SuscripcionEstado): Observable<Suscripcion> { return this.http.patch<Suscripcion>(`${this.base}/suscripciones/${id}/estado`, { estado }); }

  backups(filters: { empresa_id?: number; estado?: BackupEstado; tipo?: BackupTipo } = {}): Observable<Backup[]> {
    return this.collection<Backup>(`${this.base}/backups`, this.filters(filters as Record<string, string | number | undefined>));
  }
  backup(id: number): Observable<Backup> { return this.http.get<Backup>(`${this.base}/backups/${id}`); }
  crearBackup(empresa_id: number): Observable<Backup> { return this.http.post<Backup>(`${this.base}/backups`, { empresa_id }); }
  backupPolicies(): Observable<BackupPolicy[]> { return this.collection<BackupPolicy>(`${this.base}/backup-policies`); }
  actualizarBackupPolicy(empresa_id: number, policy: BackupPolicyUpdate): Observable<BackupPolicy> { return this.http.put<BackupPolicy>(`${this.base}/backup-policies/${empresa_id}`, policy); }
  validarRestore(backup_id: number): Observable<RestoreValidation> { return this.http.post<RestoreValidation>(`${this.base}/restores/validate`, { backup_id }); }
  crearRestore(backup_id: number, confirmacion: string): Observable<Restore> { return this.http.post<Restore>(`${this.base}/restores`, { backup_id, confirmacion }); }
  restores(filters: { empresa_id?: number; estado?: RestoreEstado } = {}): Observable<Restore[]> {
    return this.collection<Restore>(`${this.base}/restores`, this.filters(filters as Record<string, string | number | undefined>));
  }

  private filters(values: Record<string, string | number | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
}
