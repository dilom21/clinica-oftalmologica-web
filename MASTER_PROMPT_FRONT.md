# MASTER_PROMPT.md
# Clínica Oftalmológica — Frontend Angular

Repositorio:
https://github.com/dilom21/clinica-oftalmologica-web.git

## Flujo obligatorio

Antes de modificar:
1. leer MASTER_PROMPT.md;
2. leer CONTEXTO_CUXX_FRONT.md;
3. revisar git status;
4. inspeccionar código LOCAL y cambios no commiteados;
5. preservar trabajo previo;
6. recién implementar.

No asumir que GitHub refleja todo lo local.

## Arquitectura y patrones

Respetar:
- Angular actual;
- standalone components;
- signals si es el patrón del feature;
- HttpClient;
- services;
- models/interfaces;
- authGuard;
- interceptor JWT;
- Sidebar/MenuService;
- lazy routes.

No crear una arquitectura paralela.

## Backend como fuente de verdad

Antes de modelar nuevos endpoints:
- revisar el contrato backend real;
- revisar OpenAPI;
- no inventar nombres de campos.

Angular nunca debe conectarse directo a Supabase.

## Seguridad

Frontend adapta UX, pero no autoriza.

No usar botones ocultos como seguridad.

Reutilizar:
- AuthService;
- token existente;
- menu dinámico;
- IDs/rol helpers ya existentes cuando aplique.

## Proyecto colaborativo

Otros integrantes desarrollan CUs en paralelo.

Por ello:
- cambios mínimos;
- no refactor global;
- no renombrar/reorganizar código ajeno;
- preservar CU existentes;
- aislar el nuevo CU.

## UX

Siempre manejar:
- loading;
- vacío;
- error;
- éxito;
- operación en progreso;
- responsive.

Evitar dobles envíos.

Mostrar errores de negocio 409 de forma útil.

## Estilos

Reutilizar diseño y variables existentes.

No introducir librerías UI nuevas salvo necesidad explícita.

## Verificación

Al final ejecutar:
`npm run build`

Corregir todos los errores TypeScript/templates/imports.

Reportar warnings preexistentes sin hacer refactor global fuera de alcance.

## Git

Durante desarrollo:
NO:
- commit;
- push;
- merge;
- rebase;
- force.

Al finalizar mostrar git status.

## Archivos IA — NUNCA VERSIONAR

Mantener locales, fuera del staging:
- MASTER_PROMPT.md
- CONTEXTO_CU*_FRONT.md
- CONTEXTO_CU*_BACK.md
- CONTEXTO_CU*_MOBILE.md
- prompts/contextos IA equivalentes.

No borrarlos, solo no versionarlos.

## Reporte final

Informar:
1. archivos modificados/creados;
2. ruta;
3. endpoints;
4. comportamiento por rol;
5. reglas UX;
6. build;
7. pendientes;
8. git status;
9. confirmación de no commit/push/merge;
10. confirmación de que archivos IA no están staged.
