# ODD — Integración IA CU15/CU16

## Objetivo
Integrar desde Angular los endpoints FastAPI de asistencia clínica IA en CU15 y CU16, preservando los flujos existentes y sin registrar diagnósticos de forma automática.

## Problema / por qué
Los endpoints backend ya están disponibles, pero CU15/CU16 frontend aún no ofrecen análisis clínico explícito ni sugerencia controlada de redacción diagnóstica.

## Alcance autorizado
- Servicio `IaClinicaService` usando exclusivamente `environment.apiUrl` y el `HttpClient` existente.
- UI y lógica IA en los componentes actuales CU15 y CU16.
- Tests del servicio y ambos componentes.
- Exclusivamente frontend en `src/app/` y este documento de seguimiento.

## Restricciones
- No tocar backend ni Supabase; no implementar voz/reportes.
- No exponer API key DeepSeek ni llamar al proveedor desde Angular.
- CU15 solo solicita análisis por acción explícita después del alta exitosa; fallos IA no alteran el alta.
- CU16 valida nombre y descripción; muestra sugerencia antes de aceptarla; aceptar modifica solo descripción; descartar conserva texto original; ninguna acción IA registra diagnóstico.
- Manejar loading/success/error, 403/502/503 y otros errores con mensajes amigables.
- Usuario pidió expresamente no hacer commit, push ni merge; no se crearán commits aunque el flujo ODD ordinario los contemple.
- Ruta elegida: delegated direct. Evidencia: implementación comprende servicio compartido, componentes CU15/CU16 y tres grupos de specs (más de dos archivos no triviales); exploración previa de varios archivos delegada.
- TDD: modo/fuente no confirmados en contexto de proyecto. Runner disponible por instrucción explícita del usuario: `npx.cmd --no-install ng test --watch=false`; ejecutar checks funcionales sin afirmar un ciclo estricto no observado.

## Checklist
- [x] T1 — Implementar servicio tipado IA con URLs/payloads exactos y tests unitarios. Servicio/modelos creados en `src/app/features/gestion-historial-clinico/services/`; revisión confirma endpoints bajo `environment.apiUrl`, análisis con body null y mejora con solo nombre/descripcion. Tests de contrato se completarán junto con suite enfocada en verificación final.
- [x] T2 — Integrar análisis explícito CU15, resultados/estados y tests, sin cambiar el registro normal. Evidencia: el test CU15 crea la consulta #900, comprueba que no haya IA automática, solicita análisis manual, verifica body null y resultado estructurado; 503 mantiene visible el éxito del alta.
- [x] T3 — Integrar sugerencia de redacción CU16, validación/aceptar/descartar y tests sin POST automático. Evidencia: tests confirman payload recortado, bloquean descripción en blanco, prueban aceptar/descartar y verifican cero POST a diagnósticos por acción IA.
- [x] T4 — Ejecutar suite y build requeridos; inspeccionar seguridad y estado Git; entregar reporte solicitado. Evidencia adicional independiente: suite repetida por el coordinador (8 archivos, 35 tests aprobados), diff limpio en `git diff --check`, revisión independiente de aceptación/seguridad sin hallazgos concretos.

## Criterios / checks
- Solo FastAPI mediante `environment.apiUrl`; reutilizar interceptor JWT.
- `POST /ia/consultas/{id}/analizar` sin body clínico.
- Mejora envía exactamente `{ nombre, descripcion }`.
- Cumplir estados y mensajes indicados en `CONTEXTO_IA_FRONT.md` y `MASTER_PROMPT_IA_FRONT.md`.
- `npx.cmd --no-install ng test --watch=false`
- `npm run build`
- `git status --short --branch`; sin commit/push/merge.

## Progreso / evidencia
- Leídos completos ambos documentos especificadores antes de modificar código.
- Exploración delegada leyó localmente CU15, CU16, servicios, modelos, entornos, interceptor y specs; sin cambios.
- Línea base Git observada: rama `dev-josias`; hay varios archivos de usuario ya sin seguimiento, incluidos ambos documentos de especificación, `.atl/` y `odd/tasks/cu15-registrar-consulta-clinica.md`; preservarlos.
- T1 completada: creado `IaClinicaService` y contratos tipados; verificado por inspección que el payload de mejora solo contiene `nombre` y `descripcion`, y el endpoint analizar no envía datos clínicos.
- T2/T3 completadas en componentes existentes. Tests CU15/CU16 cubren acción explícita, estados de carga, resultados, error amigable 503 y ausencia de escritura diagnóstica desde IA.
- T4 verificada: `npx.cmd --no-install ng test --watch=false` terminó correctamente (8 archivos, 35 tests; repetido por el coordinador); `npm run build` terminó correctamente. Build conserva warnings presupuestarios CSS: CU16 diagnóstico 10.39 kB frente a 8.00 kB, además de dos hojas CU10 existentes. Escaneo confirmó que `src/app` no contiene `DEEPSEEK_API_KEY` ni `api.deepseek.com`. Revisión independiente no encontró incumplimientos concretos; `git diff --check` sin errores de whitespace. `gentle-ai review assess` no pudo clasificar el candidato por el inventario de untracked; RDD está desactivado y no se inició revisión nativa. Git status final revisado; no se tocaron los untracked preexistentes.

## Siguiente paso
Implementación y verificación terminadas; preparar entrega sin crear commit.
