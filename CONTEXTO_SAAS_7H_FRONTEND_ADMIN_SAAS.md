# CONTEXTO_SAAS_7H_FRONTEND_ADMIN_SAAS.md

## 1. Identificación

**Proyecto:** Clínica Oftalmológica  
**Bloque:** 7H — Frontend Administrador SaaS  
**Repositorio objetivo:** `C:\SI2_Proyecto\clinica-oftalmologica-web`

Backend SaaS ya completado:

```text
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
```

Los 7 tenants están físicamente creados y en:

```text
ACTIVA / COMPLETADO
```

Empresas:

```text
VISION-CLARA
OFTALMO-NORTE
VISUAL-ORIENTAL
INSTITUTO-VISION
OFTALMOCARE
VISTA-SUR
MEDICO-OCULAR
```

El bootstrap real del SaaS Admin todavía NO fue ejecutado. Se hará en 7I para la prueba E2E final.

---

# 2. Objetivo

Crear una interfaz Angular separada para el Administrador SaaS.

Debe permitir:

```text
login SaaS
dashboard SaaS
ver empresas
ver planes
ver suscripciones
ver tenants
ver provisionamientos
ver bitácora SaaS
suspender/reactivar empresa
cambiar estado de suscripción
logout SaaS
```

NO mezclar esta interfaz con el administrador clínico de cada tenant.

---

# 3. Separación de autenticación

La aplicación ya posee autenticación clínica.

El SaaS Admin debe usar un token SEPARADO.

Ejemplo de storage:

```text
saas_access_token
```

No reutilizar:

```text
access_token
token clínico actual
```

Inspeccionar primero el nombre real usado por el proyecto.

No romper login clínico.

---

# 4. Token SaaS

Backend emite JWT con:

```text
sub
saas_usuario_id
token_type = "saas_admin"
exp
```

El frontend puede decodificar únicamente para UX local, pero:

```text
NO confiar en el frontend para autorización real
```

El backend sigue siendo autoridad.

No mostrar el JWT.

---

# 5. Rutas sugeridas

Crear rutas separadas, por ejemplo:

```text
/saas/login
/saas
/saas/empresas
/saas/planes
/saas/suscripciones
/saas/tenants
/saas/provisionamientos
/saas/bitacora
```

Puede usarse un layout SaaS con navegación propia.

NO reutilizar el sidebar clínico si eso mezcla conceptos.

---

# 6. SaaS Auth Guard

Crear un guard específico:

```text
saasAuthGuard
```

Debe comprobar:

```text
token SaaS presente
no expirado
token_type == saas_admin
```

Si falla:

```text
redirigir a /saas/login
```

No usar el authGuard clínico.

---

# 7. Interceptor

Auditar el interceptor HTTP actual.

Problema a evitar:

```text
/saas/* recibiendo token clínico por error
```

Implementar de forma segura:

```text
requests /saas/* → SaaS token
requests clínicas → token clínico
```

Excepto:

```text
POST /saas/auth/login
```

que no requiere token.

No adjuntar ambos tokens simultáneamente.

---

# 8. Login SaaS

Pantalla separada:

```text
Administrador SaaS
```

Campos:

```text
correo
contraseña
```

No pedir empresa.

Estados UX:

```text
loading
credenciales inválidas
usuario inactivo
error de servidor
```

No guardar password.

Tras HTTP 200:

```text
guardar SaaS token
redirigir a /saas
```

---

# 9. Dashboard SaaS

Crear dashboard visual profesional.

Resumen esperado:

```text
Empresas totales
Empresas activas
Tenants activos
Suscripciones activas
Planes disponibles
Provisionamientos con error
```

Con los datos reales del backend.

No hardcodear "7" salvo tests con fixtures.

---

# 10. Empresas

Vista:

```text
/saas/empresas
```

Columnas/tarjetas:

```text
nombre
código
slug
estado empresa
plan
estado suscripción
database_name
estado tenant
version_schema
fecha_provisionamiento
```

Acciones:

```text
Suspender
Reactivar
Ver detalle
```

Antes de PATCH:

```text
modal/confirmación
```

Después:

```text
refrescar metadata
```

No apagar DB físicamente.

---

# 11. Planes

Vista:

```text
/saas/planes
```

Mostrar contrato real retornado por backend.

Como mínimo:

```text
código/nombre
estado
atributos comerciales disponibles
```

No inventar campos.

---

# 12. Suscripciones

Vista:

```text
/saas/suscripciones
```

Mostrar:

```text
empresa
plan
estado
fecha_inicio
fecha_fin
```

si existen en contrato real.

Acciones de estado únicamente según lo permitido por backend.

Confirmación antes del PATCH.

---

# 13. Tenants

Vista:

```text
/saas/tenants
```

Mostrar:

```text
empresa
database_name
estado
version_schema
fecha_provisionamiento
ultima_verificacion
```

Solo metadata.

No consultar datos clínicos.

---

# 14. Provisionamientos

Vista:

```text
/saas/provisionamientos
```

Mostrar:

```text
empresa
estado
paso_actual
intentos
fecha_inicio
fecha_fin
mensaje_error
```

Estados visuales claros:

```text
COMPLETADO
PENDIENTE
PROVISIONANDO
ERROR
```

No mostrar stack traces.

---

# 15. Bitácora SaaS

Vista:

```text
/saas/bitacora
```

Mostrar contrato real disponible:

```text
fecha
usuario SaaS
acción
entidad
id afectado
descripción
```

No mostrar secretos.

---

# 16. Diseño

Usar la skill de diseño ya instalada si está disponible:

```text
C:\Users\josia\.config\opencode\skills\frontend-ui-design\SKILL.md
```

Leerla antes de diseñar.

Objetivo visual:

```text
dashboard SaaS profesional
separado visualmente del sistema clínico
responsive
sin apariencia genérica
```

Priorizar:

```text
claridad
estado de tenants
estado de suscripciones
acciones seguras
```

---

# 17. Responsive

Auditar como mínimo:

```text
360
390
480
768
820
1024
1440 px
```

No overflow horizontal global.

Tablas pueden usar contenedor scroll horizontal cuando sea necesario.

---

# 18. Accesibilidad

Incluir:

```text
labels
focus visible
aria-label cuando aplique
botones con texto/tooltip comprensible
modal accesible
Escape cierra modal
loading/status anunciable
```

---

# 19. Errores HTTP

Manejar:

```text
401 → limpiar SaaS token y volver a /saas/login
403 → acceso denegado / mensaje
404 → recurso inexistente
409 si backend lo usa → conflicto
5xx → mensaje genérico
```

No mostrar detalles internos.

---

# 20. Models/Services

Crear modelos TypeScript basados EXACTAMENTE en contratos reales del backend.

No inventar nombres de propiedades.

Crear servicio SaaS central o servicios separados coherentes:

```text
SaasAuthService
SaasAdminService
```

---

# 21. Tests

Cubrir mínimo:

1. login SaaS correcto;
2. login inválido;
3. token SaaS separado;
4. token clínico no sirve para guard SaaS;
5. guard SaaS redirige;
6. interceptor usa token SaaS para /saas/*;
7. interceptor conserva token clínico para endpoints clínicos;
8. dashboard consume backend;
9. empresas renderizan;
10. tenants renderizan;
11. planes;
12. suscripciones;
13. provisionamientos;
14. bitácora;
15. suspensión empresa;
16. reactivación;
17. confirmación modal;
18. logout;
19. 401 limpia SaaS token;
20. no se muestran secrets.

Ejecutar tests y build.

---

# 22. No hacer

NO:

- ejecutar bootstrap SaaS real todavía;
- modificar backend salvo bug contractual comprobado;
- modificar tenant DBs;
- backup/restore;
- realtime;
- migrar routers clínicos;
- cambiar login clínico;
- commit/push/merge.

---

# 23. Criterio de cierre 7H

```text
[ ] login SaaS UI
[ ] storage SaaS separado
[ ] guard SaaS
[ ] interceptor correcto
[ ] layout SaaS
[ ] dashboard
[ ] empresas
[ ] planes
[ ] suscripciones
[ ] tenants
[ ] provisionamientos
[ ] bitácora
[ ] suspensión/reactivación UI
[ ] responsive
[ ] tests
[ ] build
```
