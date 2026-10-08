# CONTEXTO_CU11_FRONT.md

# CU11 — Configurar disponibilidad del oftalmólogo
## Contexto de desarrollo Frontend Web

### 1. Proyecto y repositorio

Repositorio oficial frontend:
https://github.com/dilom21/clinica-oftalmologica-web.git

Tecnología:
- Angular
- componentes standalone
- signals
- HttpClient
- JWT vía interceptor existente
- sidebar/menu dinámico desde backend

Este trabajo corresponde únicamente a:
**CU11 — Configurar disponibilidad del oftalmólogo (Web)**

No desarrollar CU10 ni funcionalidades móviles.

---

## 2. Estado previo obligatorio

CU09 Web ya está implementado y funcionando.

Antes de modificar:
1. leer MASTER_PROMPT.md;
2. leer este CONTEXTO_CU11_FRONT.md;
3. revisar git status;
4. inspeccionar cambios locales no commiteados;
5. preservar CU09;
6. reutilizar layouts, styles, AuthService, Sidebar, MenuService y patrones existentes.

No asumir que GitHub refleja exactamente todo el estado local.

---

## 3. Estructura actual relevante

CU09 se encuentra bajo:

`src/app/features/agenda-citas/casos-uso/cu09-consultar-agenda-disponibilidad/`

Usa:
- componente standalone;
- signals;
- AuthService;
- Sidebar;
- manejo de loading/error/vacío;
- estilos responsive;
- HttpClient mediante service;
- helpers de rol desde JWT;
- menu dinámico filtrado por backend.

CU11 debe seguir el mismo estilo general, pero en una carpeta propia:

`src/app/features/agenda-citas/casos-uso/cu11-configurar-disponibilidad/`

No mezclar CU11 dentro de los archivos del CU09 salvo reutilización estrictamente necesaria.

---

## 4. Seguridad y roles

El backend es la fuente real de autorización.

La Función 12 es:
`Configurar disponibilidad del oftalmólogo`

Configuración prevista:
- Administrador → AMBAS
- Oftalmólogo → AMBAS
- Recepcionista → sin permiso
- Paciente → sin permiso

El frontend solo adapta la experiencia.

IDs actuales disponibles en AuthService/auth.models:
- Administrador = 1
- Oftalmólogo = 2
- Recepcionista = 3
- Paciente = 4

No usar frontend como mecanismo de seguridad.

---

## 5. Menú

El backend `/seguridad/menu` ya devuelve únicamente funciones permitidas por rol y cada función incluye:
- id
- nombre
- accion_id
- accion_nombre

Agregar en Sidebar el mapeo:

`configurar disponibilidad del oftalmólogo` → `/configurar-disponibilidad`

No crear listas paralelas de permisos.

Si Recepcionista/Paciente no reciben la Función 12 desde backend, no debe aparecer en su sidebar.

---

## 6. Backend CU11 ya implementado

Prefijo:
`/agenda-citas/configuracion`

Endpoints:

GET
`/agenda-citas/configuracion/oftalmologos`

GET
`/agenda-citas/configuracion/oftalmologos/{id}`

POST
`/agenda-citas/configuracion/oftalmologos/{id}/horarios`

PUT
`/agenda-citas/configuracion/oftalmologos/{id}/horarios/{horario_id}`

PATCH
`/agenda-citas/configuracion/oftalmologos/{id}/horarios/{horario_id}/estado`

POST
`/agenda-citas/configuracion/oftalmologos/{id}/bloqueos`

PUT
`/agenda-citas/configuracion/oftalmologos/{id}/bloqueos/{bloqueo_id}`

PATCH
`/agenda-citas/configuracion/oftalmologos/{id}/bloqueos/{bloqueo_id}/estado`

GET requiere LECTURA.
POST/PUT/PATCH requieren ESCRITURA.
AMBAS satisface ambas.

---

## 7. MUY IMPORTANTE — contrato real del backend

Antes de crear interfaces TypeScript:
- inspeccionar el backend LOCAL actual de CU11 si está accesible;
- revisar `app/modules/gestion_agenda_citas/schemas/schemas.py`;
- revisar `api/router.py`;
- revisar OpenAPI real de FastAPI.

NO inventar nombres de propiedades ni payloads.

Si el backend local está en otro repositorio y no puede leerse directamente desde el workspace:
- levantar el backend;
- consultar `/openapi.json` o `/docs`;
- construir interfaces exactas a partir del contrato real.

El reporte backend confirma que el GET de configuración devuelve:
- oftalmólogo;
- horarios;
- bloqueos;
incluyendo registros activos e inactivos.

Pero los nombres exactos de campos deben salir del backend real, no de supuestos.

---

## 8. Experiencia de usuario por rol

### Administrador

Debe poder:
- seleccionar cualquier oftalmólogo configurable;
- cargar su configuración;
- ver horario semanal;
- crear horario;
- editar horario;
- activar/desactivar horario;
- ver bloqueos;
- crear bloqueo;
- editar bloqueo;
- activar/desactivar bloqueo.

### Oftalmólogo

Backend devuelve únicamente su propio registro configurable.

Frontend:
- autoseleccionar su registro;
- no permitir elegir otro oftalmólogo;
- puede mostrar título como `Mi disponibilidad`;
- puede realizar las mismas operaciones CRUD lógicas sobre sus propios horarios/bloqueos.

### Recepcionista / Paciente

No deben recibir Función 12 desde `/seguridad/menu`.

Si acceden manualmente a la ruta:
- backend responderá 403;
- frontend debe manejarlo correctamente;
- no intentar bypass.

---

## 9. Pantalla sugerida

Ruta Angular:
`/configurar-disponibilidad`

Título:
`Configurar disponibilidad del oftalmólogo`

Para Oftalmólogo puede adaptarse visualmente a:
`Mi disponibilidad`

Se recomienda una vista con:

### Cabecera
- módulo Agenda y Citas
- título
- subtítulo por rol

### Selector de oftalmólogo
Administrador:
- selector habilitado.

Oftalmólogo:
- su registro autoseleccionado;
- selector oculto o deshabilitado.

### Horario semanal
Mostrar días:
- Lunes
- Martes
- Miércoles
- Jueves
- Viernes
- Sábado
- Domingo

Cada intervalo debe mostrar:
- hora inicio;
- hora fin;
- estado activo/inactivo;
- editar;
- activar/desactivar.

Botón:
`Agregar horario`

Formulario/modal:
- día de semana;
- hora inicio;
- hora fin.

No inventar slots de duración fija.

### Bloqueos
Mostrar:
- fecha;
- hora inicio;
- hora fin;
- motivo;
- estado;
- editar;
- activar/desactivar.

Botón:
`Agregar bloqueo`

Formulario/modal:
- fecha;
- hora inicio;
- hora fin;
- motivo.

---

## 10. Reglas que frontend debe reflejar

El backend ya valida las reglas. El frontend puede prevenir errores obvios, pero nunca reemplazar validación backend.

### Horarios
- día 1..7;
- hora_inicio < hora_fin;
- no solapamientos;
- contiguos permitidos;
- modificación/desactivación puede devolver 409 si deja citas futuras sin cobertura.

### Bloqueos
- fecha no pasada;
- hora_inicio < hora_fin;
- debe intersectar horario activo;
- no solapamiento con bloqueo activo;
- conflicto con cita no CANCELADA → 409.

No cancelar ni reprogramar citas desde CU11.

---

## 11. Manejo de 409

CU11 tiene varios conflictos de negocio.

Cuando backend devuelva 409:
- mostrar `detail` del backend si existe;
- mantener modal/formulario abierto cuando corresponda;
- no borrar datos introducidos;
- permitir corregir o cancelar.

Ejemplos:
- horario solapado;
- cambio de horario que deja citas fuera;
- bloqueo solapado;
- bloqueo sobre cita existente;
- reactivación inválida.

No convertir 409 en mensaje genérico de servidor.

---

## 12. Estados de UI

Manejar:
- carga inicial;
- lista de oftalmólogos vacía;
- carga de configuración;
- error;
- guardando;
- actualizando;
- éxito;
- confirmación antes de activar/desactivar;
- configuración sin horarios;
- configuración sin bloqueos.

Evitar dobles envíos mientras una operación está procesándose.

---

## 13. Estado activo/inactivo

No eliminar físicamente desde UI.

Usar endpoints PATCH de estado.

Texto sugerido:
- `Desactivar`
- `Reactivar`

Usar confirmación antes de cambiar estado.

Registros inactivos deben seguir siendo visibles porque backend los devuelve en la configuración.

Diferenciarlos visualmente sin romper accesibilidad.

---

## 14. Integración con CU09

CU11 configura datos que CU09 consume.

No llamar endpoints CU09 para guardar configuración.

No modificar el algoritmo CU09.

Tras una operación exitosa CU11:
- refrescar configuración desde backend;
- no mantener estados locales potencialmente inconsistentes si una recarga es simple.

No es obligatorio refrescar automáticamente la pantalla CU09 porque es otra ruta/caso de uso.

---

## 15. Services y models

Crear models y service propios de CU11 siguiendo el patrón del proyecto.

Ejemplo de ubicación:

`.../cu11-configurar-disponibilidad/models/configuracion-disponibilidad.models.ts`

`.../cu11-configurar-disponibilidad/services/configuracion-disponibilidad.service.ts`

Pero usar nombres coherentes con el repositorio.

No meter métodos CU11 dentro de AgendaService de CU09 salvo que tras inspección exista una razón arquitectónica clara.

---

## 16. Componentes

Mantener componentes standalone.

Si la pantalla crece demasiado, separar componentes reutilizables, por ejemplo:
- horario-semanal;
- horario-modal;
- bloqueos-list;
- bloqueo-modal;
- confirmación estado.

No sobrefragmentar si no aporta claridad.

---

## 17. Diseño

Reutilizar:
- Sidebar existente;
- header/hamburger/logout;
- variables CSS del sistema;
- patrón visual de CU09/CU06/CU07;
- responsive actual.

No rediseñar todo el sistema.

Desktop, tablet y móvil web deben ser utilizables.

---

## 18. Manejo de errores

401:
- sesión inválida/expirada.

403:
- sin permiso para configurar disponibilidad.

404:
- oftalmólogo/horario/bloqueo no encontrado.

409:
- conflicto de negocio; mostrar detail.

422:
- validación.

500:
- servidor.

0:
- conexión.

Extraer `error.detail` cuando sea string.

---

## 19. Ruta

Registrar lazy route con authGuard:

`/configurar-disponibilidad`

No crear guard de roles nuevo si el proyecto no lo necesita:
- el menú filtra;
- el backend autoriza.

---

## 20. Pruebas/verificación

Ejecutar:
`npm run build`

Corregir:
- TypeScript;
- templates;
- imports;
- lazy route.

Si existen warnings CSS preexistentes:
- reportarlos;
- no hacer refactor global fuera de CU11.

Si existen tests frontend configurados, ejecutar los relevantes sin introducir infraestructura nueva innecesariamente.

---

## 21. Restricciones

NO:
- conectar Angular directo a Supabase;
- modificar `.env`;
- modificar CORS;
- tocar backend;
- desarrollar CU10;
- desarrollar móvil;
- rehacer CU09;
- commit;
- push;
- merge.

---

## 22. Archivos IA — NO VERSIONAR

No subir:
- MASTER_PROMPT.md
- CONTEXTO_CU11_FRONT.md
- cualquier CONTEXTO_CU*.md
- archivos equivalentes de contexto/prompt IA.

No borrarlos localmente.
No agregarlos al staging.

---

## 23. Reporte final

Entregar:

1. archivos creados/modificados;
2. ruta Angular;
3. services/endpoints consumidos;
4. comportamiento Administrador;
5. comportamiento Oftalmólogo;
6. horarios: crear/editar/estado;
7. bloqueos: crear/editar/estado;
8. manejo 409;
9. cambios de sidebar/menu;
10. resultado de npm run build;
11. pendientes;
12. git status;
13. confirmar que CONTEXTO/MASTER_PROMPT no fueron staged;
14. confirmar que no hubo commit/push/merge.
