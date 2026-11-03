# Provider integration boundary

## Active implementation

Austin is the definitive active implementation for CU28. The single guarded
`/proveedores` route lazy-loads:

`features/gestion-inventario-proveedores/casos-uso/casos-uso/cu25_gestionar_proveedores/gestion-proveedores`

The navigation service retains exactly one `gestionar proveedores` mapping to
`/proveedores`. The CU26 and CU27 routes remain unchanged.

## Confirmed HTTP contract

Austin is integrated with the confirmed backend contract from `main` revision
`1d932e1c77`:

- `GET /proveedores/?pagina={page}&estado={boolean}&buscar={term}` returns a
  paginated envelope with `items`, `total`, `pagina`, and `tamanio`.
- `GET /proveedores/{id}` returns the provider detail.
- `POST /proveedores/` creates a provider and returns an operation envelope with
  `mensaje` and `proveedor`.
- `PUT /proveedores/{id}` updates provider fields and returns the same operation
  envelope. Reactivation uses `estado=true`.
- `DELETE /proveedores/{id}?confirmar=true` performs the confirmed logical
  deactivation.

The authenticated tenant context is supplied by the existing authentication
interceptor. The UI enables read operations for `LECTURA` and `AMBAS`, and
write operations for `ESCRITURA` and `AMBAS`; the backend remains authoritative
for authorization.

## Historical implementation

The Quisbert implementation remains preserved in the repository at:

`features/gestion-inventario-proveedores/casos-uso/cu28-gestionar-proveedores/pages/gestion-proveedores/gestion-proveedores`

It is retained as integration history only. It has no active route, navigation
link, or active-flow import. Its files and historical tests have not been
deleted.

## Static integration audit

The final frontend-only review found no demonstrated incompatibility requiring
changes outside CU28:

- CU26 and CU27 keep their existing `/inventario-proveedores` contracts and
  guarded routes.
- CU30 keeps its `/inventario-alertas` route, tenant interceptor, and explicit
  read/combined permission checks.
- CU31 keeps its payment and receipt endpoints and notification-state handling.
- CU32/CU33 keep their plans, instalments, confirmation, rejection, and payment
  attempt routes and tests.
- SaaS continues to use its separate token and `saasAuthGuard`; clinical
  authentication continues to use the tenant token and `authGuard`.
- Sidebar and authenticated home build links only from the backend menu, so
  `Gestionar proveedores` can produce one `/proveedores` entry and is not a
  second hard-coded card.

Static inspection cannot prove live tenant isolation, backend permission
responses, or the availability of every CU30/CU32/CU33 endpoint in a deployed
environment. Those require an isolated backend test environment and valid test
tenants; no live HTTP test was run against a real database during this change.
