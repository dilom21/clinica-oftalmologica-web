# Integración final Austin — proveedores

## Objetivo
Resolver el merge pendiente de `origin/dev-austin` conservando CU26, CU27, CU28, CU30, CU32 y CU33, con una sola ruta activa `/proveedores` apuntando provisionalmente a la implementación validada de Quisbert.

## Alcance autorizado
- Resolver conflictos manualmente, sin commit, push, merge adicional, reset ni abort.
- Conservar todos los archivos y pruebas de Austin, aislados de la ruta activa.
- Revisar imports, navegación dinámica, sidebar, autenticación tenant y permisos.
- Documentar la incompatibilidad de contratos HTTP y la selección pendiente del cliente según el backend integrado.

## Tareas
- [x] T1. Inspeccionar historial, conflicto y ambas implementaciones.
- [x] T2. Resolver ruta única y mapeo de navegación sin perder CU26/CU27/CU30/CU32/CU33.
- [x] T3. Validar archivos Austin, imports, pruebas y aislamiento contractual.
- [x] T4. Ejecutar TypeScript, pruebas focalizadas, suite completa, build y checks Git.
- [x] T5. Registrar resultados e incompatibilidades pendientes.

## Checks aplicables
- `npx.cmd --no-install tsc --noEmit`
- `npx.cmd --no-install ng test --watch=false`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Evidencia
- Historial y conflicto: solo `src/app/app.routes.ts`; `MERGE_HEAD` es `origin/dev-austin` (`96bde87`).
- Focalizadas: 11 archivos, 105 pruebas aprobadas.
- Suite completa: 72 archivos, 633 pruebas aprobadas; mensaje no fatal de Vitest: `Not implemented: navigation to another Document`.
- TypeScript: `npx.cmd --no-install tsc --noEmit` aprobado.
- Build: `npm.cmd run build` aprobado.
- Checks: `git diff --check` y `git diff --cached --check` aprobados.

## Estado
Merge resuelto y preparado en el índice, sin confirmarlo. La selección definitiva del cliente HTTP queda pendiente del contrato del backend integrado.
