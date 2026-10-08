Trabaja EXCLUSIVAMENTE en:

C:\SI2_Proyecto\clinica-oftalmologica-web

Quiero una SEGUNDA ITERACIÓN VISUAL del módulo /reportes usando la skill:

frontend-ui-design

ANTES DE MODIFICAR:
1. Lee la skill completa.
2. Inspecciona reportes.ts, reportes.html, reportes.css, reportes.service.ts, reportes.models.ts y tests.
3. No cambies el contrato backend ya corregido.
4. No modifiques backend ni Supabase.

OBJETIVO VISUAL

Quiero acercar el módulo a un dashboard profesional de reportes, inspirado en los ejemplos anteriores del usuario:
- hero/banner de "Reportes y Analítica";
- cards seleccionables para reportes estáticos;
- configurador claro;
- filtros bien jerarquizados;
- resultados con resumen;
- tabla limpia;
- exportación agrupada en dropdown;
- diseño moderno pero sobrio.

No copies textos del proyecto anterior. Adapta todo a Clínica Oftalmológica.

1. HERO
Título:
"Reportes y Analítica"

Descripción:
"Consulta, filtra y exporta información autorizada de la clínica."

Usar azul institucional, texto blanco y altura compacta.

2. TABS
Mantener:
- Reportes estáticos
- Reporte personalizado

Convertirlos en segmented control profesional.

3. REPORTES ESTÁTICOS
Mostrar como cards seleccionables:
- Pacientes activos
- Citas por fecha
- Consultas clínicas
- Diagnósticos registrados
- Usuarios por rol

El catálogo real del backend sigue siendo la fuente de verdad.
Puedes mapear iconos/labels solo para presentación con fallback genérico.

4. CONFIGURACIÓN
Estático:
- descripción;
- badge "Columnas fijas";
- chips de columnas.

Dinámico:
- Fuente de datos
- Columnas
- Filtros
- Ordenamiento

5. COLUMNAS
- checkboxes/chips;
- contador de seleccionadas.

6. FILTROS
Sin filtros:
"No agregaste filtros. Puedes generar el reporte completo o limitar los resultados."

Cada filtro:
Campo | Operador | Valor | eliminar

between:
Desde | Hasta

7. ORDEN
Mostrar:
"N de 3 criterios"

8. ACCIONES
Usar:
[ Vista previa ] [ Exportar ▾ ]

Menú Exportar:
- Excel (.xlsx)
- PDF
- CSV

9. RESULTADOS
Encabezado:
RESULTADOS
Vista previa

Mostrar:
"X encontrados · Y mostrados (límite Z)"

Tabla:
- header limpio;
- scroll horizontal;
- badges booleanos;
- null → —;
- hover;
- densidad cómoda.

10. FECHAS
Formatear timestamps ISO a una fecha legible en UI.
No alterar valores ni backend.

11. ESTADOS
Antes del preview:
"Configura el reporte y pulsa Vista previa."

Sin resultados:
"No se encontraron registros con los filtros seleccionados."

Loading:
"Generando vista previa..."

Error:
alerta compacta solo después de un error real.

12. RESPONSIVE
Desktop: cards en grid.
Tablet: 2 columnas.
Mobile: 1 columna, filtros apilados, botones con wrap y tabla scroll-x.

NO:
- modificar backend;
- modificar Supabase;
- cambiar payloads;
- agregar librerías UI;
- inventar KPIs;
- agregar gráficos falsos;
- implementar voz;
- implementar HTML/email;
- hacer commit/push/merge.

TESTS:
npx.cmd --no-install ng test --watch=false
npm run build

REPORTE FINAL:
1. ESTADO
2. ARCHIVOS MODIFICADOS
3. HERO
4. REPORTES ESTÁTICOS
5. REPORTE DINÁMICO
6. FILTROS
7. ORDEN
8. EXPORTACIÓN
9. PREVIEW/TABLA
10. FORMATO DE FECHAS
11. RESPONSIVE
12. ACCESIBILIDAD
13. TESTS
14. BUILD
15. WARNINGS
16. GIT STATUS

No hagas commit.
