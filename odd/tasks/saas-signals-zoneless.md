# PASO 7I — Corrección reactiva frontend SaaS

## Objetivo

Hacer dashboard, colecciones y login SaaS reactivos ante respuestas asíncronas reales en Angular 21 zoneless, sin modificar backend, contratos HTTP, tokens, environments ni agregar parches de ZoneJS.

## Autorización y alcance

- Repositorio autorizado: `C:\SI2_Proyecto\clinica-oftalmologica-web`
- Archivos principales: dashboard, collection, login, shell y pruebas SaaS.
- El servicio API se conserva sin cambios salvo que la verificación encuentre una necesidad estrictamente de consistencia.
- No commit, push, merge ni cambios de backend/CORS/Supabase.

## Ruta

- Implementación: delegated direct, porque la corrección abarca varios componentes y suites de pruebas no triviales.
- Skill UI aplicable: `.opencode/skills/frontend-ui-design/SKILL.md`.
- TDD/configuración: conservar el runner existente y usar pruebas DOM asíncronas con estabilización apropiada.

## Checklist

- [x] T1. Convertir estado asíncrono de dashboard a Signals y actualizar template.
- [x] T2. Convertir estado asíncrono de collection a Signals, incluyendo modal y PATCH.
- [x] T3. Convertir loading/error de login y revisar consistencia del shell.
- [x] T4. Añadir regresiones async DOM para dashboard, colecciones, bitácora, errores, login y PATCH ida/vuelta.
- [x] T5. Ejecutar tests, typecheck, build y `git diff --check`; leer estado final.

## Criterios de aceptación

- Las respuestas async actualizan el DOM sin `setTimeout`, `detectChanges()` de producción, `location.reload()` ni números hardcodeados.
- Loading termina en éxito y error; errores no renderizan falsamente colecciones vacías.
- Dashboard muestra métricas derivadas de las colecciones reales.
- Collection muestra filas y refleja cambios de estado después de PATCH.
- Login muestra errores saneados y conserva almacenamiento de token.
- Servicios, backend, CORS, environments y login clínico no cambian.

## Evidencia

- Progreso: implementación completada en dashboard, collection y login; no fue necesario modificar shell ni servicio API.
- Verificación SaaS delegada: 18 archivos de test / 18 passed; 18 tests SaaS passed.
- Verificación final: `npm test -- --watch=false` pasó (18 archivos, 102 tests); `npx.cmd tsc --noEmit -p tsconfig.app.json` pasó; `npm run build` pasó con warnings de presupuesto CSS preexistentes; `git diff --check` pasó con advertencias de conversión LF/CRLF de Git.
- Estado de entrega: no se hizo commit, push ni merge. La validación manual requiere reiniciar `npm start` y recorrer las rutas SaaS.
