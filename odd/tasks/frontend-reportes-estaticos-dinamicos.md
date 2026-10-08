# Frontend de reportes estáticos y dinámicos

## Objective
Integrate the Angular frontend with the existing report catalog, preview, and export API for administrator users.

## Problem and rationale
Sprint 2 step 4 requires usable static and dynamic reports without duplicating permissions/navigation, hardcoding catalog metadata, storing clinical results in browser storage, or changing backend/Supabase.

## Scope and constraints
- Work only in `C:\SI2_Proyecto\clinica-oftalmologica-web` and only frontend implementation files plus this ODD tracker.
- Preserve all pre-existing modified and untracked files.
- Use `/reportes/catalogo` as the source of static reports, datasets, fields, operators, labels, defaults, and sortability.
- Use `environment.apiUrl`, existing auth interceptor, `authGuard`, dynamic sidebar, and permission function `Generar reportes`.
- No backend, Supabase, SQL construction, voice, DeepSeek report generation, HTML/email/backup, or clinical-result browser storage.
- No commit, push, or merge; explicit user prohibition overrides normal ODD work-unit commit convention.
- TDD mode: unknown/not resolved from project configuration; do not assume enabled. Required functional checks: `npx.cmd --no-install ng test --watch=false`; `npm run build`.

## Authorized scope
Report service/models, administrative report page and tests, `/reportes` route, and existing sidebar function-to-route integration only.

## Acceptance criteria and tasks
- [x] RPT-1: Inspect local Angular patterns and implement typed report catalog/service, dynamic/static configuration UI, filters (including `between`, `in`, boolean/date), maximum three sort rules, preview and XLSX/PDF/CSV downloads with friendly errors.
- [x] RPT-2: Add guarded `/reportes` route and integrate the existing sidebar mapping for `Generar reportes`; add service and component coverage without weakening existing tests.
- [x] RPT-3: Run requested full test and build commands, inspect final diff/status, and report all actual results and any unresolved catalog-contract limitation.
- [x] RPT-4: Ejecutar la segunda iteración visual de `/reportes` con hero, cards, tabs, configurador, exportación agrupada, tabla responsive y estados accesibles, sin cambiar lógica ni contrato backend.
- [x] RPT-5: Agregar exportación HTML desde Blob y envío por correo para reportes estáticos y personalizados, alineado al contrato real FastAPI, con validaciones, accesibilidad y cobertura de pruebas.

## Progress and evidence
- Read both complete report frontend instruction documents; working tree already contains unrelated modified CU15/CU16 files and numerous pre-existing untracked files. Preserve them.
- Delegated local frontend mapping: route is `src/app/app.routes.ts`; guard is `src/app/core/guards/auth.guard.ts`; server menu and routing map are in `src/app/core/services/menu.service.ts` and `src/app/core/layouts/sidebar/sidebar.ts`; JWT interceptor is `src/app/core/interceptors/auth.interceptor.ts`; environment files are under `src/environments/`.
- Registry resolves `frontend-ui-design` at `.opencode/skills/frontend-ui-design/SKILL.md`; skill resolution: paths-injected.
- Selected route: delegated direct single writer, because implementation spans multiple non-trivial files; task is substantive and recovery-worthy.

## Observed evidence
- Implemented the authorized frontend scope. `npx.cmd --no-install ng test --watch=false` passed with 10 test files and 47 tests. `npm run build` passed; the final build reports CSS budget warnings in reportes and pre-existing agenda/diagnóstico/cita styles.
- Added `ReportesService`, typed catalog/request models with catalog normalization, standalone report page, service/component tests, guarded `/reportes` route, and the existing sidebar function mapping for `Generar reportes`.
- No backend, Supabase, SQL, browser storage for report results, commit, push, or merge was performed. TDD remains unknown; this task does not claim strict TDD.
- No unresolved catalog-contract limitation was observed from the local frontend; the normalizer accepts the documented Spanish/English catalog key variants without inventing report metadata.
- Corrected mode isolation so dynamic sort criteria are cleared before static preview/export, and aligned 422/default messages with the requested contract.
- Segunda iteración visual autorizada por el usuario: ruta delegada directa a un único escritor frontend; conservar el contrato backend y validar con los comandos definidos arriba.
- Segunda iteración visual completada: hero institucional, catálogo estático seleccionable, configurador separado, filtros/orden jerarquizados, exportación agrupada y tabla responsive implementados sin cambios de servicio/modelos/payloads. `npx.cmd --no-install ng test --watch=false` pasó con 10 archivos y 47 tests; `npm run build` pasó con warnings de presupuesto CSS en reportes y módulos preexistentes.
- Paso 5B autorizado: ruta delegada directa a un único escritor frontend; backend y Supabase permanecen solo lectura/no modificables, sin commit, push ni merge.
- Paso 5B completado: exportación HTML dinámica y estática con Blob/Content-Disposition, envío email dinámico y estático con payload exacto, validaciones, modal accesible, estados de loading/éxito/error y ausencia de almacenamiento browser.
- Evidencia de cobertura: `npx.cmd --no-install ng test --watch=false` pasó con 10 archivos y 59 tests; incluye pruebas de HTML visible/llamada, panel accesible y Escape, validaciones de destinatario/asunto/mensaje, cuatro formatos, email dinámico/estático, loading, éxito, 403/422/503 y no uso de storage. `npm run build` pasó con warnings de presupuesto CSS.
