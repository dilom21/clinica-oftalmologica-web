# ODD — Frontend Administrador SaaS 7H

## Objetivo
Crear una interfaz Angular SaaS Admin completamente separada del administrador clínico, con autenticación, navegación, gestión de metadata y cambios de estado conforme a los contratos reales del backend.

## Problema
El frontend clínico actualmente usa `access_token` para cualquier request y no dispone de rutas, guard, layout ni vistas SaaS.

## Alcance autorizado
- Solo `C:\SI2_Proyecto\clinica-oftalmologica-web`.
- No modificar backend, bootstrap SaaS, bases tenant, login clínico ni contratos clínicos.
- No commit, push ni merge.
- No guardar contraseñas, JWT visibles, secretos ni datos clínicos.

## Ruta elegida
Delegated direct: la implementación toca múltiples archivos no triviales y requiere preservar contratos clínicos. La exploración confirmó rutas, auth, interceptor, layout y contratos backend reales.

## Comprobaciones aplicables
- `npx.cmd --no-install ng test --watch=false`
- `npm run build`
- `npx.cmd tsc --noEmit -p tsconfig.app.json`
- `git diff --check`

## Tareas
- [x] ODD-7H-01 Crear modelos, `SaasAuthService`, guard, interceptor separado y tests de aislamiento.
- [x] ODD-7H-02 Crear layout SaaS, login, rutas y navegación independiente.
- [x] ODD-7H-03 Implementar dashboard y vistas de empresas, planes, suscripciones, tenants, provisionamientos y bitácora con contratos reales.
- [x] ODD-7H-04 Implementar confirmaciones y PATCH de estados, manejo de errores y logout.
- [x] ODD-7H-05 Ejecutar tests, build, typecheck, diff check y auditoría responsive/accesibilidad.

## Criterios de aceptación
- `/saas/*` usa exclusivamente `saas_access_token`; las rutas clínicas conservan `access_token`.
- Login SaaS no adjunta Authorization y redirige a `/saas` tras respuesta válida.
- `saasAuthGuard` exige token SaaS presente, no expirado y `token_type=saas_admin`.
- 401 SaaS limpia solo el token SaaS; 403/404/409/5xx muestran mensajes seguros.
- Todas las métricas y tablas provienen de endpoints reales; no se inventan propiedades.
- Empresas y suscripciones solicitan confirmación antes de PATCH y refrescan al completar.
- El layout visual comunica PLATAFORMA SAAS ≠ CLÍNICA TENANT y funciona en 360, 390, 480, 768, 820, 1024 y 1440 px.
- Tests, build, typecheck y `git diff --check` quedan reportados honestamente.

## Progreso
Implementación frontend completada y corregida tras auditoría independiente. Las acciones de empresas quedaron limitadas a `ACTIVA <-> SUSPENDIDA`; `PENDIENTE` no ofrece acción y el modal de empresa solo expone esos dos estados. Suscripciones requieren selector/modal explícito con el enum confirmado y ambas operaciones mantienen el PATCH `{estado}`. Los tenants activos del dashboard se cuentan por `estado === 'ACTIVA'`, sin cifras hardcodeadas. El login usa mensajes seguros por estado HTTP y no expone `error.error.message` ni detalles internos. Se añadieron `aria-live`, foco inicial del modal y Escape global.

## Evidencia de auditoría y pruebas
- Tests unitarios: `npx.cmd --no-install ng test --watch=false` — **18 archivos, 85 tests aprobados**.
- Build: `npm run build` — **aprobado**; conserva warnings de presupuesto CSS preexistentes en componentes no relacionados (`cu15`, `cu10`, `cu16`, `reportes`).
- TypeScript: `npx.cmd tsc --noEmit -p tsconfig.app.json` — **aprobado**.
- Formato: `git diff --check` — **aprobado**; Git solo reportó advertencias de normalización LF/CRLF en archivos previamente modificados.
- Tests enfocados añadidos: `saas-dashboard.component.spec.ts`, `saas-collection.component.spec.ts`, `saas-login.component.spec.ts` y `saas-api.service.spec.ts`.

## Siguiente paso
Realizar prueba E2E únicamente cuando el bootstrap SaaS real de 7I esté autorizado; no se ejecutó backend vivo en esta corrección.
