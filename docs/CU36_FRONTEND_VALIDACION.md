# CU36 frontend validation

## Scope and date

Validation date: **2026-11-18**.

This document covers the Angular frontend implementation of CU36: payment cancellation,
amount correction, manual/Stripe refund handling, the adjustment ledger, reconciliation,
and the orphan-refund queue. The Git base was branch `dev-josias`, synchronized to
`origin/main` at `8cfe39fb5be2651794a8505103eded05df324c6a` before implementation.
No push, commit, or staging operation was performed.

## Architecture summary

- CU31 payment detail hosts CU36 actions and the adjustment ledger, then reloads server
  state after successful operations.
- The ledger displays the original amount, adjustments, current amount, refunded amount,
  and remaining balance without calculating authoritative values in the browser.
- Four operation/reconciliation dialogs cover cancellation, amount correction, refund,
  and reconciliation. The orphan queue additionally owns its strict attribution dialog.
- `/pagos/conciliaciones` is the guarded route for the orphan Stripe refund queue.
- UI capabilities come only from the existing `Gestionar pagos` menu function. Backend
  role gates are not inferred; an authorization rejection is surfaced as HTTP 403.
- A session without a tenant context is blocked before the orphan queue starts an HTTP
  request, consistently with CU31's existing no-tenant state.

## HTTP contracts

All routes use the prefix `${apiUrl}/pagos/administrativos`. Exactly eight CU36 endpoints
are consumed:

| # | Method | Endpoint | `Idempotency-Key` |
|---:|---|---|---|
| 1 | GET | `/{pago_id}/ajustes` | No |
| 2 | GET | `/ajustes/{ajuste_id}` | No |
| 3 | POST | `/ajustes/{ajuste_id}/conciliar` | No; idempotent by state |
| 4 | GET | `/reembolsos-huerfanos` | No |
| 5 | POST | `/reembolsos-huerfanos/{id}/atribuir` | No; idempotent by state |
| 6 | POST | `/{pago_id}/anular` | **Yes** |
| 7 | POST | `/{pago_id}/corregir` | **Yes** |
| 8 | POST | `/{pago_id}/reembolsos` | **Yes** |

The browser does not add a company or tenant identifier to any request. Tenant authority
comes from the authenticated backend session.

## Seven-profile frontend fixture matrix

These profiles are isolated fixtures that project the real `/seguridad/menu` wire shape
through the existing `permisosPagos` function. “Operate” and “reconciliation” both require
the write capability of `Gestionar pagos`.

| Fixture | Tenant | Menu functions | Ledger | Operate | Reconciliation | Contract scenario |
|---|---|---|:---:|:---:|:---:|---|
| `empresa-01` | Yes | `Gestionar pagos / AMBAS`; `Confirmar pagos bancarios / ESCRITURA` | Yes | Yes | Yes | Administrative-menu equivalent only; it does not encode or infer a role. |
| `empresa-02` | Yes | `Gestionar pagos / AMBAS` | Yes | Yes | Yes | Reception-menu equivalent at frontend level; admin-only backend writes may return 403 and the UI surfaces it. |
| `empresa-03` | Yes | `Gestionar pagos / LECTURA` | Yes | No | No | Read-only ledger access. |
| `empresa-04` | Yes | `Confirmar pagos bancarios / ESCRITURA` | No | No | No | Confirmation permission is independent and grants no CU36 capability. |
| `empresa-05` | Yes | Empty `Pagos.funciones` | No | No | No | Empty/malformed payments functions fail closed. |
| `empresa-06` | **No** | `Gestionar pagos / AMBAS` | No | No | No | The raw menu maps to read/write, but the explicit no-tenant frontend block prevents payment/orphan-queue requests. |
| `empresa-07` | Yes | `Gestionar pagos / AMBAS` | Yes | Yes | Yes | Mocked backend outcomes cover price `NULL`/`<=0`, installment D4, an open adjustment, and Stripe `DESCONOCIDO` as 409 or non-final state; the UI never infers them. |

## Explicit validation limitation

> **LIMITATION — NOT A SEVEN-TENANT INTEGRATION TEST**
>
> This validation covers **seven isolated frontend fixtures only**. It does **not** prove
> real seven-company behavior in the backend, database, tenant isolation, RBAC, Stripe,
> or production. No production service was contacted and no real payment, refund, or
> database request was made. The local backend was unavailable at `127.0.0.1:8000`
> during preflight. Real integration remains pending until the owner starts the backend;
> at that point the eight endpoints and OpenAPI contract must be exercised with authorized
> local test sessions.

## Known backend limits retained by the frontend

- **D4:** amount correction on installment payments and partial installment refunds are
  backend-blocked; the UI reports the returned 409 instead of inventing eligibility.
- **D5:** role gates remain backend-only. The frontend uses general menu capabilities and
  surfaces 403 for administrator-only writes.
- **D6:** no adjustment PDF/note contract exists, so none is offered.
- There is no endpoint to discard an orphan refund.
- There are no adjustment-collection filters by date, state, or patient.
- Stripe `PENDIENTE_PROVEEDOR` and `DESCONOCIDO` are non-final states, never success.
- Manual-return documentation is backend-conditional because `pasarela` is not exposed in
  `PagoAdministrativo`. The UI therefore sends `evidencia` and `referencia_devolucion` as
  optional fields and surfaces a backend 409 when the manual-return rule rejects both as absent.

## Security boundary

- The browser does not send a tenant/company field; the backend derives tenant context
  from the authenticated session.
- No secrets or `.env` contents were read.
- No backend, SQL, migration, Supabase, RLS, RBAC, deployment, or production change was made.
- No real Stripe, payment, refund, or database operation was executed.

## Final verification

Commands were run in the requested order from the repository root:

1. `npm run test:cu36` — **passed: 22 test files, 223 tests**.
2. `npx ng test --watch=false "--include=src/app/features/gestion-pagos/**/*.spec.ts" "--include=src/app/app.routes.spec.ts"` — **passed: 27 test files, 285 tests**.
3. `npx ng build` — **passed**; production bundle generated in `dist/clinica-oftalmologica-web`.
4. `git diff --check` — **passed with no whitespace errors**; Git emitted only the
   existing LF-to-CRLF conversion warnings for tracked worktree files.
5. `git status --short` — completed; CU36 remains an unstaged/untracked worktree delivery,
   together with pre-existing worktree changes. No commit, push, or staging was performed.

The fixture spec verifies stable order, unique codes, the real permission projection,
allowed menu names, required scenario coverage, and explicit no-tenant handling. Focused
component specs verify that CU31 does not begin patient calls in its no-tenant denial state
and the CU36 orphan queue does not call `listarReembolsosHuerfanos()` without a tenant.
