import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  ConciliarAjusteSolicitud,
  EVIDENCIA_MAXIMA,
  EVIDENCIA_MINIMA,
  OBSERVACIONES_MAXIMA,
  PagoAjuste,
  REFERENCIA_LONGITUD,
  RESULTADOS_CONCILIACION,
  ResultadoConciliacion,
  descripcionEstadoAjuste,
  etiquetaEstadoAjuste,
  etiquetaNaturalezaAjuste,
  etiquetaResultadoConciliacion,
  etiquetaTipoAjuste,
  formatearMonto,
} from '../../models/ajustes-pagos.models';
import {
  mensajeTextoAjuste,
  validarTextoAjuste,
} from '../../validadores/ajustes.validadores';

/**
 * Diálogo de conciliación manual de un ajuste (CU36).
 *
 * Sólo compone el cuerpo de `POST /pagos/administrativos/ajustes/{id}/conciliar`
 * y valida las dos reglas que el backend aplica con 409:
 *
 * 1. Un ajuste con efecto `DEVOLUCION_STRIPE` lo resuelve el proveedor: el
 *    servidor ignora `resultado`, así que el selector se oculta y se envía el
 *    único valor que no tergiversa el desenlace (`CONFIRMADO`). Si además el
 *    operador aporta `refund_id`, la evidencia pasa a ser obligatoria.
 * 2. En un ajuste manual, confirmar la conciliación exige evidencia.
 *
 * Nunca ejecuta HTTP: el contenedor envía y traduce el error.
 */
@Component({
  selector: 'app-dialogo-conciliar-ajuste',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialogo-conciliar-ajuste.html',
  styleUrl: './dialogo-conciliar-ajuste.css',
})
export class DialogoConciliarAjuste implements OnInit, AfterViewInit {
  readonly ajuste = input.required<PagoAjuste>();
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<ConciliarAjusteSolicitud>();
  readonly cancelar = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly resultados = RESULTADOS_CONCILIACION;
  protected readonly etiquetaResultado = etiquetaResultadoConciliacion;
  protected readonly etiquetaTipo = etiquetaTipoAjuste;
  protected readonly etiquetaNaturaleza = etiquetaNaturalezaAjuste;
  protected readonly etiquetaEstado = etiquetaEstadoAjuste;
  protected readonly descripcionEstado = descripcionEstadoAjuste;
  protected readonly formatear = formatearMonto;

  protected readonly evidenciaMinima = EVIDENCIA_MINIMA;
  protected readonly evidenciaMaxima = EVIDENCIA_MAXIMA;
  protected readonly observacionesMaxima = OBSERVACIONES_MAXIMA;
  protected readonly referenciaMinima = REFERENCIA_LONGITUD.min;
  protected readonly referenciaMaxima = REFERENCIA_LONGITUD.max;

  protected readonly formulario = this.fb.nonNullable.group({
    resultado: this.fb.nonNullable.control<ResultadoConciliacion | ''>('', [
      Validators.required,
    ]),
    evidencia: ['', [validarTextoAjuste(EVIDENCIA_MINIMA, EVIDENCIA_MAXIMA, false)]],
    observaciones: ['', [validarTextoAjuste(1, OBSERVACIONES_MAXIMA, false)]],
    refund_id: ['', [validarTextoAjuste(REFERENCIA_LONGITUD.min, REFERENCIA_LONGITUD.max, false)]],
  });

  protected readonly valores = signal(this.formulario.getRawValue());

  private readonly botonCancelar = viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');

  /**
   * El reembolso de Stripe lo resuelve el proveedor: el backend ignora
   * `resultado` y fija el estado final según lo que Stripe reporte.
   */
  protected readonly reembolsoProveedor = computed<boolean>(
    () => this.ajuste().efecto_caja === 'DEVOLUCION_STRIPE',
  );

  protected readonly resultadoElegido = computed<ResultadoConciliacion | null>(() => {
    const valor = this.valores().resultado;
    return RESULTADOS_CONCILIACION.find((item) => item === valor) ?? null;
  });

  /** `refund_id` escrito por el operador: activa la evidencia obligatoria. */
  protected readonly refundIdPresente = computed<boolean>(
    () => this.valores().refund_id.trim().length > 0,
  );

  /**
   * Dos reglas distintas del backend, nunca una heurística:
   * con `refund_id` en un reembolso del proveedor, y al confirmar un ajuste
   * manual, la evidencia es obligatoria (409 si falta).
   */
  protected readonly evidenciaObligatoria = computed<boolean>(() =>
    this.reembolsoProveedor()
      ? this.refundIdPresente()
      : this.resultadoElegido() === 'CONFIRMADO',
  );

  protected readonly ayudaEvidencia = computed<string>(() => {
    if (this.reembolsoProveedor()) {
      return this.refundIdPresente()
        ? 'Obligatoria: registraste el identificador del reembolso del proveedor y el servidor exige la evidencia que lo respalda.'
        : `Opcional. De ${EVIDENCIA_MINIMA} a ${EVIDENCIA_MAXIMA} caracteres; pasa a ser obligatoria si registras el identificador del reembolso.`;
    }
    return this.resultadoElegido() === 'CONFIRMADO'
      ? 'Obligatoria: confirmar la conciliación exige la evidencia que respalda el asiento.'
      : `Opcional. De ${EVIDENCIA_MINIMA} a ${EVIDENCIA_MAXIMA} caracteres con el soporte de la verificación.`;
  });

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.valores.set(this.formulario.getRawValue()));
  }

  ngOnInit(): void {
    if (this.reembolsoProveedor()) {
      // El selector no se muestra: se fija el único literal válido.
      this.formulario.controls.resultado.setValue('CONFIRMADO');
    }
    this.sincronizarValores();
  }

  ngAfterViewInit(): void {
    this.botonCancelar()?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void {
    this.cerrar();
  }

  protected cerrarAlFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.cerrar();
    }
  }

  protected cerrar(): void {
    if (this.procesando()) {
      return;
    }
    this.cancelar.emit();
  }

  // --- Formulario ---------------------------------------------------------

  protected errorResultado(): string | null {
    const control = this.formulario.controls.resultado;
    return control.touched && control.invalid
      ? 'Selecciona el resultado de la conciliación.'
      : null;
  }

  protected errorEvidencia(): string | null {
    const control = this.formulario.controls.evidencia;
    const valor = control.value.trim();
    if (!valor) {
      // La obligatoriedad depende del ajuste, no de un descuido del operador.
      if (!this.evidenciaObligatoria()) {
        return null;
      }
      return this.reembolsoProveedor()
        ? 'La evidencia es obligatoria cuando registras el identificador del reembolso del proveedor.'
        : 'La evidencia es obligatoria para confirmar la conciliación.';
    }
    if (!control.touched) {
      return null;
    }
    if (valor.length < EVIDENCIA_MINIMA) {
      return `La evidencia debe tener al menos ${EVIDENCIA_MINIMA} caracteres.`;
    }
    if (valor.length > EVIDENCIA_MAXIMA) {
      return `La evidencia no puede superar ${EVIDENCIA_MAXIMA} caracteres.`;
    }
    return null;
  }

  protected errorObservaciones(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.observaciones, {
      etiqueta: 'Las observaciones',
      minimo: 1,
      maximo: OBSERVACIONES_MAXIMA,
    });
  }

  protected errorRefund(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.refund_id, {
      etiqueta: 'El identificador del reembolso',
      minimo: REFERENCIA_LONGITUD.min,
      maximo: REFERENCIA_LONGITUD.max,
    });
  }

  private evidenciaValida(): boolean {
    const valor = this.formulario.controls.evidencia.value.trim();
    if (!valor) {
      return !this.evidenciaObligatoria();
    }
    return valor.length >= EVIDENCIA_MINIMA && valor.length <= EVIDENCIA_MAXIMA;
  }

  private resultadoValido(): boolean {
    return this.reembolsoProveedor() || this.resultadoElegido() !== null;
  }

  /** El envío se bloquea mientras se procesa o mientras el formulario no es válido. */
  protected puedeEnviar(): boolean {
    return (
      !this.procesando() &&
      this.formulario.valid &&
      this.resultadoValido() &&
      this.evidenciaValida()
    );
  }

  protected enviar(): void {
    if (this.procesando()) {
      return;
    }
    if (!this.puedeEnviar()) {
      this.formulario.markAllAsTouched();
      return;
    }

    // Con `DEVOLUCION_STRIPE` el proveedor manda: el único literal honesto.
    const resultado: ResultadoConciliacion = this.reembolsoProveedor()
      ? 'CONFIRMADO'
      : this.resultadoElegido() ?? 'CONFIRMADO';

    const valores = this.formulario.getRawValue();
    const evidencia = valores.evidencia.trim();
    const observaciones = valores.observaciones.trim();
    const refund = valores.refund_id.trim();

    this.confirmar.emit({
      resultado,
      // El backend convierte `''` en `null`; se envía `null` explícito.
      evidencia: evidencia.length > 0 ? evidencia : null,
      observaciones: observaciones.length > 0 ? observaciones : null,
      refund_id: refund.length > 0 ? refund : null,
    });
  }

  private sincronizarValores(): void {
    this.valores.set(this.formulario.getRawValue());
  }
}
