# CONTEXTO_VOZ_IA_FRONT.md

## 1. Identificación

**Proyecto:** Clínica Oftalmológica  
**Sprint:** Sprint 2  
**Paso:** 6B — Frontend Voz + IA  
**Repositorio objetivo:** `C:\SI2_Proyecto\clinica-oftalmologica-web`

Este bloque agrega interacción por voz en Angular SIN enviar audio al backend.

Se implementarán dos experiencias:

1. **Dictado clínico**
   - CU15 Registrar consulta clínica
   - CU16 Registrar diagnóstico

2. **Reportes por voz**
   - micrófono → texto
   - texto → `/ia/reportes/interpretar`
   - configuración segura aplicada al constructor existente
   - el usuario revisa/confirma
   - luego usa Vista previa o Exportar manualmente

---

## 2. Arquitectura

### Dictado clínico

```text
Micrófono
→ Web Speech API del navegador
→ texto
→ campo Angular
```

No requiere DeepSeek.

No requiere FastAPI.

No guarda audio.

### Reportes por voz

```text
Micrófono
→ Web Speech API
→ texto visible
→ POST /ia/reportes/interpretar
→ DeepSeek en backend
→ JSON validado
→ Angular aplica configuración
→ usuario revisa
→ Vista previa / Exportar
```

Nunca:

```text
voz → SQL
voz → exportación automática sin revisión
audio → DeepSeek
audio → Supabase
```

---

## 3. Backend disponible para reportes por voz

```http
POST /ia/reportes/interpretar
```

Request:

```json
{
  "texto": "Muéstrame las consultas de octubre ordenadas de más reciente a más antigua"
}
```

Respuesta conceptual:

```json
{
  "dataset": "consultas_clinicas",
  "columnas": ["fecha_consulta", "paciente"],
  "filtros": [],
  "orden": [
    {
      "campo": "fecha_consulta",
      "direccion": "desc"
    }
  ],
  "limit": 50,
  "requiere_aclaracion": false,
  "pregunta_aclaracion": null,
  "accion_sugerida": "previsualizar",
  "formato_sugerido": null
}
```

El frontend debe inspeccionar el contrato REAL local antes de crear interfaces.

---

## 4. Servicio de reconocimiento de voz

Crear un servicio reutilizable, sugerido:

```text
src/app/shared/services/voice-recognition.service.ts
```

o una ubicación coherente con el proyecto.

Debe encapsular:

```text
window.SpeechRecognition
window.webkitSpeechRecognition
```

No acceder directamente a estas APIs desde varios componentes.

API sugerida del servicio:

```ts
isSupported(): boolean

start(options?): Observable/Signal/Promise...
stop()
```

La forma exacta debe respetar el estilo Angular actual.

---

## 5. Configuración SpeechRecognition

Configuración sugerida:

```text
lang = "es-BO"
continuous = false
interimResults = true o false según UX
maxAlternatives = 1
```

Si `es-BO` no funciona en el navegador, permitir fallback configurable a:

```text
es-ES
```

No hardcodear comportamientos distintos en cada componente.

---

## 6. Compatibilidad y fallback

La Web Speech API no está disponible igual en todos los navegadores.

La UI debe detectar soporte.

Si no está soportado:

```text
"El reconocimiento de voz no está disponible en este navegador. Puedes escribir el texto manualmente."
```

La funcionalidad normal del sistema debe seguir funcionando.

Si el usuario niega permiso al micrófono:

```text
"No se pudo acceder al micrófono. Revisa los permisos del navegador."
```

No bloquear el formulario.

---

## 7. Estados de voz

Definir estados claros:

```text
idle
listening
processing
success
error
unsupported
```

Mientras escucha:

```text
🎙 Escuchando...
```

Permitir detener/cancelar.

No iniciar el micrófono automáticamente.

Siempre requiere acción explícita del usuario.

---

# PARTE A — DICTADO CLÍNICO

## 8. CU15

Integrar dictado en campos de texto clínico existentes.

Prioridad:

```text
motivo_consulta
anamnesis
observaciones
```

Agregar botón pequeño por campo:

```text
🎙 Dictar
```

o un control accesible equivalente.

Al terminar el reconocimiento:

- no guardar automáticamente la consulta;
- poner el texto en el campo correspondiente;
- permitir al oftalmólogo editarlo antes de guardar.

---

## 9. Regla de inserción de texto

Si el campo está vacío:

```text
resultado voz → campo
```

Si ya tiene texto:

NO sobrescribir silenciosamente.

Preferencia:

```text
texto existente + espacio/salto + texto dictado
```

o preguntar/reemplazar según UX existente.

Para este bloque, usar una regla consistente de APPEND es suficiente.

Debe quedar testeada.

---

## 10. CU16

Agregar dictado al campo:

```text
descripcion
```

Opcionalmente al nombre solo si tiene sentido UX; preferencia: NO dictar el nombre en esta primera versión.

Flujo:

```text
🎙 Dictar descripción
→ texto en textarea
→ usuario revisa
→ puede usar "Mejorar redacción con IA"
→ usuario decide
→ registra manualmente
```

Esto combina bien:

```text
voz → texto → IA de redacción → revisión humana
```

Pero no ejecutar automáticamente la mejora IA después del dictado.

---

## 11. Privacidad del dictado clínico

No almacenar audio.

No persistir transcript automáticamente.

No mandar transcript a backend hasta que el usuario realice la operación normal de guardar CU15/CU16.

No poner transcripciones en localStorage/sessionStorage.

---

# PARTE B — REPORTES POR VOZ

## 12. Botón de voz

En `/reportes`, agregar un botón visible acorde al diseño.

Puede ser flotante como referencia visual del usuario:

```text
🎙
```

pero debe tener:

```text
aria-label="Crear reporte por voz"
title="Crear reporte por voz"
```

y no tapar contenido en mobile.

También puede existir un botón textual:

```text
Consultar por voz
```

---

## 13. Panel/modal de comando de voz

Al activar:

```text
Consulta por voz
```

Mostrar:

```text
"Di qué reporte necesitas"

Ejemplos:
- Muéstrame los pacientes activos.
- Muéstrame las consultas de octubre ordenadas por fecha.
- Prepara las citas de este mes en PDF.
```

Mientras escucha:

```text
Escuchando...
```

Después mostrar SIEMPRE la transcripción:

```text
Texto reconocido:
"Muéstrame las consultas..."
```

Botones:

```text
[ Volver a dictar ]
[ Interpretar con IA ]
[ Cancelar ]
```

No mandar a DeepSeek mientras todavía está escuchando.

---

## 14. Interpretación IA

Extender/reutilizar un servicio Angular de IA.

Método sugerido:

```ts
interpretarReporte(texto: string)
```

Endpoint:

```text
POST /ia/reportes/interpretar
```

Usar:

```text
environment.apiUrl
JWT interceptor existente
```

No llamar DeepSeek directamente desde Angular.

---

## 15. Aplicar configuración interpretada

Cuando `requiere_aclaracion == false`:

Angular debe mapear la respuesta al constructor actual de reportes:

```text
modo → personalizado
dataset
columnas
filtros
orden
limit
```

Validar además contra el catálogo ya cargado en frontend.

Aunque backend ya validó, el frontend debe evitar romper UI si una clave no existe.

No crear una segunda estructura paralela al constructor actual.

---

## 16. Revisión antes de ejecutar

Después de aplicar:

Mostrar confirmación visual:

```text
Configuración interpretada por IA

Fuente: Consultas clínicas
Columnas: Fecha, Paciente, Oftalmólogo
Filtros: Fecha entre ...
Orden: Fecha descendente
Acción sugerida: Vista previa
```

Botones:

```text
[ Aplicar y revisar ]
[ Cancelar ]
```

O aplicar al builder y resaltar que fue generado por IA.

CRÍTICO:

No ejecutar automáticamente preview/export apenas llega DeepSeek.

El usuario debe tener una acción explícita final.

---

## 17. Aclaraciones

Si:

```text
requiere_aclaracion = true
```

mostrar:

```text
La IA necesita una aclaración:
{pregunta_aclaracion}
```

Permitir:

```text
input de texto
o volver a dictar
```

La opción más simple aceptable:

- mostrar pregunta;
- el usuario vuelve a dictar una frase más clara.

No implementar conversación multi-turn compleja si no hace falta.

---

## 18. Acción sugerida y formato

Si backend devuelve:

```text
accion_sugerida = "exportar"
formato_sugerido = "pdf"
```

Mostrar:

```text
Sugerencia: Exportar en PDF
```

Pero NO descargar automáticamente.

El usuario debe pulsar:

```text
Exportar → PDF
```

o una confirmación explícita.

---

## 19. Errores reportes por voz

Mensajes:

```text
403 → No tienes permiso para interpretar reportes.
422 → No se pudo interpretar el texto ingresado.
502 → La IA devolvió una respuesta que no pudo procesarse.
503 → El servicio de IA no está disponible.
mic denied → Revisa permisos del micrófono.
unsupported → Reconocimiento de voz no disponible.
default → No se pudo procesar la consulta por voz.
```

No mostrar raw backend.

---

## 20. Accesibilidad

Botones de micrófono:

- label visible o aria-label;
- estado listening perceptible por texto, no solo color;
- foco visible;
- permitir cancelar con botón;
- no depender de animación.

Modal/panel:
- role dialog si corresponde;
- aria-modal;
- título;
- cerrar.

---

## 21. Diseño

Usar la skill:

```text
frontend-ui-design
```

Reportes ya tiene dashboard profesional.

Integrar el botón de voz sin rediseñar otra vez toda la página.

En CU15/CU16, botón de dictado debe ser discreto y coherente.

No agregar librerías.

---

## 22. Tests

Crear tests del servicio de voz y ampliar componentes.

### VoiceRecognitionService

Mockear `SpeechRecognition`.

Cubrir:

1. soportado;
2. no soportado;
3. start;
4. resultado final;
5. stop;
6. error permission;
7. no inicia automáticamente.

### CU15

8. botón motivo;
9. dictado motivo;
10. dictado anamnesis;
11. dictado observaciones;
12. append no sobrescribe texto previo;
13. no guarda consulta automáticamente;
14. unsupported no rompe formulario.

### CU16

15. dictado descripción;
16. append;
17. no registra diagnóstico;
18. no dispara IA de redacción automáticamente.

### Reportes

19. botón voz;
20. muestra transcript;
21. no llama IA mientras escucha;
22. endpoint interpretar correcto;
23. aplica dataset;
24. aplica columnas;
25. aplica filtros;
26. aplica orden;
27. no ejecuta preview automáticamente;
28. no exporta automáticamente;
29. aclaración visible;
30. acción/formato sugeridos visibles;
31. error 502;
32. error 503;
33. permission denied;
34. unsupported.

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

---

## 23. No hacer

NO:

- cambiar backend;
- modificar Supabase;
- subir audio;
- guardar audio;
- mandar audio a DeepSeek;
- ejecutar reportes automáticamente;
- exportar automáticamente;
- SQL IA;
- TTS;
- librerías nuevas;
- backup;
- commit;
- push;
- merge.

---

## 24. Criterio de terminado

```text
[ ] servicio reutilizable voz
[ ] soporte/unsupported
[ ] permiso mic
[ ] CU15 dictado
[ ] CU16 dictado
[ ] no autosave
[ ] reportes botón voz
[ ] transcript visible
[ ] interpretar con backend
[ ] aplicar configuración al builder
[ ] aclaraciones
[ ] no auto preview/export
[ ] accesibilidad
[ ] tests
[ ] build
[ ] reporte final
```
