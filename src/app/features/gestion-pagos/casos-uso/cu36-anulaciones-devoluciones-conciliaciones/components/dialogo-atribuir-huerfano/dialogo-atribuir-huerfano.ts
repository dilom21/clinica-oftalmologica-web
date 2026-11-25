import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  AjusteDetalleCrear,
  AtribuirReembolsoHuerfanoSolicitud,
  EVIDENCIA_MAXIMA,
  EVIDENCIA_MINIMA,
  MAX_SERVICIOS_AJUSTE,
  MIN_SERVICIOS_AJUSTE,
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  NATURALEZAS_AJUSTE,
  NaturalezaAjuste,
  ReembolsoHuerfano,
  centavosDeMonto,
  etiquetaNaturalezaAjuste,
  formatearFechaHora,
  formatearMonto,
  montoDeCentavos,
  montoDesdeUnidadesMenores,
} from '../../models/ajustes-pagos.models';
import { mensajeTextoAjuste, validarTextoAjuste } from '../../validadores/ajustes.validadores';

type FilaDistribucion = FormGroup<{
  servicio_realizado_id: FormControl<number>;
  monto: FormControl<string>;
}>;

@Component({
  selector: 'app-dialogo-atribuir-huerfano',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialogo-atribuir-huerfano.html',
  styleUrl: './dialogo-atribuir-huerfano.css',
})
export class DialogoAtribuirHuerfano implements AfterViewInit {
  readonly huerfano = input.required<ReembolsoHuerfano>();
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<AtribuirReembolsoHuerfanoSolicitud>();
  readonly cancelar = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly botonCancelar = viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');

  protected readonly naturalezas = NATURALEZAS_AJUSTE;
  protected readonly etiquetaNaturaleza = etiquetaNaturalezaAjuste;
  protected readonly fecha = formatearFechaHora;
  protected readonly motivoMaximo = MOTIVO_MAXIMO;
  protected readonly evidenciaMaxima = EVIDENCIA_MAXIMA;

  protected readonly distribucion = this.fb.array<FilaDistribucion>([
    this.crearFila(0, ''),
  ]);
  protected readonly formulario = this.fb.nonNullable.group({
    motivo: ['', [validarTextoAjuste(MOTIVO_MINIMO, MOTIVO_MAXIMO, true)]],
    naturaleza: this.fb.nonNullable.control<NaturalezaAjuste | ''>('', [Validators.required]),
    evidencia: ['', [validarTextoAjuste(EVIDENCIA_MINIMA, EVIDENCIA_MAXIMA, true)]],
    distribucion: this.distribucion,
  });
  protected readonly valores = signal(this.formulario.getRawValue());
  protected readonly filas = computed(() => this.valores().distribucion);

  protected readonly objetivoCentavos = computed(() => -Math.abs(this.huerfano().amount));
  protected readonly importeVisible = computed(() =>
    formatearMonto(
      montoDesdeUnidadesMenores(this.huerfano().amount, this.huerfano().currency),
      this.huerfano().currency,
    ),
  );
  protected readonly asignadoCentavos = computed<number | null>(() => {
    let total = 0;
    for (const fila of this.filas()) {
      const monto = centavosDeMonto(fila.monto);
      if (monto === null) return null;
      total += monto;
      if (!Number.isSafeInteger(total)) return null;
    }
    return total;
  });
  protected readonly restanteCentavos = computed<number | null>(() => {
    const asignado = this.asignadoCentavos();
    return asignado === null ? null : this.objetivoCentavos() - asignado;
  });
  protected readonly asignadoVisible = computed(() => this.montoVisible(this.asignadoCentavos()));
  protected readonly restanteVisible = computed(() => this.montoVisible(this.restanteCentavos()));

  protected readonly erroresDistribucion = computed<string[]>(() => {
    const filas = this.filas();
    const errores: string[] = [];
    if (filas.length < MIN_SERVICIOS_AJUSTE) errores.push('Agrega al menos un servicio.');
    if (filas.length > MAX_SERVICIOS_AJUSTE) errores.push(`La distribución admite hasta ${MAX_SERVICIOS_AJUSTE} servicios.`);
    const ids = filas.map((fila) => fila.servicio_realizado_id);
    if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) errores.push('Cada identificador de servicio debe ser un entero positivo.');
    if (new Set(ids).size !== ids.length) errores.push('Cada servicio puede aparecer una sola vez.');
    if (filas.some((fila) => {
      const monto = centavosDeMonto(fila.monto);
      return monto === null || monto >= 0;
    })) errores.push('El monto de cada servicio debe ser estrictamente negativo.');
    if (this.restanteCentavos() !== 0) errores.push('La suma debe coincidir exactamente con el importe del reembolso.');
    return errores;
  });

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.valores.set(this.formulario.getRawValue()));
  }

  ngAfterViewInit(): void {
    this.botonCancelar()?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void { this.cerrar(); }

  protected cerrarAlFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.cerrar();
  }

  protected cerrar(): void {
    if (!this.procesando()) this.cancelar.emit();
  }

  protected agregarFila(): void {
    if (!this.procesando() && this.distribucion.length < MAX_SERVICIOS_AJUSTE) {
      this.distribucion.push(this.crearFila(0, ''));
      this.sincronizar();
    }
  }

  protected quitarFila(indice: number): void {
    if (!this.procesando() && this.distribucion.length > MIN_SERVICIOS_AJUSTE) {
      this.distribucion.removeAt(indice);
      this.sincronizar();
    }
  }

  protected errorMotivo(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.motivo, { etiqueta: 'El motivo', minimo: MOTIVO_MINIMO, maximo: MOTIVO_MAXIMO });
  }

  protected errorEvidencia(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.evidencia, { etiqueta: 'La evidencia', minimo: EVIDENCIA_MINIMA, maximo: EVIDENCIA_MAXIMA });
  }

  protected errorNaturaleza(): string | null {
    const control = this.formulario.controls.naturaleza;
    return control.touched && control.invalid ? 'Selecciona la naturaleza del ajuste.' : null;
  }

  protected servicioInvalido(indice: number): boolean {
    const fila = this.filas()[indice];
    if (!fila || !Number.isSafeInteger(fila.servicio_realizado_id) || fila.servicio_realizado_id <= 0) {
      return true;
    }
    return this.filas().filter(
      (item) => item.servicio_realizado_id === fila.servicio_realizado_id,
    ).length > 1;
  }

  protected montoInvalido(indice: number): boolean {
    const fila = this.filas()[indice];
    const monto = fila ? centavosDeMonto(fila.monto) : null;
    return monto === null || monto >= 0 || this.restanteCentavos() !== 0;
  }

  protected puedeEnviar(): boolean {
    return !this.procesando() && this.formulario.valid && this.erroresDistribucion().length === 0;
  }

  protected enviar(): void {
    if (!this.puedeEnviar()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const naturaleza = NATURALEZAS_AJUSTE.find((item) => item === valores.naturaleza);
    if (!naturaleza) return;
    const servicios: AjusteDetalleCrear[] = valores.distribucion.map((fila) => ({
      servicio_realizado_id: fila.servicio_realizado_id,
      monto: montoDeCentavos(centavosDeMonto(fila.monto)!),
    }));
    this.confirmar.emit({
      motivo: valores.motivo.trim(),
      naturaleza,
      evidencia: valores.evidencia.trim(),
      servicios,
    });
  }

  private crearFila(servicioId: number, monto: string): FilaDistribucion {
    return this.fb.nonNullable.group({
      servicio_realizado_id: this.fb.nonNullable.control(servicioId),
      monto: this.fb.nonNullable.control(monto),
    });
  }

  private sincronizar(): void { this.valores.set(this.formulario.getRawValue()); }

  private montoVisible(centavos: number | null): string {
    return centavos === null ? '—' : formatearMonto(montoDeCentavos(centavos), this.huerfano().currency);
  }
}
