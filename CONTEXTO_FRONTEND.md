# CONTEXTO DEL PROYECTO — FRONTEND

## 1. Proyecto

**Nombre:** Centro Oftalmológico Visión Clara  
**Tipo:** Sistema de información web y móvil para una clínica oftalmológica.  
**Frontend web:** Angular  
**Backend:** FastAPI  
**Base de datos:** PostgreSQL alojado en Supabase  
**Aplicación móvil:** Flutter

Este archivo existe para dar contexto a la IA utilizada dentro de VS Code. Antes de modificar código, la IA debe respetar la arquitectura existente del proyecto y reutilizar componentes, servicios, guards, interceptors, modelos y estilos ya creados.

---

## 2. Arquitectura general

```text
Angular Web
    |
    | HTTP/JSON
    v
FastAPI
    |
    | SQLAlchemy + Psycopg
    v
PostgreSQL / Supabase
```

### Regla importante

El frontend **NO se conecta directamente a PostgreSQL ni a Supabase**.

Todas las operaciones deben pasar por la API FastAPI.

No colocar en Angular:

- `DATABASE_URL`
- contraseña de Supabase
- credenciales administrativas
- lógica SQL
- acceso directo a tablas PostgreSQL

---

## 3. Tecnologías principales

- Angular 21.x
- TypeScript 5.9.x
- RxJS
- Angular Router
- HttpClient
- Guards
- Interceptors
- Servicios Angular
- HTML / CSS / TypeScript

---

## 4. Convención crítica de carpetas

La carpeta global del proyecto debe llamarse:

```text
src/app/core/
```

Siempre en minúscula.

NO usar:

```text
src/app/Core/
```

Windows puede tolerar diferencias de mayúsculas/minúsculas, pero TypeScript/Angular genera errores `TS1261`.

Ejemplo correcto:

```ts
import { authInterceptor } from './core/interceptors/auth.interceptor';
```

Incorrecto:

```ts
import { authInterceptor } from './Core/interceptors/auth.interceptor';
```

Todos los imports deben mantener exactamente el mismo casing.

---

## 5. Organización funcional

El sistema está dividido en los siguientes módulos:

```text
Autenticación y Seguridad
Agenda y Citas
Inventario y Proveedores
Paciente e Historial Clínico
Pagos
Reportes
Notificaciones / Interacción / Chatbot
```

La estructura frontend debe seguir una separación similar por funcionalidades.

Ejemplo conceptual:

```text
src/app/
├── core/
│   ├── guards/
│   ├── interceptors/
│   ├── layouts/
│   ├── models/
│   └── services/
│
├── features/
│   ├── autenticacion-seguridad/
│   ├── pacientes/
│   ├── agenda-citas/
│   ├── historial-clinico/
│   ├── inventario-proveedores/
│   ├── pagos/
│   └── reportes/
│
├── app.config.ts
├── app.routes.ts
└── ...
```

No reorganizar carpetas sin una razón concreta.

---

## 6. Casos de uso iniciales

Los primeros casos de uso del sistema son:

```text
CU01 - Iniciar sesión
CU02 - Cerrar sesión
CU03 - Recuperar contraseña
CU04 - Gestionar usuarios
CU05 - Gestionar roles y permisos
CU06 - Consultar bitácora del sistema
CU07 - Gestionar pacientes
```

El trabajo actual está centrado inicialmente en estos casos.

---

## 7. API disponible actualmente

Backend local:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Endpoints que actualmente se han preparado:

```text
GET    /seguridad/usuarios
POST   /seguridad/usuarios
GET    /seguridad/usuarios/{usuario_id}

GET    /seguridad/roles
POST   /seguridad/roles
POST   /seguridad/usuarios/asignar-rol

GET    /seguridad/bitacora

GET    /pacientes
POST   /pacientes
GET    /pacientes/{paciente_id}
PUT    /pacientes/{paciente_id}
DELETE /pacientes/{paciente_id}
```

JWT para CU01 y recuperación de contraseña CU03 todavía deben integrarse completamente antes de considerarlos terminados.

---

## 8. Modelo de Paciente

Información manejada actualmente:

```text
id
usuario_id (opcional)
nombres
apellidos
ci
fecha_nacimiento
sexo
telefono
contacto_emergencia
fecha_registro
direccion
estado
```

Un paciente puede existir aunque todavía no tenga una cuenta de usuario.

---

## 9. Autenticación

La autenticación debe ser gestionada por FastAPI.

Flujo esperado:

```text
Formulario Angular
      |
      | correo + contraseña
      v
POST endpoint de login FastAPI
      |
      v
validación de contraseña
      |
      v
JWT
      |
      v
Angular almacena/usa el token
      |
      v
authInterceptor
```

El `authInterceptor` será responsable de adjuntar el token a las solicitudes protegidas.

Los guards deben controlar navegación, pero **la autorización real siempre debe validarse también en backend**.

---

## 10. Menú lateral

Existe un layout/sidebar dentro de `core/layouts/sidebar`.

Objetivo general:

- mostrar módulos disponibles
- mostrar funciones permitidas por rol
- mantener navegación consistente
- permitir expansión/contracción del sidebar
- contener el logo y nombre del Centro Oftalmológico Visión Clara

Cuando el backend exponga permisos/menú dinámico, Angular debe consumirlos mediante un servicio, no escribir permisos de forma fija en cada componente.

---

## 11. Reglas para servicios Angular

Cada feature debe usar servicios para comunicarse con FastAPI.

Ejemplo:

```text
Componente
    |
    v
Service Angular
    |
    v
HttpClient
    |
    v
FastAPI
```

Evitar llamadas HTTP directamente dispersas en muchos componentes.

Los modelos/interfaces TypeScript deben representar los DTO enviados/recibidos por la API.

---

## 12. Manejo de errores

El frontend debe contemplar respuestas comunes:

```text
400 -> solicitud inválida
401 -> credenciales/token inválido
403 -> acceso no autorizado
404 -> recurso no encontrado
409 -> dato duplicado/conflicto
422 -> error de validación
500 -> error interno
```

Mostrar mensajes entendibles al usuario y no mostrar stack traces.

---

## 13. Diseño visual

Identidad actual:

**Centro Oftalmológico Visión Clara**

Orientación visual:

- profesional
- clínica
- limpia
- predominio de azul/celeste
- interfaz clara y moderna
- responsive
- evitar diseños excesivamente cargados

La Landing Page y el sistema administrativo pertenecen al mismo proyecto, pero las funcionalidades internas deben priorizar usabilidad sobre elementos decorativos.

---

## 14. Comandos útiles

Instalar dependencias después de traer cambios:

```bash
npm install
```

Si existe un `package-lock.json` válido y se quiere reproducir exactamente las dependencias:

```bash
npm ci
```

Verificar TypeScript:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Levantar Angular:

```bash
npx ng serve
```

Aplicación:

```text
http://localhost:4200
```

---

## 15. Reglas que debe seguir la IA

Antes de generar código:

1. Revisar la estructura existente.
2. No crear una arquitectura paralela.
3. Reutilizar `core`, guards, interceptors, layouts, modelos y servicios existentes.
4. Mantener nombres y rutas en minúscula cuando corresponda.
5. No usar `Core` y `core` al mismo tiempo.
6. No conectar Angular directamente con Supabase.
7. Consumir FastAPI mediante servicios.
8. No hardcodear contraseñas, tokens ni URLs privadas.
9. Mantener separación por features.
10. Evitar modificar archivos de otros casos de uso si no es necesario.
11. Si una funcionalidad requiere un endpoint que aún no existe, indicarlo antes de inventar respuestas falsas.
12. Mantener compatibilidad con los endpoints y DTO reales del backend.
13. No eliminar funcionalidad existente sin explicar el motivo.
14. Implementar cada caso de uso de forma incremental y comprobable.
15. Antes de finalizar un cambio, verificar imports y ejecutar compilación TypeScript.

---

## 16. Flujo recomendado para desarrollar un caso de uso

```text
1. Identificar el CU
2. Revisar endpoint/backend correspondiente
3. Definir interfaces/modelos TypeScript
4. Crear o reutilizar service
5. Crear página/componente
6. Añadir rutas
7. Aplicar guard si corresponde
8. Conectar formulario con API
9. Manejar validaciones y errores
10. Probar integración
11. Ejecutar npx tsc -p tsconfig.app.json --noEmit
12. Ejecutar npx ng serve
```

---

## 17. Instrucción final para la IA

Cuando se solicite implementar un caso de uso, primero indicar:

- archivos existentes que se reutilizarán
- archivos que se crearán/modificarán
- endpoint necesario
- flujo de datos
- posibles dependencias con otros CU

Después realizar cambios respetando este contexto.
