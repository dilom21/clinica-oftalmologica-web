# MASTER_PROMPT_IA_FRONT.md

## DÓNDE EJECUTAR

Trabaja EXCLUSIVAMENTE en:

```text
C:\SI2_Proyecto\clinica-oftalmologica-web
```

Lee completos:

```text
CONTEXTO_IA_FRONT.md
MASTER_PROMPT_IA_FRONT.md
```

y después inspecciona el código LOCAL actual.

No asumas que GitHub coincide con el workspace.

# OBJETIVO

Integrar en Angular los dos endpoints IA del backend ya implementados:

```http
POST /ia/consultas/{consulta_id}/analizar
POST /ia/consultas/{consulta_id}/mejorar-redaccion-diagnostico
```

La integración debe incorporarse a CU15 y CU16 sin reescribir ni romper sus flujos actuales.

# REGLAS

NO:

- colocar DEEPSEEK_API_KEY en Angular;
- llamar directamente a api.deepseek.com;
- tocar backend;
- tocar Supabase;
- implementar voz;
- implementar reportes;
- hacer commit/push/merge;
- registrar automáticamente un diagnóstico;
- enviar oftalmologo_id;
- inventar rutas/componentes paralelos si los actuales pueden reutilizarse.

# INSPECCIÓN

Localiza primero:

- CU15 Registrar consulta clínica;
- CU16 Registrar diagnóstico;
- servicios de ambos CUs;
- environment;
- interceptor JWT;
- manejo actual de mensajes/errores;
- tests existentes.

Usa la estructura real del proyecto.

# SERVICIO

Crear o reutilizar:

```text
IaClinicaService
```

Usar `environment.apiUrl`.

Métodos:

```ts
analizarConsulta(consultaId: number)

mejorarRedaccionDiagnostico(
  consultaId: number,
  payload: {
    nombre: string;
    descripcion: string;
  }
)
```

No mandar campos adicionales.

# CU15

Después de registrar exitosamente una consulta:

- conservar el id de consulta;
- habilitar botón `Analizar consulta con IA`;
- la llamada ocurre solo por acción explícita del usuario;
- mostrar loading;
- mostrar resultado estructurado;
- manejar error sin perder/alterar la consulta ya registrada.

Mostrar:

- resumen;
- hallazgos;
- aspectos a evaluar;
- hipótesis orientativas;
- advertencia.

No copiar hipótesis automáticamente a CU16.

# CU16

Con consulta seleccionada:

- agregar `Mejorar redacción con IA`;
- exigir nombre y descripción no vacíos antes de llamar;
- mostrar descripción sugerida sin reemplazar automáticamente;
- botones `Usar sugerencia` y `Descartar`.

`Usar sugerencia`:
- reemplaza solo el valor del campo descripción del formulario;
- NO registra diagnóstico.

`Descartar`:
- elimina/cierra la sugerencia;
- mantiene el texto original.

# ERRORES

Mapear amigablemente:

```text
403 → No tienes autorización para utilizar IA sobre esta consulta.
502 → La IA devolvió una respuesta que no pudo procesarse.
503 → El servicio de IA no está disponible en este momento.
default → No se pudo completar la asistencia con IA.
```

No mostrar `error.message` crudo si expone detalles internos.

# TESTS

Agregar tests del servicio y componentes.

Cubrir al menos:

1. endpoint análisis correcto;
2. endpoint mejora correcto;
3. payload exacto;
4. botón análisis CU15;
5. loading CU15;
6. render resultado CU15;
7. error CU15;
8. validación CU16;
9. loading CU16;
10. sugerencia CU16;
11. usar sugerencia;
12. descartar;
13. usar sugerencia no registra diagnóstico;
14. error 503.

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

# REPORTE FINAL

No hagas commit.

Entrega:

```text
1. ESTADO
2. ARCHIVOS CREADOS
3. ARCHIVOS MODIFICADOS
4. SERVICIO IA
5. INTEGRACIÓN CU15
6. INTEGRACIÓN CU16
7. SEGURIDAD
8. UX / MANEJO DE ERRORES
9. TESTS
10. BUILD
11. DEUDAS / DECISIONES
12. GIT STATUS
```

Confirma expresamente:

- no existe API key DeepSeek en frontend;
- Angular solo llama FastAPI;
- IA no registra automáticamente diagnósticos;
- no se modificó Supabase;
- no se hizo commit/push/merge.
