# CONTEXTO_IA_FRONT.md

## 1. Identificación

**Proyecto:** Clínica Oftalmológica  
**Sprint:** Sprint 2  
**Integración:** IA clínica con DeepSeek  
**Capa:** Frontend Angular  
**Repositorio:** `C:\SI2_Proyecto\clinica-oftalmologica-web`

Este bloque conecta visualmente la IA ya implementada en backend con:

- CU15 Registrar consulta clínica
- CU16 Registrar diagnóstico

No se debe colocar ninguna API key de DeepSeek en Angular.

---

## 2. Backend ya disponible

Endpoints:

```http
POST /ia/consultas/{consulta_id}/analizar
POST /ia/consultas/{consulta_id}/mejorar-redaccion-diagnostico
```

Ambos requieren:

- JWT;
- permiso `Usar asistencia clínica IA`;
- rol Oftalmólogo;
- perfil activo;
- ownership de la consulta.

### Análisis

No recibe body clínico.

Respuesta:

```json
{
  "resumen_clinico": "...",
  "hallazgos_relevantes": ["..."],
  "aspectos_a_evaluar": ["..."],
  "hipotesis_orientativas": ["..."],
  "advertencia": "..."
}
```

### Mejora diagnóstica

Body:

```json
{
  "nombre": "...",
  "descripcion": "..."
}
```

Respuesta:

```json
{
  "nombre": "...",
  "descripcion_original": "...",
  "descripcion_mejorada": "...",
  "advertencia": "..."
}
```

La IA no guarda diagnósticos ni modifica consultas.

---

## 3. Objetivo frontend

### CU15

Después de registrar una consulta correctamente, permitir:

```text
[ ✨ Analizar consulta con IA ]
```

Mostrar un panel/tarjeta con:

- resumen clínico;
- hallazgos relevantes;
- aspectos a evaluar;
- hipótesis orientativas;
- advertencia.

No ejecutar automáticamente al guardar.

No bloquear el registro normal de consulta si DeepSeek falla.

### CU16

Una vez seleccionada una consulta y con el formulario de diagnóstico:

```text
Nombre
Descripción

[ ✨ Mejorar redacción con IA ]
```

La IA devuelve una sugerencia.

Mostrar:

```text
Descripción original
Descripción sugerida

[ Usar sugerencia ] [ Descartar ]
```

`Usar sugerencia` copia únicamente `descripcion_mejorada` al textarea.

No registrar el diagnóstico automáticamente.

---

## 4. Seguridad

Angular solamente debe usar el JWT existente.

NO colocar:

- DEEPSEEK_API_KEY;
- base URL de DeepSeek;
- llamadas directas a `api.deepseek.com`.

Toda llamada va a:

```text
Angular → FastAPI → DeepSeek
```

---

## 5. Servicio frontend

Crear/reutilizar un servicio coherente con la estructura actual.

Nombre sugerido:

```text
IaClinicaService
```

Métodos:

```ts
analizarConsulta(consultaId: number)
mejorarRedaccionDiagnostico(
  consultaId: number,
  payload: { nombre: string; descripcion: string }
)
```

Usar:

```text
environment.apiUrl
```

No hardcodear `127.0.0.1`, Render ni DeepSeek dentro del servicio.

---

## 6. Estados UX

Para ambas funciones contemplar:

```text
idle
loading
success
error
```

Mientras se llama a IA:

- desactivar el botón correspondiente;
- mostrar indicador de carga;
- evitar doble click.

Errores:

```text
403 → no autorizado para esta consulta/función
502 → respuesta inválida de IA
503 → servicio IA no disponible/no configurado
otro → mensaje genérico
```

No mostrar stack traces ni errores técnicos crudos.

---

## 7. CU15

Inspeccionar primero el componente real actual.

No reescribir el flujo existente.

Tras `POST /historial-clinico/consultas`, conservar el `id` de la consulta creada para habilitar IA.

Si ya existe otro mecanismo para acceder a la consulta registrada, reutilizarlo.

El análisis debe mostrarse claramente como:

```text
Asistencia con Inteligencia Artificial
```

y advertir que:

```text
Es contenido de apoyo y debe ser validado por el oftalmólogo.
```

No convertir hipótesis en diagnóstico registrado.

---

## 8. CU16

Reutilizar la consulta seleccionada.

Antes de llamar a IA validar en frontend:

```text
nombre no vacío
descripcion no vacía
consulta seleccionada
```

El backend seguirá siendo la autoridad.

No enviar:

```text
oftalmologo_id
consulta_clinica_id en body
diagnostico_id
estado
fecha
```

Solo:

```text
nombre
descripcion
```

---

## 9. Accesibilidad y facilidad de uso

Usar textos claros.

Botones sugeridos:

```text
✨ Analizar consulta con IA
✨ Mejorar redacción con IA
Usar sugerencia
Descartar
```

El panel de IA debe distinguir visualmente:

```text
Resumen clínico
Hallazgos relevantes
Aspectos a evaluar
Hipótesis orientativas
Advertencia
```

Evitar modales innecesarios si el diseño actual usa tarjetas/secciones.

---

## 10. Tests

Agregar tests siguiendo el stack de pruebas Angular ya existente.

Cubrir como mínimo:

### Servicio

- URL correcta análisis;
- POST sin body clínico;
- URL correcta mejora;
- body de mejora solo nombre + descripcion.

### CU15

- botón IA aparece solo cuando hay consulta creada/seleccionada válida;
- loading;
- render de resultado;
- error 503 no rompe consulta registrada;
- no registra diagnóstico.

### CU16

- no llama IA si nombre/descripcion vacíos;
- loading;
- muestra sugerencia;
- `Usar sugerencia` reemplaza descripción;
- `Descartar` conserva descripción original;
- no ejecuta POST de diagnóstico por usar sugerencia;
- error controlado.

La suite previa debe seguir pasando.

---

## 11. Pruebas

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

No debilitar tests existentes.

---

## 12. No hacer

NO implementar todavía:

- voz;
- micrófono;
- reportes;
- Excel/PDF/CSV;
- backup;
- restore;
- chatbot;
- análisis de imágenes;
- llamadas directas a DeepSeek desde Angular;
- API key en frontend;
- cambios Supabase;
- commit/push/merge.

---

## 13. Criterio de terminado

```text
[ ] servicio IA frontend
[ ] CU15 integrado
[ ] CU16 integrado
[ ] estados loading/success/error
[ ] advertencias visibles
[ ] ninguna API key en Angular
[ ] IA nunca registra automáticamente diagnóstico
[ ] tests pasan
[ ] build pasa
[ ] reporte final entregado
```
