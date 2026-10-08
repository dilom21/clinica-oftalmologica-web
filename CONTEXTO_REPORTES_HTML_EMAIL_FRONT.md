# CONTEXTO_REPORTES_HTML_EMAIL_FRONT.md

## 1. Identificación

**Proyecto:** Clínica Oftalmológica  
**Sprint:** Sprint 2  
**Bloque:** Completar frontend de reportes con HTML + envío por eMail  
**Capa:** Frontend Angular  
**Repositorio objetivo:** `C:\SI2_Proyecto\clinica-oftalmologica-web`

Este bloque amplía la pantalla `/reportes` YA IMPLEMENTADA Y REDISEÑADA.

No se debe crear una segunda pantalla de reportes ni duplicar servicios innecesariamente.

---

## 2. Backend ya disponible

El backend ya soporta:

### Exportación

```http
POST /reportes/dinamicos/exportar/xlsx
POST /reportes/dinamicos/exportar/pdf
POST /reportes/dinamicos/exportar/csv
POST /reportes/dinamicos/exportar/html

POST /reportes/estaticos/{reporte_key}/exportar/xlsx
POST /reportes/estaticos/{reporte_key}/exportar/pdf
POST /reportes/estaticos/{reporte_key}/exportar/csv
POST /reportes/estaticos/{reporte_key}/exportar/html
```

### Email

```http
POST /reportes/dinamicos/enviar-email
POST /reportes/estaticos/{reporte_key}/enviar-email
```

Seguridad:

```text
JWT válido
rol Administrador
permiso "Generar reportes" con LECTURA
```

---

## 3. Objetivo frontend

Completar la experiencia del módulo `/reportes` con:

1. nueva opción de exportación:
   - HTML

2. acción:
   - Enviar por correo

3. formulario/modal para email con:
   - destinatario
   - formato
   - asunto
   - mensaje

4. estados:
   - enviando
   - éxito
   - error

No modificar la lógica existente de:
- estáticos
- dinámicos
- filtros
- ordenamiento
- preview
- XLSX/PDF/CSV

---

## 4. Diseño visual

La pantalla ya usa una skill de diseño `frontend-ui-design`.

Mantener el estilo actual:

```text
Hero "Reportes y Analítica"
Cards
Tabs
Filtros
Preview
Tabla
Dropdown Exportar
```

No rediseñar todo otra vez.

Solo extender de forma coherente.

---

## 5. Exportar HTML

En el menú:

```text
Exportar ▾
├── Excel (.xlsx)
├── PDF
├── CSV
└── HTML
```

HTML debe descargar un archivo `.html`.

El frontend NO genera HTML.

Debe descargar el Blob entregado por FastAPI.

Usar:

```text
responseType: 'blob'
observe: 'response'
```

y `Content-Disposition`.

Fallback:

```text
reporte.html
```

---

## 6. Botón Email

Agregar una acción visible pero secundaria:

```text
[ Enviar por correo ]
```

Puede ubicarse junto al botón Exportar o dentro de su área de acciones.

No esconderlo en una navegación compleja.

Debe estar disponible tanto para:
- reporte estático;
- reporte personalizado.

Solo habilitar cuando la configuración sea válida.

---

## 7. Formulario / modal de email

Preferir un modal accesible o panel compacto dentro de la misma página.

Campos:

### Destinatario

```text
Correo electrónico *
```

input `type="email"`.

### Formato

```text
PDF
Excel
CSV
HTML
```

Valores enviados:

```text
pdf
xlsx
csv
html
```

### Asunto

Longitud backend:

```text
1..150
```

### Mensaje

Opcional.

Máximo:

```text
1000
```

Mostrar contador si resulta sencillo.

---

## 8. Payload Email

La forma exacta del request debe salir del CONTRATO REAL de backend.

Antes de implementar, inspeccionar:

```text
C:\SI2_Proyecto\clinica-oftalmologica-api\app\modules\gestion_reportes\schemas\schemas.py
C:\SI2_Proyecto\clinica-oftalmologica-api\app\modules\gestion_reportes\api\router.py
```

SOLO LECTURA.

No asumir nombres de propiedades.

No repetir el error anterior de payload español/inglés.

Crear modelos TypeScript alineados exactamente al backend.

---

## 9. Servicio Angular

Extender el `ReportesService` ya existente.

Agregar:

```text
exportar HTML
```

Si el método actual de exportación ya recibe `formato`, solo ampliar el tipo/union.

Agregar métodos coherentes, por ejemplo:

```ts
enviarEmailDinamico(payload)
enviarEmailEstatico(reporteKey, payload)
```

No crear otro `EmailService` exclusivo para reportes si el envío debe pasar por FastAPI.

Angular NO debe conectarse a SMTP ni Gmail directamente.

---

## 10. Configuración dinámica vs estática

### Reporte dinámico

El email debe enviar:
- datos del formulario email;
- dataset;
- columnas;
- filtros;
- orden;
- limit/configuración que requiera backend.

Debe reutilizar el mismo builder/payload actualmente probado para exportación dinámica.

### Reporte estático

Debe enviar:
- email;
- formato;
- asunto;
- mensaje;
- filtros;
- limit si backend lo espera.

NO enviar columnas editables en estático.

---

## 11. Validación frontend

Antes de enviar:

```text
reporte/configuración válida
destinatario válido
formato elegido
asunto no vacío
asunto <= 150
mensaje <= 1000
```

Errores inline.

No confiar exclusivamente en Angular:
backend sigue siendo autoridad.

---

## 12. UX del envío

Al abrir modal/panel:

```text
Enviar reporte por correo
```

Mostrar qué reporte se enviará:

```text
Reporte: Pacientes activos
Formato: PDF
```

o:

```text
Reporte personalizado: Consultas clínicas
```

Mientras envía:

```text
Enviando reporte...
```

Deshabilitar submit.

Éxito:

```text
Reporte enviado correctamente.
```

Cerrar modal automáticamente solo si la UX actual lo favorece; también puede dejar confirmación visible.

Error:

```text
422 → Revisa el destinatario o la configuración.
403 → No tienes permiso para enviar reportes.
503 → El servicio de correo no está disponible o no está configurado.
default → No se pudo enviar el reporte.
```

No mostrar body técnico crudo.

---

## 13. Privacidad

No guardar:

```text
destinatario
asunto
mensaje
reporte
```

en:
- localStorage
- sessionStorage

No autocompletar con información clínica.

No mostrar credenciales SMTP.

---

## 14. Accesibilidad modal

Si se usa modal:

- `role="dialog"`
- `aria-modal="true"`
- título asociado;
- botón cerrar;
- cierre con Escape si es sencillo;
- foco visible;
- no depender solo de icono.

No agregar librerías nuevas solo para modal.

---

## 15. Tests

Extender los tests actuales.

### Service

1. exportar HTML dinámico usa endpoint correcto;
2. exportar HTML estático usa endpoint correcto;
3. `responseType=blob`;
4. enviar email dinámico endpoint/payload correcto;
5. enviar email estático endpoint/payload correcto.

### Component

6. opción HTML aparece en menú exportar;
7. HTML llama exportar;
8. botón email abre formulario;
9. destinatario requerido;
10. destinatario inválido bloquea envío;
11. asunto requerido;
12. formatos xlsx/pdf/csv/html;
13. envío dinámico correcto;
14. envío estático correcto;
15. loading deshabilita submit;
16. éxito visible;
17. 422 amigable;
18. 403 amigable;
19. 503 amigable;
20. mensaje >1000 bloqueado/validado;
21. no guarda email en storage.

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

La suite previa debe seguir pasando.

---

## 16. No hacer

NO:

- modificar backend;
- modificar Supabase;
- configurar SMTP;
- enviar email real desde tests;
- implementar voz;
- backup;
- restore;
- SaaS;
- agregar librerías UI;
- commit;
- push;
- merge.

---

## 17. Criterio de terminado

```text
[ ] HTML visible en Exportar
[ ] descarga HTML funciona por servicio
[ ] email visible
[ ] modal/panel email
[ ] destinatario validado
[ ] formato xlsx/pdf/csv/html
[ ] asunto/mensaje
[ ] dinámico
[ ] estático
[ ] errores 403/422/503
[ ] éxito
[ ] no storage
[ ] tests
[ ] build
[ ] reporte final
```
