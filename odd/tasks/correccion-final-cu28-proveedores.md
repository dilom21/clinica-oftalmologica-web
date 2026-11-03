# Corrección final CU28 — proveedores

## Objetivo
Activar exclusivamente la implementación Austin de CU28 en la rama
`integracion/frontend-sprint3-20261102`, conservar Quisbert como historial
inactivo y verificar la integración frontend contra el contrato backend de
referencia `1d932e1c77`.

## Alcance autorizado
- Frontend únicamente; no backend, base de datos ni migraciones.
- Una sola ruta `/proveedores`, protegida por `authGuard`.
- Mantener una sola asignación de `Gestionar proveedores` a `/proveedores`.
- Preservar archivos y pruebas históricas de Quisbert.
- No commit, push, merge, reset ni modificación de `main`.

## Ruta
Delegated direct: la implementación y documentación abarcan varios archivos no
triviales; se usará un único escritor y verificaciones separadas por acción.

## Tareas
- [x] CU28-01 Cambiar `/proveedores` para cargar Austin exclusivamente y añadir
  prueba de `loadComponent` que compruebe la clase `GestionProveedores`.
- [x] CU28-02 Confirmar navegación única, sidebar/inicio sin duplicados y
  permisos LECTURA/ESCRITURA/AMBAS.
- [x] CU28-03 Actualizar documentación conservando el historial de integración.
- [x] CU28-04 Auditar estáticamente CU26, CU27, CU28, CU30, CU31, CU32, CU33,
  SaaS, autenticación y navegación; corregir solo incompatibilidades demostradas.
- [x] CU28-05 Ejecutar TypeScript, pruebas focalizadas y completas, build,
  `git diff --check` y regresión; documentar verificaciones no ejecutables.

## Aceptación y evidencia
- Austin usa el contrato paginado, `buscar`, `pagina`, `estado`, detalle,
  `confirmar=true`, respuestas envolventes y reactivación PUT.
- Quisbert permanece en el árbol sin ruta, enlace o importación del flujo activo.
- Backend `main` confirmado en `1d932e1c77` mediante consulta pública de GitHub.
- Sin operaciones Git prohibidas; el commit de trabajo queda pendiente por
  restricción explícita del usuario.

## Estado
Completado sin commit por restricción explícita del usuario. Austin está activa;
Quisbert permanece conservada e inactiva. La verificación real de backend,
aislamiento tenant y respuestas de permisos queda pendiente de un entorno de
pruebas aislado.
