# CU27 — Gestionar movimientos de inventario

## Objective
Implement the Angular frontend for CU27 using only the three real movement endpoints, reusing CU26 catalog selectors and preserving tenant JWT security and dynamic navigation.

## Authorized scope
- Frontend repository only, branch `dev-josias`.
- No backend, database, SQL, remote mutation, commit, push, merge, or deployment.
- Do not alter CU26 behavior except strictly necessary route/navigation integration.

## Tasks
- [x] CU27-01 — Add exact movement DTOs and HTTP service for POST movement, GET history, and GET existence; add contract tests. Outcome: created exact unions/DTOs, three-method service using `HttpParams`, and three HTTP contract tests; no extra endpoint was added.
- [x] CU27-02 — Implement responsive movement page with CU26 product/lot selection, server-authoritative stock card, manual form validation, history filters/pagination, loading/error/success states, and focused component tests. Outcome: created the standalone responsive page, active catalog selectors, server existence/history refreshes, five-type form, HTTP error messages, tenant-state clearing, and four focused component tests.
- [x] CU27-03 — Integrate guarded lazy route and dynamic navigation mapping without replacing the existing menu; verify CU26 remains intact. Outcome: added `/gestion-movimientos-inventario` with `authGuard` and mapped the exact backend function name in `NavegacionService`; the existing CU26 route and service files were not changed.
- [x] CU27-04 — Run TypeScript, all Angular tests, build, diff check, and record results. Outcome: `npx tsc --noEmit -p tsconfig.app.json` passed; focused CU27 tests passed (7/7); full Angular suite passed (490/490 across 60 files); `npm run build` passed with pre-existing CSS budget warnings outside CU27; `git diff --check` passed.

## Acceptance criteria
- Only the five manual types are selectable for registration; automatic types are history-only.
- POST sends only `lote_id`, `tipo`, `cantidad`, and optional `observaciones`.
- History uses array responses with `lote_id`, `skip`, and `limit`; no invented total endpoint or alert/global-stock API.
- Server values are displayed without client-side authoritative stock calculations.
- Tenant interceptor and dynamic RBAC navigation remain intact.

## Checks
- `npx tsc --noEmit -p tsconfig.app.json`
- Angular test suite, including CU26 tests
- `npm run build`
- `git diff --check`

## Progress
Route: delegated direct implementation after read-only contract mapping. No commits permitted by user instruction; commit evidence is intentionally not applicable.
