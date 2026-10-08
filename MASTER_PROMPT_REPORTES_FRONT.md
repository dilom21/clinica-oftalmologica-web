# MASTER_PROMPT_REPORTES_FRONT.md

## DÓNDE EJECUTAR

Trabaja EXCLUSIVAMENTE en:

```text
C:\SI2_Proyecto\clinica-oftalmologica-web
```

Estamos en el **PASO 4 — Frontend de reportes estáticos y dinámicos**.

Antes de modificar código:

1. Lee COMPLETO `CONTEXTO_REPORTES_FRONT.md`.
2. Lee COMPLETO `MASTER_PROMPT_REPORTES_FRONT.md`.
3. Inspecciona el frontend LOCAL actual.
4. No asumas que GitHub está actualizado.

# OBJETIVO

Integrar Angular con el backend ya existente:

```http
GET /reportes/catalogo

POST /reportes/dinamicos/previsualizar
POST /reportes/dinamicos/exportar/{formato}

POST /reportes/estaticos/{reporte_key}/previsualizar
POST /reportes/estaticos/{reporte_key}/exportar/{formato}
```

Construir una interfaz administrativa usable para:

```text
Reportes estáticos
Reportes dinámicos
Filtros
Columnas
Orden
Vista previa
Excel
PDF
CSV
```

# INSPECCIÓN OBLIGATORIA

Localiza:

```text
app.routes
authGuard
sidebar/layout
servicios HTTP existentes
patrón de mensajes/errores
environment
interceptor JWT
features existentes
tests
```

Reutiliza estilos/patrones actuales.

No crees un segundo sistema de autenticación, permisos o navegación.

# SERVICIO

Crear/reutilizar:

```text
ReportesService
```

Debe usar:

```text
environment.apiUrl
```

Métodos:

```text
obtenerCatalogo
previsualizarDinamico
exportarDinamico
previsualizarEstatico
exportarEstatico
```

Exportaciones:

```text
responseType: blob
observe: response
```

Leer `Content-Disposition`.

# RUTA

Agregar:

```text
/reportes
```

con `authGuard`.

Integrar con sidebar usando la función:

```text
Generar reportes
```

Respeta el mecanismo real existente.

# CATÁLOGO

NO hardcodees datasets/campos/operadores si `/reportes/catalogo` los entrega.

La UI debe derivar de ese catálogo:

```text
datasets
campos
labels
tipos
operadores
ordenables
columnas por defecto
reportes estáticos
```

Si la forma exacta del JSON difiere, adapta el frontend al contrato REAL, no inventes otro.

# REPORTES ESTÁTICOS

Permitir:

```text
seleccionar reporte
ver columnas fijas
configurar filtros compatibles
previsualizar
exportar xlsx/pdf/csv
```

NO permitir modificar columnas del estático.

# REPORTES DINÁMICOS

Flujo:

```text
dataset
→ columnas
→ filtros
→ orden
→ preview
→ exportar
```

Mínimo una columna.

Máximo 3 órdenes.

Al cambiar dataset, limpiar configuraciones incompatibles.

# FILTROS

Constructor dinámico:

```text
Campo | Operador | Valor | Eliminar
```

Operadores provienen del catálogo.

Manejar correctamente:

```text
between → dos valores
in      → varios valores
boolean → valor booleano
date    → input fecha cuando corresponda
```

No enviar filtros incompletos.

# PREVIEW

Renderizar la respuesta de backend dinámicamente.

Mostrar:

```text
columnas
filas
total
limit
```

No asumir que preview contiene todos los registros.

# DESCARGAS

Botones:

```text
Exportar Excel
Exportar PDF
Exportar CSV
```

Descargar el Blob.

Filename:
1. intentar `Content-Disposition`;
2. usar fallback seguro si no existe.

No crear archivos manuales en frontend si backend ya los genera.

# ERRORES

Mensajes amigables:

```text
403 → No tienes permiso para generar reportes.
404 → El reporte solicitado no existe.
422 → Revisa la configuración del reporte.
default → No se pudo completar la operación.
```

No mostrar errores técnicos crudos.

# UX

Estados separados:

```text
cargando catalogo
previsualizando
exportando xlsx
exportando pdf
exportando csv
```

Desactivar botón correspondiente durante operación.

Mostrar estado "Sin resultados" cuando corresponda.

# SEGURIDAD

NO:

```text
SQL en frontend
password_hash
token_hash
bitácora general
localStorage con resultados clínicos
```

Angular solo usa claves lógicas permitidas por catálogo.

# TESTS

Agregar tests de servicio y componente.

Cubrir al menos:

```text
1 catálogo
2 preview dinámico
3 export dinámico blob
4 preview estático
5 export estático blob
6 carga catálogo
7 cambio dataset
8 columnas
9 filtros
10 operadores
11 between
12 máximo 3 órdenes
13 preview tabla
14 total/limit
15 XLSX
16 PDF
17 CSV
18 403
19 422
20 no preview sin columnas
21 estático columnas inmutables
```

Ejecuta:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

No debilites pruebas existentes.

# NO HACER

NO:

```text
backend
Supabase
voz
DeepSeek para reportes
HTML
email
backup
restore
commit
push
merge
```

# REPORTE FINAL

No hagas commit.

Entrégame:

```text
1. ESTADO
2. ARCHIVOS CREADOS
3. ARCHIVOS MODIFICADOS
4. RUTA Y NAVEGACIÓN
5. SERVICIO REPORTES
6. REPORTES ESTÁTICOS
7. REPORTES DINÁMICOS
8. FILTROS Y ORDEN
9. VISTA PREVIA
10. EXPORTACIÓN XLSX/PDF/CSV
11. SEGURIDAD
12. UX / ERRORES
13. TESTS
14. BUILD
15. DEUDAS / DECISIONES
16. GIT STATUS
```

Confirma expresamente:

```text
- no se tocó backend;
- no se modificó Supabase;
- no se construye SQL en frontend;
- reportes usan el catálogo real del backend;
- no se hizo commit/push/merge.
```

Si encuentras una incompatibilidad real con el contrato del backend, adapta el frontend al contrato existente y documenta la decisión. No cambies backend desde este bloque.
