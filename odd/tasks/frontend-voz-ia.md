# PASO 6B — Frontend Voz + IA

## Objetivo
Agregar dictado clínico reutilizable para CU15/CU16 y consulta por voz en `/reportes`, sin enviar audio, sin autosave y sin ejecutar preview/export automáticamente.

## Autorización y alcance
- Repositorio autorizado: `C:\SI2_Proyecto\clinica-oftalmologica-web`
- Ruta: implementación directa delegada, con un único escritor.
- Skill: `frontend-ui-design`.
- Fuera de alcance: backend, Supabase, librerías nuevas, TTS, backup, commit, push y merge.

## Checklist
- [x] Crear servicio reutilizable Web Speech API con estados, soporte, permiso, start/stop y resultado final.
- [x] Integrar append de dictado en motivo_consulta, anamnesis y observaciones de CU15.
- [x] Integrar dictado de descripcion en CU16 sin auto-IA ni auto-registro.
- [x] Agregar panel accesible de consulta por voz en reportes.
- [x] Integrar POST `/ia/reportes/interpretar` al servicio frontend existente o coherente.
- [x] Validar y aplicar dataset, columnas, filtros, orden y limit al builder de reportes existente.
- [x] Mostrar aclaraciones, acción/formato sugeridos y errores amigables sin auto-preview/export.
- [x] Crear/actualizar tests con SpeechRecognition mockeado y cobertura de los criterios solicitados.
- [x] Ejecutar `npx.cmd --no-install ng test --watch=false` y `npm run build`.

## Criterios de aceptación
- [x] Micrófono solo inicia por acción explícita y fallback manual permanece disponible.
- [x] Texto existente nunca se sobrescribe silenciosamente: se agrega con separación consistente.
- [x] Ningún transcript clínico se persiste automáticamente.
- [x] IA solo se llama después de que el usuario pulsa Interpretar con IA y nunca recibe audio.
- [x] La respuesta IA se aplica al constructor existente únicamente con claves válidas del catálogo.
- [x] El usuario conserva la decisión de previsualizar, exportar o cancelar.

## Progreso
- Mapeo local completado; se detectaron cambios previos del usuario en CU15/CU16 y archivos no rastreados existentes. El escritor debe preservar cambios ajenos al alcance.
- Verificación completada: `npx.cmd --no-install ng test --watch=false` => 11 test files, 66 tests passed; `npm run build` => application bundle generation complete.
- Evidencia de implementación: servicio compartido creado; CU15/CU16 usan `VoiceRecognitionService`; ReportesService usa `/ia/reportes/interpretar`; el builder conserva sus acciones manuales y descarta claves no presentes en el catálogo.
- Warnings observados: presupuestos CSS excedidos en CU15, CU16, Reportes y pantallas preexistentes de agenda; no impiden compilación.
