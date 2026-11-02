# Provider integration boundary

The active `/proveedores` route retains the validated CU28 Quisbert component at:

`features/gestion-inventario-proveedores/casos-uso/cu28-gestionar-proveedores/pages/gestion-proveedores/gestion-proveedores`

The navigation service keeps one `gestionar proveedores` mapping to `/proveedores`. CU26 and CU27 routes remain unchanged, and the Austin provider files and tests under `casos-uso/casos-uso` are retained as inactive source for the integration boundary; they are not wired to the active route.

The HTTP client selection remains pending until the integrated backend contract is available. This document intentionally does not define or assume endpoints.
