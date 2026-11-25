# CU36 — Anulaciones, correcciones, devoluciones y conciliaciones (frontend web)

## Objetivo

Integrar CU36 en el módulo de pagos web existente (CU31) para que un usuario
autorizado pueda anular un pago, corregir su importe, registrar una devolución
manual o un reembolso Stripe, consultar el libro de ajustes, conciliar
operaciones pendientes y atribuir reembolsos huérfanos de Stripe — siempre
respetando los contratos y validaciones reales del backend.

## Problema

El frontend solo expone CU31 (registrar/confirmar/comprobante/notificación) y
CU32/CU33 (planes y cuotas). No hay ninguna superficie para el dinero que ya
fue capturado y debe corregirse, devolverse o conciliarse, ni forma de ver el
libro inmutable de ajustes que el backend ya mantiene.

## Por qué

El backend local ya implementa el libro `pago_ajuste` / `pago_ajuste_detalle`,
el flujo de conciliación y la cuarentena de reembolsos Stripe sin metadata.
Sin UI, un administrador no puede operar esos flujos y no puede distinguir
entre una operación solicitada, una pendiente del proveedor y una confirmada.

## Alcance autorizado

- Solo `clinica-oftalmologica-web`, rama `dev-josias`.
- Extender CU31: historial, detalle y contenedor de pagos.
- Crear la carpeta de caso de uso CU36 dentro de `features/gestion-pagos/casos-uso/`.
- Añadir una ruta nueva de conciliaciones dentro del bloque `/pagos`.

## Fuera de alcance (explícito)

- Backend, SQL, migraciones, RLS, grants, Supabase, AWS, despliegue: prohibido.
- Permisos nuevos, seeds o cambios de RBAC: prohibido (D5 sigue abierto).
- PDF / nota de ajuste: no existe en backend (D6). No se implementa.
- Corrección de importe sobre pago de cuota y devolución parcial de cuota:
  bloqueadas por backend (D4). No se ofrecen como flujo; solo se traduce el 409.
- Descartar un reembolso huérfano: el backend no lo permite. No se ofrece.
- Listar ajustes por fecha/estado/paciente: no existe endpoint. No se inventa.
- Commit, push, PR, staging: requieren autorización separada.

## Restricciones técnicas

- Importes como `string` decimal. Prohibido `number`, `parseFloat` y aritmética
  binaria para dinero. Toda comparación/suma pasa por centavos enteros.
- `Idempotency-Key` obligatoria solo en `anular`, `corregir` y `reembolsos`.
  Una clave por operación lógica; se reutiliza únicamente al reintentar el
  mismo payload. `conciliar` y `atribuir` son idempotentes por estado.
- HTTP 200 con `estado` no final es posible en reembolsos Stripe: la UI
  ramifica por `estado`, nunca por status HTTP.
- Gates de rol del backend son invisibles al frontend: la acción se muestra
  según permisos generales y el 403 conserva el detalle preciso del backend;
  solo sin detalle usa el fallback "requiere administrador". Sin heurísticas.
- No enviar empresa/tenant desde el navegador.
- Mantener compatibilidad CU31/CU32/CU33: no romper sus contratos ni sus specs.
- Componentes standalone, signals, formularios reactivos, estilos con tokens
  de `src/styles.css`, responsive y accesibles.

## Criterios de aceptación

- [x] Los 8 endpoints CU36 se consumen con método, ruta, body y headers exactos.
- [x] Cada escritura tiene confirmación explícita y bloqueo de doble envío.
- [x] El libro de ajustes muestra original, ajustes, vigente, reembolsado y saldo.
- [x] Los estados no finales (pendiente/desconocido) nunca se muestran como éxito.
- [x] 401/403/404/409/422/5xx y timeout tienen mensaje propio, sin éxito simulado.
- [x] Tras cada operación el detalle e historial se refrescan desde servidor.
- [x] La bandeja de huérfanos lista solo pendientes y permite atribuir con
      motivo, naturaleza, evidencia y distribución negativa por servicio.
- [x] `ng build` y la suite de tests pasan.
- [x] Matriz de 7 perfiles frontend documentada, con su alcance declarado.
- [ ] Integración real contra el backend local (pendiente: backend no disponible).
- [ ] Validación real de siete empresas/tenants (la matriz ejecutada usa solo fixtures frontend).

## Tareas

Flujo: etapas pequeñas y funcionales en la misma rama, validando build y tests
después de cada una. Topología: writer delegado por etapa.

- [x] **T1 — Contratos CU36** (delegado). `models/ajustes-pagos.models.ts` +
      spec: tipos, interfaces de request/response, etiquetas, predicados de
      elegibilidad observables y helpers de dinero con signo.
- [x] **T2 — Cliente HTTP CU36** (delegado). `services/ajustes-pagos.service.ts`
      + spec: 8 operaciones sobre `${apiUrl}/pagos/administrativos`.
- [x] **T3 — Campos calculados en CU31** (delegado). Añadir `importe_vigente`,
      `importe_reembolsado` y `ajustes_pendientes` opcionales a
      `PagoAdministrativo`, sin romper sus specs.
- [x] **T4 — Diálogo anular** (delegado). Motivo, naturaleza, evidencia
      opcional, confirmación destructiva, `Idempotency-Key`.
- [x] **T5 — Diálogo corregir** (delegado). Importe con signo, distribución por
      servicio que sume exacto, moneda, evidencia obligatoria si es al alza.
- [x] **T6 — Diálogo devolución/reembolso** (delegado). Importe negativo,
      distribución negativa, referencia de devolución, estados no finales.
- [x] **T7 — Libro de ajustes** (delegado). Panel `historial-ajustes` con
      agregados y lista; integrado en `detalle-pago`.
- [x] **T8 — Diálogo conciliar** (delegado). Resultado, evidencia,
      observaciones, `refund_id` explícito; estados conciliables.
- [x] **T9 — Bandeja de huérfanos** (delegado). Página nueva + diálogo de
      atribución con distribución negativa.
- [x] **T10 — Rutas y navegación** (delegado). Ruta `/pagos/conciliaciones`,
      pestaña interna condicionada por ESCRITURA y specs actualizados. No se
      añadió una función a `NavegacionService`: D5 no define permiso CU36.
- [x] **T11 — Integración en detalle/historial** (delegado). Acciones, gates,
      refresco tras operar, `claseEstado` para `REEMBOLSADO`/`ANULADO`.
- [x] **T12 — Matriz 7 perfiles + validación** (delegado). Fixtures por
      empresa, documentación del alcance, build y suite completa.
- [x] **T13 — Consumidor real del detalle de ajuste** (delegado). Evidencia del
      disparador: corrección no trivial en `historial-ajustes.ts`, `.html`,
      `.css` y `.spec.ts`. Alcance autorizado: solo frontend CU36; consumir
      `consultarAjuste(id)` desde el libro existente, sin nueva pantalla ni
      duplicar los campos de resumen. Aceptación: acción accesible, estados
      locales de carga/error/403, reintento de errores ordinarios, protección
      contra respuestas tardías A→B, detalle obtenido del endpoint y uso de ese
      detalle al conciliar la selección. Comprobaciones requeridas:
      `npm run test:cu36`, `npx ng build`, `git diff --check` y
      `git status --short --branch`. Commit: **PENDING — user explicitly
      prohibited staging and commits for this work unit**.

## Contratos de referencia (verificados en backend local)

Prefijo real: `/pagos` + `/administrativos`.

| Método | Ruta | Body | Respuesta | Idem-Key |
|---|---|---|---|---|
| GET | `/{pago_id}/ajustes` | — | `HistorialAjustesRespuesta` | no |
| GET | `/ajustes/{ajuste_id}` | — | `PagoAjusteRespuesta` | no |
| POST | `/ajustes/{ajuste_id}/conciliar` | `ConciliarAjuste` | `PagoAjusteRespuesta` | no |
| GET | `/reembolsos-huerfanos` | — | `WebhookHuerfanoRespuesta[]` | no |
| POST | `/reembolsos-huerfanos/{id}/atribuir` | `AtribuirReembolsoHuerfano` | `PagoAjusteRespuesta` | no |
| POST | `/{pago_id}/anular` | `AnularPago` | `PagoAjusteRespuesta` | sí |
| POST | `/{pago_id}/corregir` | `CorregirPago` | `PagoAjusteRespuesta` | sí |
| POST | `/{pago_id}/reembolsos` | `ReembolsarPago` | `PagoAjusteRespuesta` | sí |

`Idempotency-Key`: 8–100 caracteres, alfabeto `[A-Za-z0-9._:/-]`, única por base
de datos de tenant. Payload distinto con la misma clave → 409
"La clave idempotente ya fue usada con otros datos".

## Verificación

- `npm run build`
- `npm test` (o el script acotado de CU36 una vez creado)
- Specs nuevos: modelos, servicio HTTP, formularios, gates de permiso,
  idempotencia, estados de proveedor y errores.
- Sin operaciones reales de Stripe, sin cobros, sin escrituras a bases.

## Progreso

- 2026-11-18: `dev-josias` sincronizada con `origin/main` (`8cfe39f`, fast-forward,
  ancestro verificado). Inspección de contratos backend completada. Backend local
  no está corriendo en `127.0.0.1:8000`: la integración real queda pendiente de
  que se levante; la implementación usa mocks.
- Decisiones del propietario: gates de rol por 403 traducido; bandeja de huérfanos
  incluida como ruta nueva; entrega por etapas en rama, sin commits ni push.
- 2026-11-18: T13 conectó el libro existente con `consultarAjuste(id)` mediante
  detalle inline accesible, estados locales, reintento ordinario, 403 explícito,
  protección A→B y preferencia del detalle al conciliar. Evidencia observada:
  `npm run test:cu36` **22 archivos / 229 tests**, `npx ng build` aprobado,
  `git diff --check` sin errores (solo avisos LF→CRLF) y estado final consultado
  en `dev-josias`, sin staging, commit ni mutaciones de rama.

## Evidencia final por tarea

Todas las tareas siguieron la ruta `delegated`. La evidencia común es la verificación final
de 2026-11-18: `test:cu36` pasó **22 archivos / 223 tests**, la suite de pagos y rutas pasó
**27 archivos / 285 tests**, `npx ng build` pasó y `git diff --check` no reportó errores.
Una pasada acotada de corrección de auditoría final cubrió idempotencia, fail-close tenant,
refrescos concurrentes, tipos de IDs en selects, documentación condicional de devoluciones,
mensajes de saldo, respuestas obsoletas de la bandeja y accesibilidad de la distribución.

| Tarea | Ruta | Evidencia clave | Commit de unidad de trabajo |
|---|---|---|---|
| T1 | delegated | `models/ajustes-pagos.models.ts` y `.spec.ts` | **PENDING — user prohibited commits without authorization** |
| T2 | delegated | `services/ajustes-pagos.service.ts` y `.spec.ts`; 8 contratos HTTP | **PENDING — user prohibited commits without authorization** |
| T3 | delegated | `pagos-administrativos.models.ts` y specs CU31 | **PENDING — user prohibited commits without authorization** |
| T4 | delegated | `components/dialogo-anular-pago/*` | **PENDING — user prohibited commits without authorization** |
| T5 | delegated | `components/dialogo-corregir-pago/*` | **PENDING — user prohibited commits without authorization** |
| T6 | delegated | `components/dialogo-reembolso-pago/*` | **PENDING — user prohibited commits without authorization** |
| T7 | delegated | `components/historial-ajustes/*`; montaje en `detalle-pago` | **PENDING — user prohibited commits without authorization** |
| T8 | delegated | `components/dialogo-conciliar-ajuste/*` | **PENDING — user prohibited commits without authorization** |
| T9 | delegated | `pages/conciliaciones/*` y `components/dialogo-atribuir-huerfano/*` | **PENDING — user prohibited commits without authorization** |
| T10 | delegated | `app.routes.ts`, `app.routes.spec.ts` y pestaña interna desde CU31; sin función RBAC inventada | **PENDING — user prohibited commits without authorization** |
| T11 | delegated | `detalle-pago/*`, `historial-pagos/*` y sus specs | **PENDING — user prohibited commits without authorization** |
| T12 | delegated | `testing/empresas-cu36.fixture.ts`, su spec y `docs/CU36_FRONTEND_VALIDACION.md` | **PENDING — user prohibited commits without authorization** |
| T13 | delegated | `components/historial-ajustes/*`; consumidor inline real de `GET /ajustes/{ajuste_id}`, 6 regresiones focalizadas; 22/229 tests y build aprobados | **PENDING — user explicitly prohibited commits** |

## Verificación final y límites

- `npm run test:cu36`: **22 archivos / 223 tests aprobados**.
- Suite `src/app/features/gestion-pagos/**/*.spec.ts` + `app.routes.spec.ts`:
  **27 archivos / 285 tests aprobados**.
- `npx ng build`: aprobado; salida en `dist/clinica-oftalmologica-web`.
- `git diff --check`: aprobado sin errores de espacios; solo mostró advertencias de
  conversión LF a CRLF en archivos versionados del worktree.
- `git status --short`: ejecutado; entrega sin staging, commit ni push.
- T13: `npm run test:cu36` aprobó **22 archivos / 229 tests**; el build y
  `git diff --check` también aprobaron, y `git status --short --branch` confirmó
  `dev-josias...origin/dev-josias [ahead 14]` con los cambios locales preservados.
- La matriz valida siete fixtures frontend aislados; **no** valida siete empresas reales.
- No se ejecutó integración backend: `127.0.0.1:8000` no estaba disponible en preflight.

## Próximos pasos

1. El propietario inicia el backend local.
2. Ejecutar un smoke de integración local contra OpenAPI y los ocho endpoints CU36, sin
   producción ni operaciones reales de Stripe.
3. Si el propietario lo desea, autorizar por separado el staging/commit de esta entrega.
