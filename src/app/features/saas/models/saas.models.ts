export interface SaasLoginRequest { correo: string; password: string; }
export interface SaasLoginResponse { access_token: string; token_type: string; saas_usuario_id: number; }

export type EmpresaEstado = 'ACTIVA' | 'SUSPENDIDA' | 'PENDIENTE';
export type SuscripcionEstado = 'PENDIENTE' | 'ACTIVA' | 'SUSPENDIDA' | 'VENCIDA' | 'CANCELADA';

export interface Empresa {
  id: number; codigo: string; slug: string; nombre: string; estado: EmpresaEstado;
  plan: string; estado_suscripcion: SuscripcionEstado; database_name: string;
  estado_tenant: string; version_schema: string; fecha_provisionamiento: string | null;
}
export interface Plan { id: number; codigo: string; nombre: string; descripcion: string; precio_mensual: string; moneda: string; limite_usuarios: number; limite_almacenamiento_mb: number; estado: boolean; }
export interface Suscripcion { id: number; empresa_id: number; plan_id: number; fecha_inicio: string; fecha_fin: string | null; estado: SuscripcionEstado; }
export interface Tenant { empresa: number; database_name: string; estado: string; version_schema: string; fecha_provisionamiento: string | null; ultima_verificacion: string | null; }
export interface Provisionamiento { id: number; empresa_id: number; tenant_database_id: number; estado: string; paso_actual: string; intentos: number; fecha_inicio: string | null; fecha_fin: string | null; mensaje_error: string | null; }
export interface Bitacora { id: number; saas_usuario_id: number | null; fecha_hora: string | null; ip: string | null; accion: string; entidad_afectada: string | null; id_registro_afectado: number | null; descripcion: string | null; resultado: string | null; }

export type BackupTipo = 'MANUAL' | 'AUTOMATICO' | 'PRE_RESTORE';
export type BackupEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR';

export interface Backup {
  id: number; empresa_id: number; tenant_database_id: number; tipo: BackupTipo; estado: BackupEstado;
  nombre_archivo: string | null; formato: string | null; size_bytes: number | null; sha256: string | null;
  version_schema: string | null; fecha_inicio: string; fecha_fin: string | null;
}

export type BackupPolicyFrecuencia = 'DIARIA' | 'SEMANAL' | 'MENSUAL';

export interface BackupPolicy {
  empresa_id: number; empresa_codigo: string; empresa_nombre: string | null; estado_empresa: string;
  configurada: boolean; habilitado: boolean | null; frecuencia: string | null; hora_local: string | null;
  timezone: string | null; retencion_cantidad: number | null; ultimo_backup_automatico: string | null;
  proximo_backup: string | null; fecha_actualizacion: string | null;
}

export interface BackupPolicyUpdate {
  habilitado: boolean; frecuencia: BackupPolicyFrecuencia; hora_local: string; timezone: string; retencion_cantidad: number;
}

export type RestoreEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR' | 'ROLLBACK_EN_PROCESO' | 'ROLLBACK_COMPLETADO' | 'ROLLBACK_ERROR';

export interface Restore {
  id: number; empresa_id: number; tenant_database_id: number; backup_id: number; pre_restore_backup_id: number | null;
  estado: RestoreEstado; etapa: string | null; fecha_inicio: string; fecha_fin: string | null;
  mensaje_error: string | null; rollback_estado: string | null; rollback_mensaje: string | null;
}

export interface RestoreValidation {
  backup_id: number; empresa_id: number; tenant_database_id: number; estado: string; tipo: string;
  size_bytes: number | null; sha256: string | null; version_schema: string | null; valido: boolean;
}
