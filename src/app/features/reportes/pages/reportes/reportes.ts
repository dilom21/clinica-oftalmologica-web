import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { filter, merge, Subscription, take } from 'rxjs';
import { Router } from '@angular/router';
import { Sidebar } from '../../../../core/layouts/sidebar/sidebar';
import { AuthService } from '../../../autenticacion-seguridad/Auth/services/auth.service';
import {
  ReporteCampo, ReporteCatalogo, ReporteDataset, ReporteEstatico, ReporteFiltro,
  ReporteFormato, ReporteOrden, ReportePreview, ReporteRequest,
  ReporteInterpretacionIa,
} from '../../models/reportes.models';
import { ReportesService } from '../../services/reportes.service';
import { VoiceRecognitionService } from '../../../../shared/services/voice-recognition.service';

interface FiltroEdicion extends ReporteFiltro { valueText: string; valueText2: string; }
interface OrdenEdicion extends ReporteOrden { }

@Component({
  selector: 'app-reportes',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit, OnDestroy {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly modo = signal<'estatico' | 'dinamico'>('estatico');
  protected readonly catalogo = signal<ReporteCatalogo>({ datasets: [], staticReports: [] });
  protected readonly cargandoCatalogo = signal(true);
  protected readonly procesando = signal<'preview' | ReporteFormato | 'email' | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<ReportePreview | null>(null);
  protected readonly datasetKey = signal('');
  protected readonly reporteKey = signal('');
  protected readonly columnas = signal<string[]>([]);
  protected readonly filtros = signal<FiltroEdicion[]>([]);
  protected readonly ordenes = signal<OrdenEdicion[]>([]);
  protected readonly limite = signal<number | null>(null);
  protected readonly vozAbierta = signal(false);
  protected readonly transcriptVoz = signal('');
  protected readonly vozError = signal<string | null>(null);
  protected readonly interpretandoVoz = signal(false);
  protected readonly interpretacionIa = signal<ReporteInterpretacionIa | null>(null);
  protected readonly emailAbierto = signal(false);
  protected readonly emailDestinatario = signal('');
  protected readonly emailFormato = signal<ReporteFormato>('pdf');
  protected readonly emailAsunto = signal('');
  protected readonly emailMensaje = signal('');
  protected readonly emailError = signal<string | null>(null);
  protected readonly emailExito = signal<string | null>(null);

  private readonly service = inject(ReportesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly voice = inject(VoiceRecognitionService);
  private voiceAttemptSubscription: Subscription | null = null;
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private focusReturn: HTMLElement | null = null;

  ngOnInit(): void {
    this.service.obtenerCatalogo().subscribe({
      next: (catalogo) => {
        this.catalogo.set(catalogo);
        this.seleccionarReporte(catalogo.staticReports[0]?.key ?? '');
        this.seleccionarDataset(catalogo.datasets[0]?.key ?? '');
        this.cargandoCatalogo.set(false);
      },
      error: (err: unknown) => { this.cargandoCatalogo.set(false); this.error.set(this.mensajeError(err)); },
    });
  }

  ngOnDestroy(): void {
    this.voiceAttemptSubscription?.unsubscribe();
    this.voice.stop();
  }

  protected datasetActual(): ReporteDataset | undefined { return this.catalogo().datasets.find((item) => item.key === this.datasetKey()); }
  protected reporteActual(): ReporteEstatico | undefined { return this.catalogo().staticReports.find((item) => item.key === this.reporteKey()); }
  protected reporteLabel(reporte: ReporteEstatico): string {
    const fallback: Record<string, string> = {
      pacientes_activos: 'Pacientes activos', citas_por_fecha: 'Citas por fecha', consultas_clinicas: 'Consultas clínicas',
      diagnosticos_registrados: 'Diagnósticos registrados', usuarios_por_rol: 'Usuarios por rol',
    };
    return reporte.label && reporte.label !== reporte.key ? reporte.label : fallback[reporte.key] ?? (reporte.label || reporte.key);
  }
  protected reporteIcon(reporte: ReporteEstatico): string {
    if (reporte.key.includes('paciente')) return 'PA';
    if (reporte.key.includes('cita')) return 'CI';
    if (reporte.key.includes('consulta')) return 'CO';
    if (reporte.key.includes('diagn')) return 'DI';
    if (reporte.key.includes('usuario')) return 'US';
    return 'RE';
  }
  protected camposDinamicos(): ReporteCampo[] { return this.datasetActual()?.fields ?? []; }
  protected camposEstaticos(): ReporteCampo[] { return this.reporteActual()?.filters ?? []; }
  protected camposOrdenables(): ReporteCampo[] { return this.camposDinamicos().filter((field) => field.sortable); }
  protected campoFiltro(filtro: FiltroEdicion): ReporteCampo | undefined {
    return (this.modo() === 'dinamico' ? this.camposDinamicos() : this.camposEstaticos()).find((field) => field.key === filtro.field);
  }
  protected esBetween(filtro: FiltroEdicion): boolean { return filtro.operator === 'between'; }
  protected esIn(filtro: FiltroEdicion): boolean { return filtro.operator === 'in'; }
  protected esBooleano(filtro: FiltroEdicion): boolean { return this.campoFiltro(filtro)?.type === 'boolean'; }
  protected esFecha(filtro: FiltroEdicion): boolean { return ['date', 'datetime'].includes(this.campoFiltro(filtro)?.type ?? ''); }
  protected puedeEjecutar(): boolean {
    return this.modo() === 'estatico'
      ? Boolean(this.reporteActual())
      : Boolean(this.datasetActual() && this.columnas().length > 0);
  }
  protected vozSoportada(): boolean { return this.voice.isSupported(); }
  protected vozEstado(): string { return this.voice.state(); }
  protected vozMensaje(): string | null { return this.voice.mensajeError(); }
  protected esNulo(row: Record<string, unknown>, key: string): boolean { return row[key] === null || row[key] === undefined || row[key] === ''; }
  protected esBooleanoValor(row: Record<string, unknown>, key: string): boolean { return typeof row[key] === 'boolean'; }
  protected textoValor(row: Record<string, unknown>, key: string): string {
    if (this.esNulo(row, key)) return '—';
    const value = row[key];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T|\s)/.test(value)) return String(value);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(date);
  }

  seleccionarModo(modo: 'estatico' | 'dinamico'): void {
    this.modo.set(modo);
    this.ordenes.set([]);
    this.preview.set(null);
    this.error.set(null);
    this.interpretacionIa.set(null);
  }
  seleccionarDataset(key: string): void {
    this.datasetKey.set(key);
    const fields = this.datasetActual()?.fields ?? this.catalogo().datasets.find((item) => item.key === key)?.fields ?? [];
    this.columnas.set(fields.filter((field) => field.default).map((field) => field.key));
    this.filtros.set([]); this.ordenes.set([]); this.preview.set(null); this.limite.set(null);
  }
  seleccionarReporte(key: string): void {
    this.reporteKey.set(key); this.filtros.set([]); this.preview.set(null); this.limite.set(null);
  }
  alternarColumna(key: string, checked: boolean): void {
    this.columnas.update((columns) => checked ? [...columns, key] : columns.filter((item) => item !== key));
  }
  agregarFiltro(): void {
    const field = (this.modo() === 'dinamico' ? this.camposDinamicos() : this.camposEstaticos())[0];
    if (!field) return;
    this.filtros.update((items) => [...items, { field: field.key, operator: field.operators[0] ?? '', value: null, valueText: '', valueText2: '' }]);
  }
  eliminarFiltro(index: number): void { this.filtros.update((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  cambiarCampoFiltro(index: number, field: string): void {
    this.filtros.update((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, field, operator: this.campoDisponible(field)?.operators[0] ?? '', value: null, valueText: '', valueText2: '' } : item));
  }
  cambiarOperadorFiltro(index: number, operator: string): void { this.filtros.update((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, operator, value: null, valueText: '', valueText2: '' } : item)); }
  agregarOrden(): void { const field = this.camposOrdenables()[0]; if (field && this.ordenes().length < 3) this.ordenes.update((items) => [...items, { field: field.key, direction: 'asc' }]); }
  eliminarOrden(index: number): void { this.ordenes.update((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  limpiar(): void { this.filtros.set([]); this.ordenes.set([]); this.preview.set(null); this.error.set(null); }

  abrirVoz(): void {
    this.focusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.vozAbierta.set(true);
    this.transcriptVoz.set('');
    this.vozError.set(null);
    this.interpretacionIa.set(null);
    this.volverADictar();
    this.enfocarModal('voice-title');
  }
  volverADictar(): void {
    this.voiceAttemptSubscription?.unsubscribe();
    this.voiceAttemptSubscription = null;
    this.vozError.set(null);
    this.interpretacionIa.set(null);
    let sessionId = 0;
    this.voiceAttemptSubscription = merge(this.voice.results$, this.voice.terminal$).pipe(
      filter((event) => event.sessionId === sessionId),
      take(1),
    ).subscribe((event) => {
      if ('transcript' in event) this.transcriptVoz.set(event.transcript);
      this.voiceAttemptSubscription = null;
    });
    sessionId = this.voice.start({ fallbackLang: 'es-ES' });
    if (!this.voice.isSupported()) {
      this.voiceAttemptSubscription.unsubscribe();
      this.voiceAttemptSubscription = null;
    }
  }
  detenerVoz(): void {
    this.voice.stop();
    this.voiceAttemptSubscription?.unsubscribe();
    this.voiceAttemptSubscription = null;
  }
  cancelarVoz(): void {
    this.voice.stop();
    this.voiceAttemptSubscription?.unsubscribe();
    this.voiceAttemptSubscription = null;
    this.vozAbierta.set(false);
    this.interpretandoVoz.set(false);
    this.restaurarFoco();
  }
  interpretarVoz(): void {
    const texto = this.transcriptVoz().trim();
    if (!texto || this.voice.state() === 'listening') return;
    this.interpretandoVoz.set(true); this.vozError.set(null);
    this.service.interpretarReporte(texto).subscribe({
      next: (resultado) => {
        this.interpretandoVoz.set(false);
        if (resultado.requiere_aclaracion) {
          this.interpretacionIa.set(resultado);
          return;
        }
        this.aplicarInterpretacion(resultado);
        this.interpretacionIa.set(resultado);
      },
      error: (error: unknown) => { this.interpretandoVoz.set(false); this.vozError.set(this.mensajeErrorVoz(error)); },
    });
  }

  private aplicarInterpretacion(resultado: ReporteInterpretacionIa): void {
    const dataset = this.catalogo().datasets.find((item) => item.key === resultado.dataset);
    if (!dataset) return;
    const fields = dataset.fields;
    const validColumns = (resultado.columnas ?? resultado.columns ?? []).filter((key) => fields.some((field) => field.key === key));
    this.modo.set('dinamico');
    this.datasetKey.set(dataset.key);
    this.columnas.set(validColumns.length ? validColumns : fields.filter((field) => field.default).map((field) => field.key));
    const rawFilters = resultado.filtros ?? resultado.filters ?? [];
    this.filtros.set(rawFilters.flatMap((raw) => {
      const field = String(raw['campo'] ?? raw['field'] ?? '');
      const operator = String(raw['operador'] ?? raw['operator'] ?? '');
      const definition = fields.find((item) => item.key === field);
      if (!definition || !definition.operators.includes(operator)) return [];
      const value = raw['valor'] ?? raw['value'];
      const values = Array.isArray(value) ? value : [value];
      return [{ field, operator, value: null, valueText: String(values[0] ?? ''), valueText2: String(values[1] ?? '') }];
    }));
    const rawOrders = resultado.orden ?? resultado.order_by ?? [];
    this.ordenes.set(rawOrders.flatMap((raw) => {
      const field = String(raw['campo'] ?? raw['field'] ?? '');
      const direction = raw['direccion'] ?? raw['direction'];
      const definition = fields.find((item) => item.key === field);
      return definition?.sortable && (direction === 'asc' || direction === 'desc') ? [{ field, direction }] : [];
    }).slice(0, 3) as OrdenEdicion[]);
    if (typeof resultado.limit === 'number' && Number.isInteger(resultado.limit) && resultado.limit >= 1 && resultado.limit <= 200) this.limite.set(resultado.limit);
    this.preview.set(null);
    this.error.set(null);
  }

  protected fuenteInterpretada(): string { const dataset = this.catalogo().datasets.find((item) => item.key === this.interpretacionIa()?.dataset); return dataset?.label ?? this.interpretacionIa()?.dataset ?? 'No especificada'; }
  protected columnasInterpretadas(): string { const result = this.interpretacionIa(); return (result?.columnas ?? result?.columns ?? []).map((key) => this.catalogo().datasets.flatMap((dataset) => dataset.fields).find((field) => field.key === key)?.label ?? key).join(', ') || 'Predeterminadas'; }
  protected filtrosInterpretados(): string { const count = (this.interpretacionIa()?.filtros ?? this.interpretacionIa()?.filters ?? []).length; return count ? `${count} filtro${count === 1 ? '' : 's'} válidos` : 'Sin filtros'; }
  protected ordenInterpretado(): string { const orders = this.interpretacionIa()?.orden ?? this.interpretacionIa()?.order_by ?? []; return orders.length ? orders.map((item) => `${String(item['campo'] ?? item['field'])} ${String(item['direccion'] ?? item['direction'])}`).join(', ') : 'Predeterminado'; }
  protected mensajeErrorVoz(err: unknown): string { const status = err instanceof HttpErrorResponse ? err.status : (err as { status?: number })?.status; return status === 403 ? 'No tienes permiso para interpretar reportes.' : status === 422 ? 'No se pudo interpretar el texto ingresado.' : status === 502 ? 'La IA devolvió una respuesta que no pudo procesarse.' : status === 503 ? 'El servicio de IA no está disponible.' : 'No se pudo procesar la consulta por voz.'; }

  previsualizar(): void {
    const request = this.construirRequest();
    if (!request || (this.modo() === 'dinamico' && this.columnas().length === 0)) { this.error.set('Revisa columnas, filtros u ordenamiento.'); return; }
    this.procesando.set('preview'); this.error.set(null);
    const operation = this.modo() === 'dinamico' ? this.service.previsualizarDinamico(request) : this.service.previsualizarEstatico(this.reporteKey(), request);
    operation.subscribe({ next: (value) => { this.preview.set(value); this.procesando.set(null); }, error: (err: unknown) => { this.procesando.set(null); this.error.set(this.mensajeError(err)); } });
  }
  exportar(formato: ReporteFormato): void {
    const request = this.construirRequest();
    if (!request || (this.modo() === 'dinamico' && this.columnas().length === 0)) { this.error.set('Revisa columnas, filtros u ordenamiento.'); return; }
    this.procesando.set(formato); this.error.set(null);
    const operation = this.modo() === 'dinamico' ? this.service.exportarDinamico(formato, request) : this.service.exportarEstatico(this.reporteKey(), formato, request);
    operation.subscribe({ next: (response) => { this.descargar(response.body, ReportesService.filename(response, formato)); this.procesando.set(null); }, error: (err: unknown) => { this.procesando.set(null); this.error.set(this.mensajeError(err)); } });
  }
  abrirEmail(): void {
    if (!this.puedeEjecutar()) return;
    this.focusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.emailAbierto.set(true); this.emailError.set(null); this.emailExito.set(null);
    this.enfocarModal('email-title');
  }
  cerrarEmail(): void {
    if (this.procesando() === 'email') return;
    this.emailAbierto.set(false);
    this.restaurarFoco();
  }
  enviarEmail(): void {
    const request = this.construirRequest();
    const destinatario = this.emailDestinatario().trim();
    const asunto = this.emailAsunto().trim();
    if (!request || !this.puedeEjecutar() || !this.emailValido(destinatario) || !asunto || asunto.length > 150 || this.emailMensaje().length > 1000) {
      this.emailError.set('Revisa los campos requeridos del correo.'); return;
    }
    this.procesando.set('email'); this.emailError.set(null); this.emailExito.set(null);
    const email = { destinatario, formato: this.emailFormato(), asunto, mensaje: this.emailMensaje() };
    const operation = this.modo() === 'dinamico' ? this.service.enviarEmailDinamico(email, request) : this.service.enviarEmailEstatico(this.reporteKey(), email, request);
    operation.subscribe({ next: () => { this.procesando.set(null); this.emailExito.set('Reporte enviado correctamente.'); }, error: (err: unknown) => { this.procesando.set(null); this.emailError.set(this.mensajeErrorEmail(err)); } });
  }
  protegerEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (this.vozAbierta()) this.cancelarVoz();
    else if (this.emailAbierto()) this.cerrarEmail();
  }
  alternarSidebar(): void { this.sidebarMovilAbierto.update((value) => !value); }
  cerrarSidebar(): void { this.sidebarMovilAbierto.set(false); }
  cerrarSesion(): void { this.authService.logout(); this.router.navigate(['/login']); }

  private enfocarModal(titleId: string): void {
    setTimeout(() => {
      const modal = (this.elementRef.nativeElement as HTMLElement).querySelector(`[aria-labelledby="${titleId}"]`) as HTMLElement | null;
      modal?.focus();
    });
  }

  private restaurarFoco(): void {
    const element = this.focusReturn;
    this.focusReturn = null;
    setTimeout(() => element?.focus());
  }

  private campoDisponible(key: string): ReporteCampo | undefined { return (this.modo() === 'dinamico' ? this.camposDinamicos() : this.camposEstaticos()).find((field) => field.key === key); }
  private construirRequest(): ReporteRequest | null {
    if (this.modo() === 'dinamico' && !this.datasetKey()) return null;
    if (this.modo() === 'estatico' && !this.reporteKey()) return null;
    const filters: ReporteFiltro[] = [];
    for (const item of this.filtros()) {
       if (!item.field || !item.operator || !item.valueText.trim() || (this.esBetween(item) && !item.valueText2.trim())) return null;
        const value = this.esIn(item)
          ? item.valueText.split(',').map((part) => part.trim()).filter(Boolean).map((part) => this.convertirValor(part, item))
          : this.convertirValor(item.valueText, item);
       filters.push({ field: item.field, operator: item.operator, value, ...(this.esBetween(item) ? { value2: this.convertirValor(item.valueText2, item) } : {}) });
    }
     const limit = this.limite();
     const limitPayload: { limit?: number } = limit === null ? {} : { limit };
     if (this.modo() === 'estatico') return { filters, ...limitPayload };
     return { dataset: this.datasetKey(), columns: this.columnas(), filters, ...limitPayload, ...(this.ordenes().length ? { order_by: this.ordenes().map(({ field, direction }) => ({ field, direction })) } : {}) };
  }
  private convertirValor(value: string, filtro: FiltroEdicion): string | number | boolean {
    const type = this.campoFiltro(filtro)?.type ?? 'text';
    if (type === 'boolean') return value === 'true';
    if (['number', 'integer', 'float', 'decimal'].includes(type)) return Number(value);
    return value;
  }
  private descargar(blob: Blob | null, filename: string): void { if (!blob) return; const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
  private emailValido(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
  private mensajeErrorEmail(err: unknown): string { const status = err instanceof HttpErrorResponse ? err.status : (err as { status?: number })?.status; return status === 403 ? 'No tienes permiso para enviar reportes.' : status === 422 ? 'Revisa el destinatario o la configuración.' : status === 503 ? 'El servicio de correo no está disponible o no está configurado.' : 'No se pudo enviar el reporte.'; }
  private mensajeError(err: unknown): string { const status = err instanceof HttpErrorResponse ? err.status : (err as { status?: number })?.status; return status === 403 ? 'No tienes permiso para generar reportes.' : status === 404 ? 'El reporte solicitado no existe.' : status === 422 ? 'Revisa la configuración del reporte.' : 'No se pudo completar la operación.'; }
}
