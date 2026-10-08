---
name: frontend-ui-design
description: Diseña y refina interfaces Angular profesionales, claras, responsivas y consistentes para la Clínica Oftalmológica. Úsala al crear o mejorar páginas, formularios, tablas, filtros, reportes, dashboards, estados vacíos, carga y errores. Prioriza UX, jerarquía visual, accesibilidad y coherencia con el diseño existente, sin romper lógica ni tests.
---

# Frontend UI Design — Clínica Oftalmológica

## Objetivo
Mejorar interfaces Angular existentes sin romper funcionalidad, contratos HTTP, permisos, rutas ni tests. Prioriza una interfaz profesional, limpia, moderna, clara, consistente y responsive.

## Regla 1 — Primero funcionalidad, luego diseño
1. Inspecciona el componente y el contrato real del backend.
2. Si hay errores 4xx/5xx, corrige primero payload/validación.
3. Después mejora HTML/CSS.
4. No ocultes errores funcionales con CSS.

## Jerarquía visual
Toda pantalla administrativa debe tener:
- sección/eyebrow;
- título;
- descripción breve;
- acciones principales;
- contenido;
- feedback.

## Layout de Reportes
Estructura preferida:
1. Header.
2. Selector Estáticos | Personalizado.
3. Configuración.
4. Acciones.
5. Resumen de resultados.
6. Tabla preview.

En desktop usa bien el ancho. En móvil apila controles.

## Reportes estáticos
Mostrar nombre, descripción, columnas incluidas, filtros opcionales y badge de "Columnas fijas".
No mostrar una lista larga como texto plano. Preferir chips/badges para columnas.

## Reportes dinámicos
Separar visualmente:
1. Dataset.
2. Columnas.
3. Filtros.
4. Orden.

## Filtros
Cada filtro debe tener:
Campo | Operador | Valor | Eliminar

- `between`: Desde | Hasta.
- `in`: entrada múltiple clara.
- Validaciones cerca del campo.
- `+ Agregar filtro` es acción secundaria.

## Ordenamiento
Campo | Dirección | Eliminar.
Mostrar contador, por ejemplo "2 de 3 criterios".
Máximo 3.

## Acciones
Primaria: Vista previa.
Secundarias: Exportar Excel, PDF y CSV.
Si configuración es inválida, deshabilitar acciones y mostrar ayuda contextual.
No mostrar banner rojo permanente antes de que el usuario intente una acción.

## Estados
Antes del preview:
"Configura el reporte y pulsa Vista previa."

Sin resultados:
"No se encontraron registros con los filtros seleccionados."

Errores backend:
- 403: No tienes permiso para generar reportes.
- 404: El reporte solicitado no existe.
- 422: Revisa la configuración del reporte.
- default: No se pudo completar la operación.

No mostrar detalles técnicos.

## Tabla preview
- header claro;
- scroll horizontal con muchas columnas;
- valores nulos como `—`;
- fechas legibles;
- booleanos como badges si encaja;
- mostrar total y cantidad visible;
- no asumir que preview contiene todos los registros.

## Diseño visual
Preferir:
- superficies blancas;
- fondo neutro claro;
- bordes sutiles;
- sombra mínima;
- radios consistentes;
- azul primario existente;
- verde solo para éxito;
- rojo solo para error.

Evitar:
- gradients innecesarios;
- glassmorphism;
- sombras fuertes;
- exceso de iconos;
- colores ajenos al sistema.

## Accesibilidad
- labels asociados;
- foco visible;
- contraste;
- teclado;
- aria-label cuando haga falta;
- no usar solo color para comunicar estado.

## Angular/CSS
- reutiliza patrones existentes;
- no agregues librerías UI externas sin aprobación;
- evita `!important`;
- organiza CSS por secciones;
- mantén responsividad.

## Responsive
Revisar:
- >=1200px;
- 768–1199px;
- <768px.

En pequeño:
- tabs full-width si conviene;
- filtros apilados;
- botones con wrap;
- tabla con scroll-x;
- sin overflow horizontal de página.

## Seguridad UX
Ocultar acciones por permiso mejora UX, pero el backend sigue siendo autoridad.
No almacenar datos clínicos en localStorage/sessionStorage.

## Cierre
Después de una mejora visual:
1. tests;
2. build;
3. reportar archivos modificados;
4. no commit/push salvo instrucción.

Checklist:
- ¿Se entiende la pantalla en menos de 10 s?
- ¿La acción principal es evidente?
- ¿Los errores están cerca de su causa?
- ¿No hay espacios vacíos sin propósito?
- ¿La tabla soporta muchas columnas?
- ¿Funciona en móvil?
- ¿Es consistente con la app?
- ¿Tests y build pasan?
