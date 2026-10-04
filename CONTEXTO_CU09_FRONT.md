# CONTEXTO CU09 — FRONTEND WEB

## Proyecto
Sistema de Información Web y Móvil para una Clínica Oftalmológica.

## Caso de uso
**CU09 — Consultar agenda y disponibilidad médica**

Este contexto es exclusivamente para el desarrollo del **frontend web Angular** del CU09.
No modificar documentación académica ni desarrollar otros casos de uso.

## Stack
- Frontend web: **Angular**
- Backend: **FastAPI**
- Base de datos: PostgreSQL/Supabase, pero el frontend **NO accede directamente a Supabase**.
- Flujo obligatorio:
  `Angular -> API FastAPI -> Service -> Repository -> PostgreSQL`

## Regla principal
Antes de crear componentes, servicios, rutas o modelos:
1. inspeccionar la arquitectura Angular existente;
2. reutilizar layouts, guards, interceptors, estilos, componentes y servicios ya creados;
3. seguir la misma estructura usada por los CU anteriores;
4. mantener coherencia visual con el sistema actual.

## Objetivo del CU09 en web
Crear la interfaz para **consultar agenda y disponibilidad médica**.

Debe permitir al usuario autorizado:
- visualizar oftalmólogos activos;
- seleccionar un oftalmólogo;
- seleccionar una fecha;
- consultar su disponibilidad;
- visualizar claramente los intervalos disponibles;
- visualizar su agenda cuando corresponda al rol;
- manejar estados sin datos, carga y errores.

## Datos que debe consumir del backend

### Oftalmólogos
Se espera consumir un endpoint equivalente a:
`GET /agenda/oftalmologos`

Datos mínimos:
- id
- nombres
- apellidos
- especialidad

### Disponibilidad
Se espera consumir un endpoint equivalente a:
`GET /agenda/disponibilidad?oftalmologo_id={id}&fecha={YYYY-MM-DD}`

Conceptualmente puede retornar:
- oftalmólogo;
- fecha;
- si existe horario configurado;
- intervalos disponibles.

### Agenda
Si el backend expone agenda:
`GET /agenda/oftalmologos/{id}/agenda?fecha={YYYY-MM-DD}`

No inventar URLs si el backend terminó usando otras rutas: revisar el contrato real antes de integrar.

## Comportamiento esperado de la pantalla

### Filtros principales
- selector de oftalmólogo;
- fecha;
- botón o actualización automática de consulta.

### Información del oftalmólogo
Mostrar:
- nombre completo;
- especialidad;
- opcionalmente matrícula si el diseño del sistema ya la muestra.

### Disponibilidad
Representar claramente:
- intervalos disponibles;
- mensaje cuando no existe horario configurado;
- mensaje cuando el día está completamente ocupado;
- mensaje cuando no existen oftalmólogos activos.

Ejemplo visual conceptual:

```text
Consultar agenda y disponibilidad

Oftalmólogo: [ Dr. Juan Pérez        v ]
Especialidad: Oftalmología General
Fecha:        [ 10/09/2026 ]

Disponibilidad

08:00 - 09:00    Disponible
09:30 - 10:00    Disponible
11:00 - 12:00    Disponible
```

No copiar este diseño literalmente si el proyecto ya posee un sistema visual definido.

## No inventar slots de 30 minutos
El backend trabaja con intervalos reales.

Si recibe:

```json
{
  "hora_inicio": "08:00:00",
  "hora_fin": "09:45:00"
}
```

el frontend debe mostrar:

`08:00 - 09:45`

No convertirlo en:
- 08:00
- 08:30
- 09:00
- 09:30

salvo que posteriormente exista una regla funcional explícita.

## Agenda y privacidad
Si se visualizan citas:
- un usuario administrativo/autorizado puede necesitar datos resumidos;
- una vista pública o de paciente nunca debe exponer datos de otros pacientes;
- respetar el contrato y permisos definidos por backend.

## Estados obligatorios de UI
Implementar de forma consistente con el proyecto:

### Loading
Mientras se consulta API.

### Error
Por ejemplo:
- error de servidor;
- sesión expirada;
- sin autorización.

### Vacío
Diferenciar:
- no hay oftalmólogos;
- no hay horario configurado;
- no hay intervalos disponibles.

### Éxito
Mostrar la disponibilidad obtenida sin recargar toda la aplicación.

## Integración con seguridad existente
- Reutilizar JWT/interceptor existente.
- Reutilizar guards y rutas protegidas.
- No crear un segundo sistema de autenticación.
- No guardar credenciales nuevas.
- No acceder a Supabase desde Angular.
- No modificar permisos en la BD.

## Diseño y estructura
Respetar:
- sidebar/navbar existente;
- tipografías;
- espaciados;
- componentes compartidos;
- sistema de botones;
- responsive design existente.

El CU09 debe sentirse como parte del sistema, no como una página independiente.

## Responsividad
La vista web debe funcionar al menos en:
- escritorio;
- tablet;
- ancho reducido.

No desarrollar Flutter dentro de este contexto.

## Archivos
OpenCode debe determinar los archivos reales después de inspeccionar el repo.

Probablemente se necesitarán equivalentes a:
- feature/componente de agenda;
- service de agenda;
- interfaces/models;
- routing;
- posibles ajustes de menú.

No crear estas rutas a ciegas si el proyecto usa otra organización.

## Restricciones
- No modificar `.env` salvo que ya exista una variable de API y solo sea necesario consumirla.
- No cambiar CORS.
- No tocar Supabase.
- No desarrollar CU10.
- No desarrollar CU11.
- No cambiar módulos que no sean necesarios.
- No hacer commit, merge ni push.

## Validaciones mínimas
- No consultar disponibilidad sin oftalmólogo.
- No enviar una fecha inválida.
- Mostrar errores de API amigablemente.
- Evitar llamadas duplicadas innecesarias.

## Verificación final
Antes de terminar:
- ejecutar build Angular;
- corregir errores TypeScript;
- verificar rutas;
- verificar que no se rompieron CU anteriores;
- revisar `git status`;
- detenerse sin commit ni push.

## Definition of Done técnica del frontend
El frontend web del CU09 queda listo cuando:
- consume el backend real;
- permite seleccionar oftalmólogo y fecha;
- muestra disponibilidad real;
- maneja loading/error/vacío;
- respeta autenticación existente;
- mantiene diseño del sistema;
- `ng build` termina correctamente;
- no se modificó Supabase;
- no se hicieron commits ni pushes.
