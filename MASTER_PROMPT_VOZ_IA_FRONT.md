# MASTER_PROMPT_VOZ_IA_FRONT.md

## DÓNDE EJECUTAR

Trabaja EXCLUSIVAMENTE en:

```text
C:\SI2_Proyecto\clinica-oftalmologica-web
```

Estamos en el **PASO 6B — Frontend Voz + IA**.

Lee completos:

```text
CONTEXTO_VOZ_IA_FRONT.md
MASTER_PROMPT_VOZ_IA_FRONT.md
```

Usa la skill:

```text
frontend-ui-design
```

si está disponible.

Inspecciona el código LOCAL antes de modificar.

---

# OBJETIVO

Implementar DOS funcionalidades:

## A. DICTADO CLÍNICO

Web Speech API del navegador:

```text
micrófono → texto → formulario
```

CU15:
- motivo_consulta
- anamnesis
- observaciones

CU16:
- descripcion

NO guardar automáticamente.

NO registrar automáticamente.

NO ejecutar IA clínica automáticamente.

---

## B. REPORTES POR VOZ

```text
micrófono
→ Web Speech API
→ texto visible
→ POST /ia/reportes/interpretar
→ configuración IA
→ constructor existente
→ usuario revisa
→ acción manual
```

NO ejecutar preview automáticamente.

NO exportar automáticamente.

---

# VOICE SERVICE

Crear un servicio reutilizable para encapsular:

```text
SpeechRecognition
webkitSpeechRecognition
```

NO duplicar lógica de navegador en CU15, CU16 y Reportes.

Config sugerida:

```text
lang es-BO
continuous false
maxAlternatives 1
```

Detectar unsupported.

Fallback manual siempre disponible.

---

# ESTADOS

Manejar:

```text
idle
listening
processing
error
unsupported
```

Mensajes claros.

Micrófono nunca inicia automáticamente.

---

# CU15

Agregar control de dictado a:

```text
motivo_consulta
anamnesis
observaciones
```

Si campo vacío:
- usar transcript.

Si tiene texto:
- APPEND consistente.
- no sobrescribir silenciosamente.

Después el oftalmólogo puede editar.

No guardar CU15 tras dictar.

---

# CU16

Agregar:

```text
Dictar descripción
```

al textarea descripción.

No disparar automáticamente:
- Mejorar redacción IA;
- Registrar diagnóstico.

Usuario conserva control.

---

# REPORTES

Agregar acción de voz coherente con el dashboard.

Puede ser botón flotante como referencia visual, pero accesible:

```text
aria-label="Crear reporte por voz"
```

Al pulsar abrir panel/modal:

```text
Consulta por voz
```

Mostrar ejemplos.

Durante:
```text
Escuchando...
```

Después:
```text
Texto reconocido: ...
```

Botones:
```text
Volver a dictar
Interpretar con IA
Cancelar
```

---

# SERVICIO IA FRONT

Extender/reutilizar servicio de IA para:

```http
POST /ia/reportes/interpretar
```

Request:

```json
{"texto":"..."}
```

NO llamar DeepSeek directo.

---

# APLICAR CONFIG

Cuando respuesta válida:

Mapear al MISMO builder ya existente:

```text
modo personalizado
dataset
columnas
filtros
orden
limit
```

NO crear un segundo constructor.

Validar claves contra catálogo frontend existente.

Mostrar resumen interpretado.

NO preview automático.
NO export automático.

---

# ACLARACIÓN

Si:

```text
requiere_aclaracion=true
```

mostrar:

```text
La IA necesita una aclaración:
...
```

Permitir volver a dictar.

No implementar chat multi-turn complejo.

---

# ACCIÓN SUGERIDA

Si IA indica:

```text
exportar/pdf
```

mostrar la sugerencia.

No descargar automáticamente.

---

# ERRORES

Voice:

```text
unsupported → reconocimiento no disponible
not-allowed → permisos mic
```

IA:

```text
403 → sin permiso
422 → texto/config inválida
502 → respuesta IA inválida
503 → IA no disponible
```

No mostrar detalles técnicos.

---

# PRIVACIDAD

NO:

```text
guardar audio
enviar audio al backend
localStorage transcript
sessionStorage transcript
DeepSeek directo
```

Dictado clínico no llega al backend hasta acción normal del usuario.

---

# TESTS

Mockear SpeechRecognition.

Cubrir:

```text
voice service supported/unsupported
start/stop/result/error
CU15 3 campos
append
no autosave
CU16 descripcion
no auto IA
no auto registro
Reportes botón voz
transcript
interpretar endpoint
aplica dataset/columnas/filtros/orden
no preview automático
no export automático
aclaración
formato sugerido
502/503
mic denied
unsupported
```

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

---

# NO HACER

NO:
- backend
- Supabase
- audio upload
- TTS
- librerías nuevas
- auto preview
- auto export
- backup
- commit
- push
- merge

---

# REPORTE FINAL

Entrega:

```text
1. ESTADO
2. ARCHIVOS CREADOS
3. ARCHIVOS MODIFICADOS
4. SERVICIO DE VOZ
5. COMPATIBILIDAD/FALLBACK
6. CU15
7. CU16
8. REPORTES POR VOZ
9. INTEGRACIÓN /ia/reportes/interpretar
10. APLICACIÓN AL BUILDER
11. PRIVACIDAD
12. ACCESIBILIDAD
13. ERRORES/UX
14. TESTS
15. BUILD
16. WARNINGS
17. GIT STATUS
```

Confirma:
- no audio al backend;
- no DeepSeek directo;
- no autosave;
- no auto preview/export;
- no cambios backend/Supabase;
- no commit/push/merge.
