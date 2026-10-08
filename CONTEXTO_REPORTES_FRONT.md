# CONTEXTO_REPORTES_FRONT.md

## 1. Identificación

**Proyecto:** Clínica Oftalmológica  
**Sprint:** Sprint 2  
**Bloque:** Reportes estáticos y dinámicos  
**Capa:** Frontend Angular  
**Repositorio objetivo:** `C:\SI2_Proyecto\clinica-oftalmologica-web`

Este bloque conecta Angular con el backend de reportes ya implementado y probado.

---

## 2. Backend disponible

Endpoints:

```http
GET /reportes/catalogo

POST /reportes/dinamicos/previsualizar
POST /reportes/dinamicos/exportar/{formato}

POST /reportes/estaticos/{reporte_key}/previsualizar
POST /reportes/estaticos/{reporte_key}/exportar/{formato}
```

Formatos:

```text
xlsx
pdf
csv
```

Seguridad:

```text
JWT válido
rol Administrador
permiso "Generar reportes" con LECTURA
```

El permiso real ya está configurado en Supabase.

---

## 3. Objetivo frontend

Construir una interfaz administrativa para:

### Reportes estáticos
- listar reportes disponibles;
- seleccionar uno;
- configurar filtros permitidos;
- previsualizar resultados;
- exportar a XLSX/PDF/CSV.

### Reportes dinámicos
- elegir dataset;
- elegir columnas;
- configurar filtros;
- configurar ordenamiento;
- previsualizar;
- exportar a XLSX/PDF/CSV.

No hardcodear datasets/campos si el backend ya los entrega en `/reportes/catalogo`.

---

## 4. Regla principal

El frontend NO construye SQL.

El frontend trabaja únicamente con:

```text
dataset keys
field keys
operadores permitidos
dirección asc/desc
```

provistos por el catálogo.

Angular solo envía configuración lógica; FastAPI valida todo.

---

## 5. Servicio Angular

Crear/reutilizar un servicio:

```text
ReportesService
```

Métodos sugeridos:

```ts
obtenerCatalogo()

previsualizarDinamico(request)

exportarDinamico(formato, request)

previsualizarEstatico(reporteKey, request)

exportarEstatico(reporteKey, formato, request)
```

Usar:

```text
environment.apiUrl
```

Para archivos:

```text
responseType: 'blob'
observe: 'response'
```

Leer `Content-Disposition` para filename cuando esté disponible.

No hardcodear `localhost` ni Render dentro del servicio.

---

## 6. Ruta y navegación

Agregar una ruta administrativa, sugerida:

```text
/reportes
```

Debe conservar el `authGuard` existente.

Integrar con el mecanismo real de sidebar/permisos del proyecto.

Función:

```text
Generar reportes
```

No inventar un segundo sistema de menú si ya existe uno dinámico.

---

## 7. Pantalla principal

La vista puede organizarse con dos modos:

```text
[ Reportes estáticos ] [ Reporte personalizado ]
```

No hace falta separar en múltiples rutas si una sola pantalla con tabs/toggle es más coherente con el proyecto.

---

## 8. Reportes estáticos

El catálogo debe indicar qué reportes existen.

Mínimo backend actual:

```text
pacientes_activos
citas_por_fecha
consultas_clinicas
diagnosticos_registrados
usuarios_por_rol
```

La UI debe:

1. permitir seleccionar reporte;
2. mostrar sus columnas fijas;
3. mostrar filtros compatibles;
4. permitir vista previa;
5. exportar.

El usuario NO puede modificar columnas de un reporte estático.

---

## 9. Reportes dinámicos

Flujo:

```text
1. Elegir dataset
2. Elegir columnas
3. Agregar filtros
4. Agregar orden
5. Previsualizar
6. Exportar
```

Datasets backend actuales:

```text
pacientes
citas
consultas_clinicas
diagnosticos
usuarios
```

La interfaz debe cargar campos desde el catálogo.

---

## 10. Selección de columnas

Mostrar checkbox/multiselect.

Reglas UX:

```text
- mínimo 1 columna;
- indicar columnas por defecto;
- no enviar campos no elegidos;
- al cambiar dataset limpiar columnas incompatibles.
```

No permitir seleccionar campos no devueltos por catálogo.

---

## 11. Filtros

Constructor de filtros:

```text
Campo | Operador | Valor | [Eliminar]
```

Botón:

```text
+ Agregar filtro
```

Los operadores disponibles deben depender del campo seleccionado según catálogo.

Ejemplos:

```text
Texto      → eq, contains, starts_with
Número     → eq, gt, gte, lt, lte
Fecha      → eq, gte, lte, between
Booleano   → eq
Estado     → eq, in
```

Para `between`, mostrar dos valores.

Para `in`, permitir múltiples valores de manera clara.

No enviar filtros vacíos.

---

## 12. Ordenamiento

Constructor:

```text
Campo | Ascendente/Descendente | [Eliminar]
```

Máximo:

```text
3 criterios
```

Solo campos que el catálogo marque como ordenables.

---

## 13. Vista previa

La preview debe mostrarse antes de exportar.

Tabla dinámica basada en:

```text
columnas
filas
total
limit
```

Mostrar:

```text
Total de registros encontrados
Registros mostrados en vista previa
```

La UI no debe asumir que toda la data fue cargada.

No implementar paginación compleja en este bloque si backend no la expone; basta con preview limitada.

---

## 14. Exportación

Botones:

```text
Exportar Excel
Exportar PDF
Exportar CSV
```

Descargar Blob en navegador.

Usar filename de `Content-Disposition` si existe.

Fallback seguro:

```text
reporte.xlsx
reporte.pdf
reporte.csv
```

No abrir XLSX/CSV como texto.

PDF puede descargarse; no es necesario crear visor.

---

## 15. UX

Estados:

```text
cargando catálogo
previsualizando
exportando XLSX
exportando PDF
exportando CSV
error
sin resultados
```

Desactivar acciones incompatibles mientras se procesa.

Mensajes amigables:

```text
403 → No tienes permiso para generar reportes.
404 → El reporte solicitado no existe.
422 → Revisa columnas, filtros u ordenamiento.
500/default → No se pudo generar el reporte.
```

No mostrar traceback o body técnico crudo.

---

## 16. Validaciones frontend

Antes de preview/export dinámico:

```text
dataset seleccionado
mínimo 1 columna
filtros completos
orden válido
```

El backend sigue siendo autoridad final.

Antes de export estático:

```text
reporte seleccionado
filtros válidos
```

---

## 17. Seguridad

No mostrar sección Reportes a usuarios sin acceso si el sidebar actual soporta permisos.

Aunque se oculte en UI, backend seguirá validando.

No almacenar datos de reportes en localStorage/sessionStorage salvo que la arquitectura actual ya lo haga expresamente.

No persistir información clínica descargada dentro de Angular.

---

## 18. Tests

Crear tests para:

### Servicio

1. GET catálogo usa URL correcta;
2. preview dinámico POST correcto;
3. export dinámico usa blob;
4. preview estático correcto;
5. export estático usa blob;
6. no modifica payload agregando campos inesperados.

### Componente

7. carga catálogo;
8. cambia dataset y actualiza campos;
9. selección de columnas;
10. agregar/eliminar filtro;
11. operadores cambian según campo;
12. between maneja dos valores;
13. máximo 3 órdenes;
14. preview renderiza columnas/filas;
15. muestra total/limit;
16. export XLSX;
17. export PDF;
18. export CSV;
19. error 403 amigable;
20. error 422 amigable;
21. no preview sin columna;
22. reporte estático no permite editar columnas.

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

La suite previa debe seguir pasando.

---

## 19. No hacer en este bloque

NO implementar:

- backend;
- voz;
- DeepSeek para construir reportes;
- HTML;
- email;
- backup;
- restore;
- cambios Supabase;
- commit;
- push;
- merge.

---

## 20. Criterio de terminado

```text
[ ] ReportesService
[ ] ruta /reportes
[ ] integración sidebar/permisos
[ ] reportes estáticos
[ ] reportes dinámicos
[ ] catálogo backend usado
[ ] selector de columnas
[ ] filtros
[ ] ordenamiento
[ ] preview
[ ] XLSX
[ ] PDF
[ ] CSV
[ ] manejo de blobs
[ ] errores amigables
[ ] tests pasan
[ ] build pasa
[ ] reporte final del agente
```
