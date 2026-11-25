import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  AfterViewInit,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  AnularPagoSolicitud,
  EVIDENCIA_MAXIMA,
  EVIDENCIA_MINIMA,
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  NATURALEZAS_AJUSTE,
  NaturalezaAjuste,
  etiquetaNaturalezaAjuste,
  formatearMonto,
  requiereEvidenciaParaAnular,
} from '../../models/ajustes-pagos.models';
import {
  PagoAdministrativo,
  etiquetaEstadoPago,
  referenciaPago,
} from '../../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import {
  mensajeTextoAjuste,
  validarTextoAjuste,
} from '../../validadores/ajustes.validadores';

/**
 * Diálogo de anulación de un pago.
 *
 * Sólo valida y compone el cuerpo de `POST /pagos/administrativos/{id}/anular`.
 * La petición, la `Idempotency-Key` y el estado de error son del contenedor:
 * este componente nunca ejecuta HTTP y nunca afirma que el dinero volvió.
 */
@Component({
  selector: 'app-dialogo-anular-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialogo-anular-pago.html',
  styleUrl: './dialogo-anular-pago.css',
})
export class DialogoAnularPago implements AfterViewInit {
  readonly pago = input.required<PagoAdministrativo>();
  readonly nombrePaciente = input('Paciente');
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<AnularPagoSolicitud>();
  readonly cancelar = output<void>();

  private readonly fb = inject(FormBuilder);

  protected readonly naturalezas = NATURALEZAS_AJUSTE;
  protected readonly etiquetaNaturaleza = etiquetaNaturalezaAjuste;
  protected readonly etiquetaEstado = etiquetaEstadoPago;
  protected readonly referenciaVisible = referenciaPago;
  protected readonly formatear = formatearMonto;

  protected readonly motivoMinimo = MOTIVO_MINIMO;
  protected readonly motivoMaximo = MOTIVO_MAXIMO;
  protected readonly evidenciaMinima = EVIDENCIA_MINIMA;
  protected readonly evidenciaMaxima = EVIDENCIA_MAXIMA;

  protected readonly formulario = this.fb.nonNullable.group({
    motivo: ['', [validarTextoAjuste(MOTIVO_MINIMO, MOTIVO_MAXIMO, true)]],
    naturaleza: this.fb.nonNullable.control<NaturalezaAjuste | ''>('', [
      Validators.required,
    ]),
    evidencia: ['', [validarTextoAjuste(EVIDENCIA_MINIMA, EVIDENCIA_MAXIMA, false)]],
  });

  /** Importe sobre el que se opera: el vigente si el servidor lo informa. */
  protected readonly importeVigente = computed<string>(
    () => this.pago().importe_vigente ?? this.pago().monto,
  );

  /** El backend exige evidencia sólo sobre pagos aprobados. */
  protected readonly evidenciaObligatoria = computed<boolean>(() =>
    requiereEvidenciaParaAnular(this.pago()),
  );

  private readonly botonCancelar =
    viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');

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

  protected errorMotivo(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.motivo, {
      etiqueta: 'El motivo',
      minimo: MOTIVO_MINIMO,
      maximo: MOTIVO_MAXIMO,
    });
  }

  protected errorEvidencia(): string | null {
    const control = this.formulario.controls.evidencia;
    const valor = control.value.trim();
    if (!valor) {
      // La obligatoriedad es una regla del pago, no un descuido: se anuncia antes de tocar.
      return this.evidenciaObligatoria()
        ? 'La evidencia es obligatoria para este pago: explica por qué el dinero no fue capturado.'
        : null;
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

  protected evidenciaValida(): boolean {
    const valor = this.formulario.controls.evidencia.value.trim();
    if (!valor) {
      return !this.evidenciaObligatoria();
    }
    return valor.length >= EVIDENCIA_MINIMA && valor.length <= EVIDENCIA_MAXIMA;
  }

  protected errorNaturaleza(): string | null {
    const control = this.formulario.controls.naturaleza;
    return control.touched && control.invalid ? 'Selecciona la naturaleza del ajuste.' : null;
  }

  /** El envío se bloquea mientras se procesa o mientras el formulario no es válido. */
  protected puedeEnviar(): boolean {
    return !this.procesando() && this.formulario.valid && this.evidenciaValida();
  }

  protected enviar(): void {
    if (this.procesando()) {
      return;
    }
    if (!this.puedeEnviar()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const naturaleza = NATURALEZAS_AJUSTE.find((item) => item === valores.naturaleza);
    if (!naturaleza) {
      this.formulario.markAllAsTouched();
      return;
    }

    const evidencia = valores.evidencia.trim();
    this.confirmar.emit({
      motivo: valores.motivo.trim(),
      naturaleza,
      // El backend convierte `''` en `null`; se envía `null` explícito.
      evidencia: evidencia.length > 0 ? evidencia : null,
    });
  }
}
