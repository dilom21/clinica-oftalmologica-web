# ODD — CU15 Registrar consulta clínica (Frontend)

## Objetivo
Implementar en Angular el frontend del CU15: un oftalmólogo autenticado registra una
consulta clínica de un paciente vinculada a su historial y, opcionalmente, a una cita
existente, consumiendo `POST /historial-clinico/consultas`.

## Problema
No existe pantalla para registrar consultas clínicas; el backend CU15 ya está terminado
y probado. La UI no debe pedir IDs manuales ni enviar `oftalmologo_id`.

## Por qué
Cerrar el caso de uso CU15 end-to-end reutilizando los patrones reales del proyecto
(CU07 pacientes, CU09/CU10 citas, CU13 historial, sidebar dinámico, interceptor JWT).

## Alcance
- Feature `src/app/features/gestion-historial-clinico/casos-uso/cu15-registrar-consulta-clinica/`.
- Ruta protegida `/registrar-consulta-clinica` con `authGuard`.
- Mapeo de sidebar `'registrar consulta clínica' → '/registrar-consulta-clinica'`.
- Reutilización de `PacientesService`, `HistorialClinicoService`, `CitasService`, `AuthService`, `Sidebar`.

## Fuera de alcance
Backend, móvil, Supabase, CU16+, edición/eliminación de consultas, commit/push/merge.

## Restricciones
- No tocar backend/móvil/Supabase.
- No inventar endpoints.
- No enviar `oftalmologo_id`, `paciente_id`, `usuario_id`, `estado`, `fecha_consulta`.
- No acceder a Supabase desde Angular.
- No commit / push / merge.
- Mantener patrones Angular del repo (standalone + signals + `inject()` + `environment.apiUrl`).

## Contrato real verificado (backend local, solo lectura)
- `POST /historial-clinico/consultas` → 201.
  - Request (`extra="forbid"`): `historial_clinico_id:int(>0)`, `cita_id:int|null`,
    `motivo_consulta:str|null(max 255)`, `anamnesis:str|null`, `observaciones:str|null`.
  - Response: `id, historial_clinico_id, cita_id, oftalmologo{id,matricula,nombres,
    apellidos,especialidad}, fecha_consulta(datetime), motivo_consulta, anamnesis,
    observaciones, estado:bool`.
- `GET /historial-clinico/{paciente_id}` → `{paciente, historial}` (reutilizado).
- `GET /agenda-citas/citas?paciente_id=` → `CitaMedica[]` (reutilizado).
- Errores: 403 (sin perfil oftalmólogo / cita de otro oftalmólogo), 404 (historial/cita),
  409 (paciente inactivo, cita de otro paciente, estado no iniciable, consulta previa).

## Decisión de ruta de implementación
`direct inline` (un solo writer) — los archivos están fuertemente acoplados y el contrato
exacto del backend ya fue verificado; delegar reiniciaría contexto y arriesgaría deriva del contrato.

## Restricción conocida (NO bloqueo)
No existe endpoint para resolver el `oftalmologo_id` del usuario autenticado y el JWT solo
contiene `sub` y `rol_id`. Por lo tanto el frontend **no puede** pre-filtrar las citas por el
oftalmólogo logueado; se listan las citas del paciente en estados iniciables y el backend
valida (403/409). Documentado en el reporte.

## Checklist

- [x] T1 — Modelos `consulta-clinica.models.ts` + service `registrarConsulta` (`POST /historial-clinico/consultas`).
- [x] T2 — Página `registrar-consulta` (TS/HTML/CSS) con selección de paciente, historial, antecedentes, cita opcional, formulario reactivo y estados UX.
- [x] T3 — Ruta protegida `/registrar-consulta-clinica` (`authGuard`, `loadComponent`).
- [x] T4 — Mapeo sidebar `'registrar consulta clínica'`.
- [x] T5 — Tests (POST correcto, sin `oftalmologo_id`, `cita_id` null, form inválido no envía, doble submit, éxito 201, error 409, selección paciente/historial).
- [x] T6 — Build + tests + verificación de no-regresión (login, pacientes, agenda, historial, sidebar).
- [x] T7 — Reporte final `# Reporte CU15 Frontend`.

## Validaciones / criterios de aceptación
- Paciente seleccionado sin IDs manuales; historial cargado y mostrado con antecedentes.
- Cita válida opcional (PROGRAMADA/CONFIRMADA/EN_ESPERA) + opción "Sin cita asociada".
- Motivo ≤ 255; anamnesis requerida (texto clínico); observaciones opcional.
- No se envía `oftalmologo_id`; `cita_id` se envía `null` sin cita.
- Botón deshabilitado sin historial / durante request (evita doble submit).
- 201 muestra éxito; errores 400/401/403/404/409/422/500 con mensajes comprensibles.

## Checks aplicables
- `npm run build`
- `npm test` (vitest vía `@angular/build:unit-test`)

## Progreso / evidencia
- T1–T7 completados. Contrato backend verificado leyendo (solo lectura) `clinica-oftalmologica-api`.
- `npm run build`: OK (sin warnings de CU15; quedan 2 warnings preexistentes de CSS de CU10).
- `npx ng test --watch=false`: 5 archivos, 14 tests, todos pasan.
- Regresión verificada: los 15 chunks lazy (login, home, pacientes, agenda-disponibilidad,
  configurar-disponibilidad, gestionar-citas, historial-citas, historial-clinico, bitacora,
  roles, usuarios, recuperar/restablecer password, registrar-consulta) compilan y `app.spec` pasa.
- Decisión de validación: `anamnesis` requerida en frontend (el backend la admite null);
  el backend sigue siendo la autoridad. Documentado en el reporte.

## Siguiente paso
Ninguno pendiente para CU15. Fuera de alcance: prueba end-to-end contra la API real (requiere
credenciales de oftalmólogo); no ejecutada.
