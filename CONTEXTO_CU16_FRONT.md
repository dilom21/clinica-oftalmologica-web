# CONTEXTO_CU16_FRONT.md

## 1. Identificación

**Proyecto:** Clínica Oftalmológica  
**Sprint:** Sprint 2  
**Caso de uso:** CU16 – Registrar diagnóstico  
**Capa:** Frontend Web  
**Tecnología:** Angular  
**Repositorio objetivo:** `C:\SI2_Proyecto\clinica-oftalmologica-web`

> Este documento define el contexto funcional y técnico para implementar el frontend del CU16. La IA debe inspeccionar primero el estado LOCAL del repositorio, porque puede contener cambios todavía no enviados a GitHub.

---

## 2. Estado previo confirmado

CU15 está cerrado en backend y frontend.

El frontend CU15 ya implementa:

- selección de paciente sin escribir IDs;
- consulta de historial clínico;
- visualización de antecedentes;
- selección de cita válida o consulta sin cita;
- registro de consulta clínica;
- ruta y sidebar dinámico;
- manejo de errores;
- tests y build.

CU16 debe reutilizar esos patrones y NO duplicarlos innecesariamente.

---

## 3. Backend CU16 confirmado

CU16 Backend está COMPLETO.

Endpoints disponibles:

```http
POST /historial-clinico/consultas/{consulta_id}/diagnosticos
GET  /historial-clinico/consultas/{consulta_id}/diagnosticos
```

Además existe:

```http
GET /historial-clinico/consultas
GET /historial-clinico/consultas/{consulta_id}
```

El listado de consultas ya permite filtros en el backend actual; inspeccionar el contrato LOCAL antes de usarlo.

---

## 4. Actor principal

**Oftalmólogo**

La autorización real permanece en backend:

```text
JWT
→ Usuario
→ permiso "Registrar diagnóstico"
→ Oftalmólogo activo
→ Consulta clínica propia
```

El frontend NO debe enviar `oftalmologo_id`.

---

## 5. Permiso ya configurado

Supabase ya posee:

```text
Registrar diagnóstico
```

Permisos:

```text
Oftalmólogo   → ESCRITURA
Administrador → AMBAS
```

El sidebar dinámico debe mapear esta función a la ruta del CU16.

---

## 6. Contrato de creación

Endpoint:

```http
POST /historial-clinico/consultas/{consulta_id}/diagnosticos
```

Body:

```json
{
  "nombre": "Miopía",
  "descripcion": "Miopía bilateral leve."
}
```

NO enviar:

```text
consulta_clinica_id
oftalmologo_id
usuario_id
estado
fecha_diagnostico
```

porque `consulta_id` viaja en la URL y el resto lo controla el backend.

---

## 7. Respuesta esperada

La respuesta real debe inspeccionarse en los modelos backend/contrato utilizado localmente. Conceptualmente contiene:

```text
id
consulta_clinica_id
nombre
descripcion
fecha_diagnostico
estado
```

No inventar campos.

---

## 8. Relación de datos

CU16 trabaja sobre una consulta clínica existente:

```text
Paciente
→ Historial clínico
→ Consulta clínica
→ Diagnóstico
```

Relación:

```text
ConsultaClinica 1 ─── N Diagnostico
```

Una consulta puede tener varios diagnósticos.

La UI debe permitir registrar más de un diagnóstico sobre la misma consulta.

---

## 9. Flujo UX objetivo

```text
Oftalmólogo autenticado
        ↓
Menú → Registrar diagnóstico
        ↓
Buscar/seleccionar paciente
        ↓
Mostrar historial clínico/resumen
        ↓
Mostrar consultas clínicas del paciente
        ↓
Seleccionar una consulta
        ↓
Mostrar datos principales de la consulta
        ↓
Mostrar diagnósticos ya registrados
        ↓
Completar:
- nombre del diagnóstico
- descripción
        ↓
Registrar diagnóstico
        ↓
201 éxito
        ↓
Actualizar listado de diagnósticos
        ↓
Permitir registrar otro diagnóstico
```

Nunca pedir al usuario que escriba manualmente `consulta_id`.

---

## 10. Selección de paciente

Reutilizar los services y patrones ya implementados en:

- CU07;
- CU13;
- CU15.

La UI debe buscar/seleccionar paciente por datos humanos:

- nombres;
- apellidos;
- CI;

o el mecanismo real existente en el frontend.

No duplicar `PacientesService` si ya existe.

---

## 11. Selección de consulta

Después de seleccionar paciente:

1. obtener las consultas clínicas de ese paciente usando el endpoint/service existente;
2. mostrarlas en una lista clara;
3. permitir seleccionar una consulta;
4. no pedir ID manual.

Mostrar datos útiles, por ejemplo:

- fecha;
- motivo;
- oftalmólogo;
- cita asociada si existe;
- anamnesis resumida;
- estado.

El frontend NO necesita conocer el `oftalmologo_id` actual. El backend rechazará consultas ajenas con 403.

Si el endpoint de listados devuelve consultas ajenas debido al alcance del permiso de lectura, mantener la seguridad en backend y mostrar el 403 funcionalmente si se intenta registrar sobre una ajena.

---

## 12. Diagnósticos existentes

Al seleccionar una consulta, usar:

```http
GET /historial-clinico/consultas/{consulta_id}/diagnosticos
```

Mostrar los diagnósticos activos existentes.

Esto permite al oftalmólogo:

- saber qué ya fue registrado;
- agregar diagnósticos adicionales;
- no perder contexto.

NO bloquear automáticamente un diagnóstico repetido: la regla backend permite múltiples diagnósticos y no existe UNIQUE por nombre.

---

## 13. Formulario

Campos:

### nombre

- obligatorio;
- trim;
- mínimo 1;
- máximo 150 caracteres;
- mostrar contador si encaja con el diseño.

### descripcion

- opcional;
- textarea;
- texto libre.

No agregar:

- CIE-10;
- tipo;
- principal/secundario;
- presuntivo/definitivo;

porque la BD y el backend actual no los soportan todavía.

---

## 14. Estados de interfaz

Debe contemplar:

- carga de pacientes;
- paciente seleccionado;
- carga de consultas;
- paciente sin consultas;
- consulta seleccionada;
- carga de diagnósticos;
- sin diagnósticos;
- enviando;
- éxito;
- error.

Evitar doble submit.

---

## 15. Manejo de errores

Reutilizar el patrón global del proyecto.

Casos relevantes:

### 401
sesión inválida/expirada.

### 403
- usuario sin permiso;
- usuario no corresponde al oftalmólogo;
- consulta pertenece a otro oftalmólogo.

### 404
consulta inexistente/inactiva.

### 422
payload inválido.

### 500
fallo inesperado.

Mostrar `detail` de FastAPI cuando sea un texto funcional apropiado.

No mostrar JSON crudo, SQL ni stack traces.

---

## 16. Sidebar y navegación

Agregar el mapeo:

```text
registrar diagnóstico
→ /registrar-diagnostico
```

Ruta preferida:

```text
/registrar-diagnostico
```

Antes de crearla, revisar convención LOCAL de `app.routes.ts`.

Debe usar `authGuard`.

No crear un ítem estático fuera del menú dinámico.

---

## 17. Arquitectura sugerida

```text
src/app/features/gestion-historial-clinico/casos-uso/
└── cu16-registrar-diagnostico/
    ├── models/
    │   └── diagnostico.models.ts
    ├── services/
    │   └── diagnostico.service.ts
    └── pages/
        └── registrar-diagnostico/
            ├── registrar-diagnostico.ts
            ├── registrar-diagnostico.html
            └── registrar-diagnostico.css
```

Crear `components/` solo si aporta valor real.

---

## 18. Reutilización obligatoria

Inspeccionar y reutilizar cuando corresponda:

- `PacientesService`;
- `HistorialClinicoService`;
- `ConsultaClinicaService` de CU15;
- services de citas si son útiles;
- modelos existentes;
- `authInterceptor`;
- `authGuard`;
- sidebar;
- estilos;
- banners/mensajes existentes;
- utilidades de error.

No duplicar lógica ya resuelta.

---

## 19. Integración con CU15

CU16 debe poder trabajar con consultas creadas por CU15.

Idealmente el usuario puede:

```text
registrar consulta en CU15
→ luego navegar a CU16
→ seleccionar la consulta
→ registrar diagnóstico
```

No modificar CU15 salvo reutilización mínima y segura de tipos/services.

---

## 20. Supabase

NO acceder directamente a Supabase desde Angular.

Flujo:

```text
Angular
→ FastAPI
→ PostgreSQL/Supabase
```

No poner credenciales o SQL en frontend.

---

## 21. Fuera de alcance

No implementar todavía:

- CU17;
- edición/eliminación de diagnóstico;
- CIE-10;
- tipos de diagnóstico;
- IA;
- reportes;
- móvil;
- cambios backend;
- cambios Supabase.

---

## 22. Criterios de terminado

- [ ] existe feature CU16;
- [ ] existe ruta protegida;
- [ ] sidebar reconoce `Registrar diagnóstico`;
- [ ] paciente se selecciona sin ID manual;
- [ ] consultas del paciente se muestran;
- [ ] consulta se selecciona sin ID manual;
- [ ] diagnósticos existentes se muestran;
- [ ] nombre obligatorio ≤ 150;
- [ ] descripción opcional;
- [ ] POST correcto;
- [ ] body no incluye `consulta_clinica_id`;
- [ ] body no incluye `oftalmologo_id`;
- [ ] listado se refresca tras 201;
- [ ] permite múltiples diagnósticos;
- [ ] loading evita doble submit;
- [ ] errores backend se muestran correctamente;
- [ ] build pasa;
- [ ] tests configurados pasan;
- [ ] no se modifica backend/Supabase/móvil.

---

## 23. Regla final

Primero inspeccionar el repositorio LOCAL.

Después implementar únicamente CU16 frontend.

No inventar endpoints ni campos.
