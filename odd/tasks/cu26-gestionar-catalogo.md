# ODD — CU26 gestionar categorías, productos y lotes

## Objective
Implement the Angular 21 frontend for CU26 using the existing tenant-authenticated architecture and the 15 catalog endpoints.

## Authorized scope
- Frontend repository only: `C:\SI2_Proyecto\clinica-oftalmologica-web`.
- Target feature directory: `src/app/features/gestion-inventario-proveedores/casos-uso/cu26-gestionar-productos-categorias-lotes/`.
- Allowed integration files: routes and the existing dynamic navigation mapping only when required.
- Backend, database, migrations, commits, push, merge, and deployment are excluded.

## Constraints and checks
- Preserve existing Angular standalone/signal architecture and CU04 visual patterns.
- Use the existing JWT interceptor; do not add tenant identifiers or manual tokens.
- No DELETE UI or HTTP calls.
- Verify `npx tsc --noEmit -p tsconfig.app.json`, frontend unit tests, and `npm run build`.
- Keep backend error responses understandable and preserve form values after failed saves.

## Tasks
- [x] T01 — Add exact catalog models and typed HTTP service for categories, products, and lots.
- [x] T02 — Implement CU26 page, forms, tables, filters, detail/status flows, responsive styling, and feedback states.
- [x] T03 — Add protected route and dynamic navigation mapping without introducing unauthorized fixed menu entries.
- [x] T04 — Run TypeScript, unit tests, and production build; fix CU26 regressions only.

## Acceptance criteria
- All 15 endpoints have correct Angular equivalents, DTOs, methods, URLs, query parameters, and payloads.
- Categories, products, and lots can be listed, filtered, viewed, created, edited, and activated/deactivated.
- Product creation/editing respects category selection; lot creation respects active product selection; lot editing never sends `producto_id`.
- Validation covers required lengths, non-negative integer stock minimum, and coherent dates.
- Routes are guarded, navigation mapping uses the real backend function name, and no fake menu is added.
- Tests and build results are recorded honestly.

## Progress
- Exploration completed read-only; no source implementation yet.
- Implementation files created under the authorized feature directory. Service covers all 15 HTTP operations; lot update payload excludes `producto_id`.
- Verification completed: `npx.cmd tsc --noEmit -p tsconfig.app.json` passed; pertinent CU26 test passed (1 file, 4 tests); `npm.cmd run build` passed with pre-existing component CSS budget warnings.
- Blocking defect corrected: lot editing now removes the `producto_id` required validator, keeps the product selector hidden, and sends an update payload without `producto_id`; lot creation continues to require and send it. Added explicit unit coverage for editing a lot without `producto_id`.
- Verification completed: `npx.cmd tsc --noEmit -p tsconfig.app.json` passed; pertinent CU26 tests passed (2 files, 4 tests); `npm.cmd run build` passed with pre-existing component CSS budget warnings.
- Independent verification findings corrected: category name max length is 100; category/product relationships are required and null IDs are not sent; stock minimum rejects decimals; entering Lots loads active products once; save/status operations are mutually blocked and failed saves retain form values; detail dialog semantics and visible focus were improved. Added focused CU26 unit coverage for these validations and lot loading/cache behavior.
- Limitations: no real tenant smoke tests were executed; dynamic RBAC data remains an environment/integration dependency.
- Branch state observed: `dev-josias`, clean except user-provided CU26/CU27 context files.

## Next step
CU26 verification findings are corrected and verified locally; no backend/BD or Git history/remote operations were performed.
