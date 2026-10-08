# MASTER_PROMPT_CU15_FRONT.md

## 📍 DÓNDE EJECUTAR

**Repositorio:** `clinica-oftalmologica-web`  
**Ruta:** `C:\SI2_Proyecto\clinica-oftalmologica-web`  
**Ubicación:** RAÍZ DEL REPOSITORIO FRONTEND

NO ejecutar desde:

- `C:\SI2_Proyecto`
- `clinica-oftalmologica-api`
- `clinica-oftalmologica-mobile`

# IMPLEMENTACIÓN FRONTEND — CU15 REGISTRAR CONSULTA CLÍNICA

Quiero que implementes completamente el frontend Web del **CU15 – Registrar consulta clínica**.

Esta tarea se realiza sobre Angular.

El backend de CU15 YA ESTÁ TERMINADO Y PROBADO.

Antes de modificar cualquier archivo debes leer:

1. `CONTEXTO_CU15_FRONT.md`
2. este archivo `MASTER_PROMPT_CU15_FRONT.md`
3. el código LOCAL actual del repositorio

No asumas que GitHub refleja exactamente el estado local.

## 1. REGLAS DE TRABAJO

NO modificar:

- backend
- móvil
- Supabase
- `.env` salvo error comprobable y, aun así, solo reportarlo
- dependencias salvo necesidad estricta
- otros CU salvo archivos compartidos requeridos como rutas/sidebar

NO:

- hacer commit
- hacer push
- hacer merge
- inventar endpoints
- acceder a Supabase directamente desde Angular
- enviar `oftalmologo_id`
- crear una segunda autenticación
- hardcodear token
- hardcodear URL de producción si el proyecto ya usa environment/config
- reescribir el diseño global

## 2. INSPECCIÓN OBLIGATORIA

Antes de programar, inspecciona como mínimo:

```text
src/app/app.routes.ts

src/app/core/guards/
src/app/core/layouts/sidebar/
src/app/core/services/
src/app/core/models/

src/environments/
```

y los CU existentes que sirvan de patrón:

```text
gestion-pacientes / CU07
agenda-citas / CU09
agenda-citas / CU10
gestion-historial-clinico / CU13
```

Busca específicamente:

- componentes standalone
- ReactiveFormsModule o FormsModule
- servicios HTTP
- configuración de API
- interceptores JWT
- manejo de errores FastAPI
- modelos/interfaces de pacientes
- modelos/interfaces de citas
- consulta de historial
- listados/búsquedas
- sidebar y menú dinámico
- estilos visuales del sistema

Si las rutas tienen nombres ligeramente diferentes en LOCAL, encuentra sus equivalentes reales.

NO programes hasta terminar esta inspección.

## 3. CONFIRMAR CONTRATOS EXISTENTES

Localiza cómo el frontend actual consume:

- pacientes
- historial clínico
- antecedentes
- citas
- menú

Reutiliza los services existentes si su responsabilidad encaja.

No dupliques un service de pacientes o citas solo porque CU15 sea nuevo.

Si el proyecto ya tiene un tipo `Paciente`, `Cita`, `HistorialClinico`, etc., reutilízalo o extiéndelo de manera compatible.

## 4. CREAR FEATURE CU15

Crear, salvo que el patrón local indique una variante mejor:

```text
src/app/features/gestion-historial-clinico/casos-uso/
└── cu15-registrar-consulta-clinica/
    ├── models/
    │   └── consulta-clinica.models.ts
    ├── services/
    │   └── consulta-clinica.service.ts
    └── pages/
        └── registrar-consulta/
            ├── registrar-consulta.ts
            ├── registrar-consulta.html
            └── registrar-consulta.css
```

Crear `components/` únicamente si realmente mejora la separación.

No crear archivos vacíos.

## 5. MODELOS CU15

Crear interfaces basadas en el backend REAL.

Como mínimo debe existir un request equivalente a:

```ts
interface ConsultaClinicaCrear {
  historial_clinico_id: number;
  cita_id?: number | null;
  motivo_consulta?: string | null;
  anamnesis?: string | null;
  observaciones?: string | null;
}
```

NO incluir:

```ts
oftalmologo_id
```

Crear también la interface de respuesta según el contrato real que devuelve FastAPI.

No inventar propiedades.

## 6. SERVICE CU15

Crear o integrar un service que implemente:

```http
POST /historial-clinico/consultas
```

Método conceptual:

```ts
registrarConsulta(datos: ConsultaClinicaCrear)
```

Debe devolver el tipo de respuesta real.

Usar:

- `HttpClient`
- configuración de API existente
- interceptor JWT existente

NO colocar headers Authorization manualmente si ya existe interceptor.

NO hardcodear dominios.

Si CU13 ya posee un service apropiado para GET del historial, reutilizarlo.

## 7. RUTA

Agregar una ruta protegida por:

```text
authGuard
```

Ruta preferida:

```text
/registrar-consulta-clinica
```

Usar `loadComponent` si ese es el patrón actual.

No implementar un guard de rol nuevo si el proyecto está usando menú dinámico + autorización backend, salvo que ya exista uno reutilizable.

## 8. SIDEBAR

El backend/Supabase ya devuelve una función denominada exactamente:

```text
Registrar consulta clínica
```

Agregar al sistema de rutas del sidebar una entrada equivalente a:

```text
'registrar consulta clínica' → '/registrar-consulta-clinica'
```

No crear un ítem estático independiente del menú dinámico.

## 9. PANTALLA — DISEÑO FUNCIONAL

La página debe respetar el lenguaje visual actual.

### A. Encabezado

- título `Registrar consulta clínica`
- ayuda breve

### B. Selección de paciente

No pedir `paciente_id` manualmente.

Reutilizar la funcionalidad existente para buscar/listar/seleccionar.

Mostrar suficiente información para evitar seleccionar a la persona equivocada.

### C. Resumen clínico

Después de seleccionar paciente:

- obtener historial
- mostrar información del paciente
- mostrar antecedentes
- indicar claramente si no existe historial

No permitir enviar sin `historial_clinico_id`.

### D. Cita asociada

Usar services/endpoints de agenda existentes.

Si existe forma de consultar citas del paciente, mostrar citas aplicables.

Estados válidos:

```text
PROGRAMADA
CONFIRMADA
EN_ESPERA
```

No ofrecer como seleccionables:

```text
ATENDIDA
CANCELADA
NO_ASISTIO
```

Agregar opción:

```text
Sin cita asociada
```

No inventar un endpoint si el actual no permite obtener citas. Si no hay endpoint compatible, repórtalo como bloqueo concreto.

### E. Datos de consulta

Formulario:

- motivo de consulta
- anamnesis
- observaciones

Aplicar límites backend.

### F. Acciones

Botón:

```text
Registrar consulta
```

Debe quedar deshabilitado cuando no se pueda enviar y durante la request.

Evitar doble submit.

## 10. EXPERIENCIA DE USUARIO

Implementar estados visuales para:

- cargando pacientes
- cargando historial
- cargando citas
- enviando
- éxito
- error

No usar `alert()` si el proyecto ya tiene un patrón de mensajes.

No mostrar JSON crudo, SQL ni stack traces.

## 11. MANEJO DE ERRORES

Inspecciona el patrón existente para `HttpErrorResponse`.

Maneja:

- 401
- 403
- 404
- 409
- 422
- 500

Para FastAPI, reutiliza `detail` cuando sea un string apropiado.

## 12. REQUEST FINAL

Al registrar, construir un objeto que contenga únicamente:

```text
historial_clinico_id
cita_id
motivo_consulta
anamnesis
observaciones
```

No enviar:

```text
oftalmologo_id
paciente_id
usuario_id
estado
fecha_consulta
```

salvo contradicción explícita con el contrato REAL, en cuyo caso repórtala antes de cambiar el diseño.

## 13. RESPUESTA 201

Al registrar:

- mostrar confirmación
- evitar segundo envío accidental
- mostrar datos útiles o redirigir según patrón existente

Si había cita asociada, backend la cambia a `ATENDIDA`.

Si la UI conserva esa cita en memoria, refrescar/actualizar su estado.

## 14. RESPONSIVE Y ACCESIBILIDAD

Debe funcionar en escritorio, tablet y móvil web sin alterar el layout global.

Usar labels, mensajes de validación, estados disabled y HTML semántico.

## 15. PRUEBAS

Inspecciona primero la infraestructura de tests.

Si ya existe testing frontend funcional, agregar casos razonables para:

1. POST correcto
2. payload sin `oftalmologo_id`
3. `cita_id` null
4. formulario inválido no envía
5. doble submit
6. éxito 201
7. error 409
8. selección de paciente/historial

No introducir un framework nuevo solo por CU15.

## 16. VALIDACIÓN TÉCNICA

Ejecutar los scripts reales de `package.json`.

Como mínimo, normalmente:

```bash
npm run build
```

Para tests, usar el script configurado evitando watch infinito.

Si existe `test:ci`, preferirlo.

Ejecutar lint solo si existe script.

No inventar scripts.

## 17. NO ROMPER FUNCIONALIDADES EXISTENTES

Verificar que sigan compilando:

- login
- inicio
- pacientes
- agenda
- historial clínico
- sidebar

## 18. CRITERIOS DE ACEPTACIÓN

- [ ] feature CU15 existe
- [ ] ruta protegida existe
- [ ] menú dinámico navega al CU15
- [ ] paciente se selecciona sin IDs manuales
- [ ] historial se recupera
- [ ] antecedentes se muestran
- [ ] cita válida puede asociarse si el backend/frontend actual ofrece consulta adecuada
- [ ] consulta sin cita funciona
- [ ] `oftalmologo_id` jamás se envía
- [ ] POST funciona
- [ ] loading evita doble envío
- [ ] 201 se informa
- [ ] errores se manejan
- [ ] build pasa
- [ ] tests configurados pasan
- [ ] no se toca backend/Supabase/móvil

# REPORTE FINAL OBLIGATORIO

Entrega exactamente:

# Reporte CU15 Frontend

## 1. Archivos creados

Tabla: `Ruta | Propósito`

## 2. Archivos modificados

Tabla: `Ruta | Cambio`

## 3. Flujo final de usuario

Desde menú hasta registro exitoso.

## 4. Integración con backend

Indicar:

- endpoints consumidos
- payload exacto
- response
- cómo se adjunta JWT

## 5. Selección de paciente e historial

Explicar qué services/componentes se reutilizaron.

## 6. Manejo de cita

Explicar:

- cómo se obtienen
- cuáles se muestran
- cómo funciona sin cita
- qué ocurre tras ATENDIDA

## 7. Seguridad

Confirmar:

- no se envía `oftalmologo_id`
- no existe acceso directo a Supabase
- autorización sigue en backend

## 8. Validaciones UX

Lista de validaciones y estados.

## 9. Sidebar y navegación

Ruta creada y mapeo de `Registrar consulta clínica`.

## 10. Tests

- tests creados/modificados
- comando
- resultado

## 11. Build

Comando y resultado exacto.

## 12. Deuda técnica o bloqueos

Solo problemas comprobados fuera del alcance.

## 13. Estado final

Responder exactamente:

```text
CU15 frontend: COMPLETO
```

o:

```text
CU15 frontend: INCOMPLETO
```

Si es incompleto, enumerar lo que falta.

## REGLA FINAL

Primero inspeccionar.

Después implementar.

Después ejecutar pruebas/build.

Después corregir errores.

Finalmente generar el reporte.

No finalizar solo porque los archivos fueron creados.
