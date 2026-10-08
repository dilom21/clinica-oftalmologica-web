# MASTER_PROMPT_REPORTES_HTML_EMAIL_FRONT.md

## DÓNDE EJECUTAR

Trabaja EXCLUSIVAMENTE en:

```text
C:\SI2_Proyecto\clinica-oftalmologica-web
```

Estamos en el **PASO 5B — Frontend HTML + Email de Reportes**.

Antes de modificar:

1. Lee COMPLETO `CONTEXTO_REPORTES_HTML_EMAIL_FRONT.md`.
2. Lee COMPLETO `MASTER_PROMPT_REPORTES_HTML_EMAIL_FRONT.md`.
3. Usa la skill `frontend-ui-design` si está disponible.
4. Inspecciona el código LOCAL actual.
5. Inspecciona en SOLO LECTURA el contrato backend real de reportes email.

---

# OBJETIVO

Extender `/reportes` YA EXISTENTE con:

```text
Exportar HTML
Enviar por correo
```

Mantén intacto todo lo que ya funciona:

```text
estáticos
dinámicos
filtros
ordenamiento
preview
Excel
PDF
CSV
```

---

# FASE A — CONTRATO REAL BACKEND

Lee en modo solo lectura:

```text
C:\SI2_Proyecto\clinica-oftalmologica-api\app\modules\gestion_reportes\schemas\schemas.py
C:\SI2_Proyecto\clinica-oftalmologica-api\app\modules\gestion_reportes\api\router.py
```

Identifica EXACTAMENTE:

```text
payload dinámico email
payload estático email
nombres de propiedades
tipos
formatos válidos
```

No inventes nombres.

No modifiques backend.

---

# FASE B — HTML

Extiende el menú:

```text
Exportar ▾
├── Excel (.xlsx)
├── PDF
├── CSV
└── HTML
```

HTML se descarga desde FastAPI.

NO generar HTML en Angular.

Usar el mismo patrón Blob actual.

Fallback:

```text
reporte.html
```

---

# FASE C — EMAIL

Agregar junto a las acciones:

```text
Enviar por correo
```

Al pulsarlo, abrir modal/panel consistente con el diseño actual.

Campos:

```text
Destinatario *
Formato *
Asunto *
Mensaje
```

Formatos:

```text
PDF
Excel
CSV
HTML
```

Valores backend:

```text
pdf
xlsx
csv
html
```

Validaciones:

```text
email válido
asunto 1..150
mensaje max 1000
configuración de reporte válida
```

---

# SERVICIO

Extender `ReportesService`.

No crear llamadas a SMTP/Gmail.

Angular llama SOLO a FastAPI.

Agregar:
- export html si hace falta;
- enviar email dinámico;
- enviar email estático.

Reutiliza builders/payloads existentes para no duplicar lógica.

---

# UX

Modal/panel:

```text
Enviar reporte por correo
```

Mostrar contexto del reporte seleccionado.

Mientras envía:

```text
Enviando reporte...
```

Éxito:

```text
Reporte enviado correctamente.
```

Errores:

```text
403 → No tienes permiso para enviar reportes.
422 → Revisa el destinatario o la configuración.
503 → El servicio de correo no está disponible o no está configurado.
default → No se pudo enviar el reporte.
```

No mostrar errores técnicos.

---

# ACCESIBILIDAD

Si modal:

```text
role="dialog"
aria-modal="true"
```

Título asociado.
Botón cerrar.
Foco visible.

---

# PRIVACIDAD

NO guardar email/asunto/mensaje en:

```text
localStorage
sessionStorage
```

NO mostrar SMTP config.

---

# TESTS

Extender service/component specs.

Cubrir mínimo:

```text
1 HTML dinámico
2 HTML estático
3 Blob HTML
4 abrir email modal
5 destinatario requerido
6 destinatario inválido
7 asunto requerido
8 formatos xlsx/pdf/csv/html
9 email dinámico
10 email estático
11 loading
12 éxito
13 403
14 422
15 503
16 mensaje max 1000
17 no storage
```

Ejecutar:

```powershell
npx.cmd --no-install ng test --watch=false
npm run build
```

No debilitar tests.

---

# NO HACER

NO:
- backend;
- Supabase;
- SMTP;
- voz;
- backup;
- librerías nuevas;
- commit;
- push;
- merge.

---

# REPORTE FINAL

Entrega:

```text
1. ESTADO
2. CONTRATO BACKEND REAL
3. ARCHIVOS MODIFICADOS
4. EXPORTACIÓN HTML
5. SERVICIO EMAIL
6. UI EMAIL
7. ESTÁTICOS
8. DINÁMICOS
9. VALIDACIONES
10. PRIVACIDAD
11. ERRORES/UX
12. ACCESIBILIDAD
13. TESTS
14. BUILD
15. WARNINGS
16. GIT STATUS
```

Confirma expresamente:

```text
- no se modificó backend;
- no se modificó Supabase;
- Angular no usa SMTP/Gmail directamente;
- no se guarda email en storage;
- no commit/push/merge.
```

No hagas commit.
