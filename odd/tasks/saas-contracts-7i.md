# ODD — Auditoría y corrección de contratos SaaS 7I

## Objetivo
Corregir el consumo frontend de las colecciones SaaS reales, eliminar el estado de carga infinito y cubrir el contrato observado con pruebas de regresión.

## Alcance autorizado
- Solo `C:\SI2_Proyecto\clinica-oftalmologica-web`.
- Backend solo para inspección; no modificarlo.
- No tocar login clínico ni separación de tokens.
- No modificar tenant DBs, backup/restore, realtime ni operaciones remotas.
- No commit, push ni merge.

## Evidencia inicial
- Las respuestas autenticadas observadas son arrays JSON directos, no `{items: ...}` ni `{data: ...}`.
- `/saas/empresas`: 7 registros, todos `ACTIVA`.
- `/saas/planes`: 3 registros, `estado` booleano `true`.
- `/saas/suscripciones`: 7 registros, todos `ACTIVA`.
- `/saas/tenants`: 7 registros, todos `ACTIVA`.
- `/saas/provisionamientos`: 7 registros, todos `COMPLETADO`.
- `/saas/bitacora`: la navegación del navegador observó un fallo CORS del backend; no se modifica backend.
- El dashboard actual filtra planes con `estado === 'ACTIVO'`, incompatible con el booleano real.

## Ruta
Delegated direct: la corrección toca modelos, servicio, dashboard, colección y múltiples specs.

## Tareas
- [x] 7I-01 Auditar JSON real, modelos, servicio, dashboard y páginas.
- [x] 7I-02 Alinear modelos y normalización centralizada en el servicio.
- [x] 7I-03 Corregir dashboard y loading/error terminal.
- [x] 7I-04 Corregir páginas de colecciones y mensajes de error.
- [x] 7I-05 Añadir regresiones de contrato, métricas, loading, refresh, errores, login y tokens.
- [x] 7I-06 Ejecutar tests, build, typecheck y `git diff --check`.

## Comprobaciones
- `npx.cmd --no-install ng test --watch=false --include="src/app/features/saas/**/*.spec.ts"` — PASS, 5 files / 20 tests.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` — PASS.
- `npx.cmd --no-install ng build` — PASS.
- `git diff --check` — PASS; only pre-existing line-ending warnings were reported for unrelated working-tree files.

## Progreso
Implementación completada. Las pruebas SaaS cubren seis colecciones con arrays directos, métricas 7/7/7/7/3/0, éxito/error de carga, refresh, respuesta inválida, colecciones no vacías y preservación de login/token SaaS.
