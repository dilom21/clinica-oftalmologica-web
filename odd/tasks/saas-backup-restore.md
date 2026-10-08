# ODD — Frontend SaaS Backup/Restore (PASO 8D Fase B)

## Objetivo
Implementar en el Administrador SaaS Angular: gestión visual de backups, creación manual,
políticas automáticas, validación previa y restauración con confirmación, e historial de
restauraciones, respetando los contratos reales del backend (Fase A).

## Problema
El frontend SaaS (7H/7I) cubre empresas, planes, suscripciones, tenants, provisionamientos y
bitácora, pero no expone la administración de backups ni restauraciones ya disponibles en el
backend (`/saas/backups`, `/saas/backup-policies`, `/saas/restores`).

## Alcance autorizado
- Solo el repositorio frontend `C:\SI2_Proyecto\clinica-oftalmologica-web`.
- Backend en solo lectura `C:\SI2_Proyecto\clinica-oftalmologica-api` (contratos ya leídos).
- No modificar backend ni Supabase. No ejecutar backups/restores reales. No borrar backups.
  No modificar tenants. No configurar cron. No editar `.env`. No commit/push/merge.

## Restricciones de seguridad
- Solo `saas_access_token`. Nunca `access_token` clínico en `/saas/*`.
- No exponer JWT, passwords, `database_name`, `storage_key`, `DATABASE_URL`, claves Supabase
  ni rutas privadas del dump en la UI.
- El frontend no ejecuta `pg_dump`/`pg_restore`; no hay endpoint de descarga autorizado.

## Ruta elegida
Direct (foundation) + delegated direct (componentes). La foundation (modelos, servicio, rutas,
navegación) es mecánica y se escribe inline; los tres componentes de página no triviales se
delegan a un writer por componente.

## Contratos backend reales (Fase A)
- `GET /saas/backups?empresa_id&estado&tipo` -> `Backup[]`
- `POST /saas/backups` body `{ empresa_id }` (extra=forbid) -> `Backup` 201
- `GET /saas/backups/{backup_id}` -> `Backup`
- `GET /saas/backup-policies` -> `BackupPolicy[]`
- `PUT /saas/backup-policies/{empresa_id}` body `{habilitado,frecuencia,hora_local,timezone,retencion_cantidad}` -> `BackupPolicy`
- `POST /saas/restores/validate` body `{ backup_id }` -> `RestoreValidation`
- `POST /saas/restores` body `{ backup_id, confirmacion }` (`confirmacion == empresa.codigo`) -> `Restore` 201
- `GET /saas/restores?empresa_id&estado` -> `Restore[]`
- `GET /saas/restores/{restore_id}` -> `Restore`
- `GET /saas/empresas`, `GET /saas/tenants` para selectores.

## Comprobaciones aplicables
- `npm test -- --watch=false`
- `npx.cmd tsc --noEmit -p tsconfig.app.json`
- `npm run build`
- `git diff --check`

## Tareas
- [x] ODD-8D-01 Foundation: modelos TS, métodos `SaasApiService`, rutas y navegación, spec del servicio.
- [x] ODD-8D-02 Componente Backups (listado + filtro empresa + crear manual + doble submit).
- [x] ODD-8D-03 Componente Políticas automáticas (upsert + distinción scheduler real).
- [x] ODD-8D-04 Componente Restauraciones (validación + confirmación por código + historial).
- [x] ODD-8D-05 Tests, typecheck, build y `git diff --check` honestos.

## Criterios de aceptación
- `/saas/*` sigue usando solo `saas_access_token`.
- Backups: selector empresa, tabla (tipo/estado/fecha/tamaño/versión/SHA-256), Actualizar,
  Crear backup manual con `{empresa_id}` únicamente, sin doble submit, sin descarga.
- Políticas: configurar habilitado/frecuencia/hora/timezone/retención; distinguir "Política
  configurada" de "Scheduler externo operativo"; nunca afirmar automatización en producción
  sin evidencia; no ejecutar backup desde el formulario.
- Restauraciones: seleccionar empresa -> backup COMPLETADO de esa empresa -> validar -> aviso
  de interrupción -> confirmar escribiendo el código exacto -> crear restore -> historial.
  Bloquear RESTAURAR si validación falla; sin doble submit; sin restore automático.
- Tablas responsive, aria-live, estados vacíos, errores saneados, sin secretos.

## Progreso
Foundation escrita inline (modelos, `SaasApiService`, rutas, navegación, spec del servicio).
Los tres componentes de página y sus specs fueron escritos por un writer delegado y luego
verificados por un revisor independiente de solo lectura.

Correcciones tras la verificación independiente:
- Se reforzó `sanitizeMessage` de restauraciones (redacción de URIs/credenciales/rutas; solo se
  muestran mensajes operativos cortos conocidos).
- Tras un restore exitoso se limpian `validation`, `selectedBackup`, `validationError` y
  `confirmText` para impedir un segundo envío destructivo.
- Se eliminó la columna `database_name` de las tablas existentes de Empresas y Tenants
  (`saas-collection.component.ts`) por la prohibición de FASE 6, y se endureció su display de error.

## Verificación
- `npm test -- --watch=false` — **24 archivos, 153 tests aprobados** (exit 0).
- `npx.cmd tsc --noEmit -p tsconfig.app.json` — **aprobado** (exit 0).
- `npm run build` — **aprobado** (exit 0); solo warnings de presupuesto CSS preexistentes en
  componentes no relacionados (cita-form, reportes, registrar-consulta, registrar-diagnostico,
  gestionar-citas). Ningún componente SaaS excede el presupuesto.
- `git diff --check` — **aprobado** (exit 0); solo advertencias LF/CRLF preexistentes.
- Revisor independiente (solo lectura): contratos de payload/enums/hora `HH:MM:SS`/rutas/nav
  confirmados; 3 hallazgos, todos corregidos arriba.
- RDD: `gentle-ai review mode status` = off (default). `review assess` no evaluable por archivos
  sin seguimiento; se aplicó verificación escrita + revisor independiente (tier alto).

## Siguiente paso
Prueba E2E manual contra backend vivo (no ejecutada aquí). No commit/push por instrucción.
