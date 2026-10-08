# MASTER_PROMPT_SAAS_7H_FRONTEND_ADMIN_SAAS.md

Trabaja EXCLUSIVAMENTE en:

C:\SI2_Proyecto\clinica-oftalmologica-web

Estamos en:

PASO 7H — FRONTEND ADMINISTRADOR SAAS

ANTES DE MODIFICAR:

1. Lee COMPLETOS:
   - CONTEXTO_SAAS_7H_FRONTEND_ADMIN_SAAS.md
   - MASTER_PROMPT_SAAS_7H_FRONTEND_ADMIN_SAAS.md

2. Si existe, lee:
   C:\Users\josia\.config\opencode\skills\frontend-ui-design\SKILL.md

3. Inspecciona:
   - app.routes.ts
   - auth services
   - guards
   - interceptors
   - environments
   - layouts/sidebar
   - patrón visual actual

==================================================
OBJETIVO
==================================================

Crear frontend SaaS Admin completamente separado del admin clínico.

Backend disponible:

POST  /saas/auth/login
GET   /saas/empresas
GET   /saas/empresas/{empresa_id}
GET   /saas/planes
GET   /saas/suscripciones
GET   /saas/tenants
GET   /saas/provisionamientos
GET   /saas/bitacora
PATCH /saas/empresas/{empresa_id}/estado
PATCH /saas/suscripciones/{suscripcion_id}/estado

Inspecciona OpenAPI/código backend si necesitas confirmar contratos exactos.
NO inventar payloads.

==================================================
1. AUTENTICACIÓN SEPARADA
==================================================

Crear almacenamiento separado para SaaS token.

Ejemplo:
saas_access_token

NO reutilizar token clínico.

Crear:

SaasAuthService
saasAuthGuard

Token esperado:
token_type = saas_admin

El backend sigue siendo autoridad.

==================================================
2. INTERCEPTOR
==================================================

Audita el interceptor actual.

Debe quedar:

/saas/* → Authorization Bearer <saas token>

endpoints clínicos → token clínico actual

POST /saas/auth/login → sin token obligatorio

NO adjuntar ambos tokens.

NO romper frontend clínico.

==================================================
3. RUTAS
==================================================

Crear preferentemente:

/saas/login
/saas
/saas/empresas
/saas/planes
/saas/suscripciones
/saas/tenants
/saas/provisionamientos
/saas/bitacora

Usar layout SaaS propio.

==================================================
4. LOGIN
==================================================

Pantalla profesional:

Administrador SaaS

Campos:
- correo
- contraseña

NO empresa.

HTTP 200:
guardar SaaS token
redirigir /saas

Errores claros.

No almacenar password.

==================================================
5. DASHBOARD
==================================================

Mostrar datos REALES:

- empresas totales
- empresas activas
- tenants activos
- suscripciones activas
- planes
- provisionamientos con error

No hardcodear métricas.

==================================================
6. EMPRESAS
==================================================

Mostrar:

- nombre
- código
- slug
- estado
- plan
- suscripción
- database_name
- tenant estado
- version_schema
- fecha_provisionamiento

Acciones:
- Ver detalle
- Suspender
- Reactivar

Usar modal de confirmación antes de PATCH.

Refrescar tras éxito.

==================================================
7. PLANES
==================================================

Crear vista usando contrato real.

No inventar propiedades.

==================================================
8. SUSCRIPCIONES
==================================================

Crear vista.

Mostrar campos reales.

Permitir cambio de estado solo según contrato backend.

Confirmar antes de PATCH.

==================================================
9. TENANTS
==================================================

Mostrar metadata únicamente:

- empresa
- database_name
- estado
- version_schema
- fechas

NO datos clínicos.

==================================================
10. PROVISIONAMIENTOS
==================================================

Mostrar:

- empresa
- estado
- paso
- intentos
- fechas
- mensaje_error saneado

Estados visuales claros.

==================================================
11. BITÁCORA
==================================================

Mostrar metadata real de saas_bitacora.

No mostrar secrets.

==================================================
12. DISEÑO
==================================================

Usa frontend-ui-design skill si está disponible.

Debe verse claramente como:

PLATAFORMA SAAS
≠
CLÍNICA TENANT

Diseño responsive, profesional y consistente.

Auditar:

360
390
480
768
820
1024
1440

==================================================
13. ERRORES
==================================================

401:
- limpiar SOLO SaaS token
- redirigir /saas/login

NO borrar token clínico por un 401 SaaS.

403:
mensaje de acceso denegado.

5xx:
mensaje genérico.

==================================================
14. TESTS
==================================================

Cubrir:

- login SaaS
- token separado
- guard SaaS
- token clínico rechazado por flujo SaaS
- interceptor SaaS
- interceptor clínico intacto
- dashboard
- empresas
- planes
- suscripciones
- tenants
- provisionamientos
- bitácora
- suspender/reactivar
- modal
- logout
- 401 SaaS limpia solo SaaS token
- sin secrets

Ejecutar los comandos reales del proyecto:

tests
build
typecheck si existe

git diff --check

==================================================
NO HACER
==================================================

NO:
- ejecutar bootstrap SaaS real
- modificar backend sin bug real
- backup/restore
- realtime
- migrar routers clínicos
- cambiar login clínico
- tocar tenant DBs
- commit
- push
- merge

==================================================
REPORTE FINAL
==================================================

Entrega:

1. ESTADO
2. ARCHIVOS CREADOS
3. ARCHIVOS MODIFICADOS
4. RUTAS
5. LOGIN SAAS
6. STORAGE TOKEN
7. GUARD
8. INTERCEPTOR
9. LAYOUT
10. DASHBOARD
11. EMPRESAS
12. PLANES
13. SUSCRIPCIONES
14. TENANTS
15. PROVISIONAMIENTOS
16. BITÁCORA
17. SUSPENDER/REACTIVAR
18. RESPONSIVE
19. ACCESIBILIDAD
20. TESTS
21. BUILD
22. GIT STATUS

Confirma:
- login clínico intacto
- token clínico separado
- no secrets
- no backend modificado salvo bug real documentado
- no commit/push/merge
