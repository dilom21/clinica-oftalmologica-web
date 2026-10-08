# MASTER_PROMPT_CU16_FRONT.md

## 📍 DÓNDE EJECUTAR

**Repositorio:** `clinica-oftalmologica-web`  
**Ruta:** `C:\SI2_Proyecto\clinica-oftalmologica-web`  
**Ubicación:** RAÍZ DEL REPOSITORIO FRONTEND

NO ejecutar desde:

- `C:\SI2_Proyecto`
- `clinica-oftalmologica-api`
- `clinica-oftalmologica-mobile`

# IMPLEMENTACIÓN FRONTEND — CU16 REGISTRAR DIAGNÓSTICO

Implementa completamente el frontend del **CU16 – Registrar diagnóstico**.

Antes de modificar archivos:

1. lee `CONTEXTO_CU16_FRONT.md`;
2. lee `MASTER_PROMPT_CU16_FRONT.md`;
3. inspecciona el código LOCAL actual;
4. revisa especialmente CU15 para reutilizar patrones y servicios.

No asumas que GitHub coincide con LOCAL.

## 1. RESTRICCIONES

NO modificar:

- backend;
- móvil;
- Supabase;
- `.env`;
- credenciales;
- dependencias salvo necesidad estricta.

NO:

- commit;
- push;
- merge;
- inventar endpoints;
- acceder directo a Supabase;
- agregar CIE-10;
- agregar tipo de diagnóstico;
- enviar `oftalmologo_id`;
- pedir IDs manualmente;
- crear otra autenticación.

## 2. INSPECCIÓN OBLIGATORIA

Revisar como mínimo:

```text
src/app/app.routes.ts
src/app/core/guards/
src/app/core/layouts/sidebar/
src/app/core/services/
src/app/core/models/
src/environments/

src/app/features/gestion-pacientes/
src/app/features/gestion-historial-clinico/
src/app/features/agenda-citas/
src/app/features/gestion-agenda-citas/
```

En particular localizar:

- CU07;
- CU13;
- CU15;
- services de pacientes;
- service de historial;
- `ConsultaClinicaService`;
- modelos de consulta;
- sidebar;
- interceptor JWT;
- patrón de errores;
- patrón de tests.

## 3. FEATURE

Crear, si no existe:

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

No crear archivos vacíos.

## 4. MODELOS

Crear interfaces basadas en el contrato real.

Request conceptual:

```ts
interface DiagnosticoCrear {
  nombre: string;
  descripcion?: string | null;
}
```

NO incluir:

```text
consulta_clinica_id
oftalmologo_id
usuario_id
estado
fecha_diagnostico
```

porque el `consulta_id` va en la URL.

Respuesta conceptual:

```text
id
consulta_clinica_id
nombre
descripcion
fecha_diagnostico
estado
```

Confirmar nombres reales antes de implementar.

## 5. SERVICE

Implementar:

```http
POST /historial-clinico/consultas/{consulta_id}/diagnosticos
GET  /historial-clinico/consultas/{consulta_id}/diagnosticos
```

Métodos conceptuales:

```ts
registrarDiagnostico(consultaId, datos)
listarDiagnosticos(consultaId)
```

Usar:

- HttpClient;
- environment/api config actual;
- authInterceptor existente.

No añadir Authorization manual si ya existe interceptor.

## 6. PACIENTE

Reutilizar `PacientesService`/patrón existente.

No pedir `paciente_id` manual.

Permitir buscar/seleccionar paciente de forma similar a CU15.

## 7. CONSULTAS CLÍNICAS

Después de seleccionar paciente:

- reutilizar `ConsultaClinicaService` o endpoint existente;
- listar consultas clínicas correspondientes al paciente;
- no pedir `consulta_id` manual;
- mostrar datos útiles de cada consulta.

Si `ConsultaClinicaService` de CU15 solo implementa POST, puedes ampliarlo con GET si el backend ya lo ofrece y la responsabilidad encaja.

No crear endpoints ficticios.

## 8. CONSULTA SELECCIONADA

Al seleccionar consulta:

- mostrar fecha;
- motivo;
- anamnesis/resumen;
- observaciones relevantes;
- oftalmólogo si viene en response;
- cita asociada si existe;
- cargar diagnósticos existentes.

No permitir enviar diagnóstico sin consulta seleccionada.

## 9. DIAGNÓSTICOS EXISTENTES

Consumir:

```text
GET /historial-clinico/consultas/{consulta_id}/diagnosticos
```

Mostrar lista/tarjetas/tabla coherente con el diseño existente.

Cada item debe mostrar como mínimo:

- nombre;
- descripción si existe;
- fecha.

No agregar edición/borrado.

## 10. FORMULARIO

Campos:

### nombre
- obligatorio;
- máximo 150;
- trim;
- contador si encaja.

### descripción
- opcional;
- textarea.

Preferir Reactive Forms si es patrón del proyecto.

No bloquear diagnósticos repetidos por una regla inventada.

## 11. ENVÍO

Construir body EXCLUSIVAMENTE con:

```text
nombre
descripcion
```

La URL contiene:

```text
consulta_id
```

NO enviar:

```text
consulta_clinica_id
oftalmologo_id
paciente_id
usuario_id
estado
fecha_diagnostico
```

Deshabilitar botón mientras envía.

## 12. ÉXITO

Tras 201:

- mostrar confirmación;
- agregar/refrescar diagnóstico en la lista;
- limpiar formulario;
- mantener la consulta seleccionada para permitir registrar otro diagnóstico.

Esto debe demostrar claramente la relación 1:N.

## 13. ERRORES

Manejar coherentemente:

- 401;
- 403;
- 404;
- 422;
- 500;
- error de red.

Usar `detail` de FastAPI cuando sea apropiado.

No usar `alert()` si el proyecto ya dispone de UI de mensajes.

## 14. RUTA

Preferencia:

```text
/registrar-diagnostico
```

Agregar en `app.routes.ts` con:

```text
authGuard
```

y `loadComponent` si es patrón actual.

## 15. SIDEBAR

Agregar mapeo:

```text
'registrar diagnóstico' → '/registrar-diagnostico'
```

Mantener menú dinámico.

Considerar acento/minúsculas según normalización actual.

## 16. RESPONSIVE Y UX

Mantener estilos del proyecto.

Debe funcionar en:

- desktop;
- tablet;
- móvil web.

Usar labels, estados disabled y mensajes visibles.

## 17. TESTS

Revisar infraestructura existente.

Crear tests razonables, mínimo:

1. service POST usa URL correcta;
2. POST body no contiene `consulta_clinica_id`;
3. POST body no contiene `oftalmologo_id`;
4. GET lista diagnósticos;
5. sin consulta seleccionada no envía;
6. nombre vacío no envía;
7. nombre > 150 inválido;
8. 201 refresca/agrega diagnóstico y limpia formulario;
9. permite registrar otro diagnóstico en misma consulta;
10. 403 muestra mensaje;
11. selección paciente carga consultas;
12. selección consulta carga diagnósticos;
13. ruta protegida existe;
14. sidebar mapea `Registrar diagnóstico`.

No introducir un framework nuevo.

## 18. VALIDACIÓN

Ejecutar:

```text
npm run build
```

Luego tests en modo no watch según configuración real, por ejemplo:

```text
npx ng test --watch=false
```

No inventar scripts.

Corregir cualquier fallo.

## 19. NO REGRESIÓN

Verificar que continúen compilando/pasando tests de:

- login;
- pacientes;
- agenda;
- historial;
- CU15;
- sidebar.

# REPORTE FINAL OBLIGATORIO

Entregar exactamente:

# Reporte CU16 Frontend

## 1. Archivos creados

Ruta | Propósito

## 2. Archivos modificados

Ruta | Cambio

## 3. Flujo final de usuario

Desde menú hasta diagnóstico registrado.

## 4. Integración con backend

Endpoints, payload, response, JWT.

## 5. Selección de paciente y consulta

Qué services se reutilizaron.

## 6. Diagnósticos existentes

Cómo se cargan/muestran/refrescan.

## 7. Seguridad

Confirmar:
- no se envía `oftalmologo_id`;
- no se envía `consulta_clinica_id` en body;
- no hay acceso directo a Supabase.

## 8. Validaciones UX

Lista.

## 9. Sidebar y navegación

Ruta y mapeo.

## 10. Tests

Cantidad, comando, resultado.

## 11. Build

Comando y resultado.

## 12. Deuda técnica / bloqueos

Solo problemas comprobados.

## 13. Estado final

```text
CU16 frontend: COMPLETO
```

o

```text
CU16 frontend: INCOMPLETO
```

Si es incompleto, detallar lo faltante.

# REGLA FINAL

Primero inspeccionar.

Después implementar.

Después probar.

Después corregir.

Finalmente reportar.

No finalizar solo porque compila.
