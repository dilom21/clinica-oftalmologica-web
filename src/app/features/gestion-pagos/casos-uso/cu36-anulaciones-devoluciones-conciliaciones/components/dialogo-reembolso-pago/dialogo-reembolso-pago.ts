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
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  AjusteDetalleCrear,
  EVIDENCIA_MAXIMA,
  EVIDENCIA_MINIMA,
  MAX_SERVICIOS_AJUSTE,
  MIN_SERVICIOS_AJUSTE,
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  NATURALEZAS_AJUSTE,
  NaturalezaAjuste,
  REFERENCIA_LONGITUD,
  ReembolsarPagoSolicitud,
  centavosDeMonto,
  etiquetaNaturalezaAjuste,
  formatearMonto,
  montoDeCentavos,
  sumarMontos,
} from '../../models/ajustes-pagos.models';
import {
  PagoAdministrativo,
  etiquetaEstadoPago,
  referenciaPago,
} from '../../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import {
  mensajeImportePositivo,
  mensajeMoneda,
  mensajeTextoAjuste,
  validarImportePositivo,
  validarMonedaAjuste,
  validarTextoAjuste,
} from '../../validadores/ajustes.validadores';

type FilaDistribucion = FormGroup<{
  servicio_realizado_id: FormControl<number>;
  monto: FormControl<string>;
}>;

/**
 * Diálogo de devolución o reembolso.
 *
 * El operador escribe el importe en positivo; el contrato del backend exige un
 * `importe` negativo y una distribución negativa, así que la conversión se
 * muestra explícitamente antes de enviar. El componente no sabe si el reembolso
 * lo ejecutará la pasarela: un 200 con `PENDIENTE_PROVEEDOR` o `DESCONOCIDO`
 * sigue sin ser una devolución confirmada, y el diálogo no afirma lo contrario.
 *
 * Sólo compone el cuerpo de `POST /pagos/administrativos/{id}/reembolsos`.
 */
@Component({
  selector: 'app-dialogo-reembolso-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialogo-reembolso-pago.html',
  styleUrl: './dialogo-reembolso-pago.css',
})
export class DialogoReembolsoPago implements OnInit, AfterViewInit {
  readonly pago = input.required<PagoAdministrativo>();
  readonly nombrePaciente = input('Paciente');
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<ReembolsarPagoSolicitud>();
  readonly cancelar = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly naturalezas = NATURALEZAS_AJUSTE;
  protected readonly etiquetaNaturaleza = etiquetaNaturalezaAjuste;
  protected readonly etiquetaEstado = etiquetaEstadoPago;
  protected readonly referenciaVisible = referenciaPago;
  protected readonly formatear = formatearMonto;

  protected readonly motivoMinimo = MOTIVO_MINIMO;
  protected readonly motivoMaximo = MOTIVO_MAXIMO;
  protected readonly evidenciaMinima = EVIDENCIA_MINIMA;
  protected readonly evidenciaMaxima = EVIDENCIA_MAXIMA;
  protected readonly referenciaMinima = REFERENCIA_LONGITUD.min;
  protected readonly referenciaMaxima = REFERENCIA_LONGITUD.max;

  protected readonly distribucion = this.fb.array<FilaDistribucion>([]);

  protected readonly formulario = this.fb.nonNullable.group({
    montoADevolver: ['', [validarImportePositivo]],
    motivo: ['', [validarTextoAjuste(MOTIVO_MINIMO, MOTIVO_MAXIMO, true)]],
    naturaleza: this.fb.nonNullable.control<NaturalezaAjuste | ''>('', [
      Validators.required,
    ]),
    moneda: ['', [validarMonedaAjuste]],
    evidencia: ['', [validarTextoAjuste(EVIDENCIA_MINIMA, EVIDENCIA_MAXIMA, false)]],
    referencia_devolucion: [
      '',
      [validarTextoAjuste(REFERENCIA_LONGITUD.min, REFERENCIA_LONGITUD.max, false)],
    ],
    distribucion: this.distribucion,
  });

  protected readonly valores = signal(this.formulario.getRawValue());

  /** Mientras sea verdadero, la única fila sigue al importe automáticamente. */
  private readonly distribucionAutomatica = signal(true);

  private readonly botonCancelar = viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');

  protected readonly serviciosElegibles = computed<number[]>(
    () => this.pago().servicio_realizado_ids ?? [],
  );

  protected readonly filas = computed(() => this.valores().distribucion);

  /** El operador escribe positivo; el contrato exige negativo. */
  protected readonly importePositivoCentavos = computed<number | null>(() => {
    const centavos = centavosDeMonto(this.valores().montoADevolver);
    return centavos === null ? null : Math.abs(centavos);
  });

  protected readonly importeNegativo = computed<string | null>(() => {
    const centavos = this.importePositivoCentavos();
    return centavos === null ? null : montoDeCentavos(-Math.abs(centavos));
  });

  protected readonly importeVigente = computed<string>(
    () => this.pago().importe_vigente ?? this.pago().monto,
  );

  protected readonly saldoVigenteCentavos = computed<number | null>(() =>
    centavosDeMonto(this.pago().importe_vigente),
  );

  protected readonly excedeSaldo = computed<boolean>(() => {
    const saldo = this.saldoVigenteCentavos();
    const importe = this.importePositivoCentavos();
    return saldo !== null && importe !== null && importe > saldo;
  });

  /** Saldo que quedaría tras una devolución válida, si el servidor lo informa. */
  protected readonly saldoRestante = computed<string | null>(() => {
    const saldo = this.saldoVigenteCentavos();
    const importe = this.importePositivoCentavos();
    if (saldo === null || importe === null || importe > saldo) {
      return null;
    }
    return montoDeCentavos(saldo - importe);
  });

  protected readonly distribuido = computed<string | null>(() =>
    sumarMontos(this.filas().map((fila) => fila.monto)),
  );

  protected readonly diferencia = computed<string | null>(() => {
    const centavos = this.diferenciaCentavos();
    return centavos === null ? null : montoDeCentavos(centavos);
  });

  protected readonly monedaActual = computed<string>(() => {
    const moneda = this.valores().moneda.trim();
    return moneda.length > 0 ? moneda : this.pago().moneda;
  });

  protected readonly erroresDistribucion = computed<string[]>(() => {
    const errores: string[] = [];
    const filas = this.filas();
    const elegibles = this.serviciosElegibles();

    if (elegibles.length === 0) {
      errores.push('El pago no informa servicios realizados; no se puede distribuir la devolución.');
    }
    if (filas.length < MIN_SERVICIOS_AJUSTE) {
      errores.push('Agrega al menos un servicio a la distribución.');
    }
    if (filas.length > MAX_SERVICIOS_AJUSTE) {
      errores.push(`La distribución admite como máximo ${MAX_SERVICIOS_AJUSTE} servicios.`);
    }

    const ids = filas.map((fila) => fila.servicio_realizado_id);
    if (new Set(ids).size !== ids.length) {
      errores.push('Cada servicio puede aparecer una sola vez en la distribución.');
    }
    if (ids.some((id) => !elegibles.includes(id))) {
      errores.push('La distribución incluye un servicio que no pertenece al pago.');
    }

    const total = centavosDeMonto(this.importeNegativo());
    if (total !== null) {
      for (const fila of filas) {
        const centavos = centavosDeMonto(fila.monto);
        if (centavos === null) {
          errores.push('El monto de cada fila debe ser un importe con hasta dos decimales.');
          break;
        }
        if (centavos >= 0) {
          errores.push('Cada fila debe llevar un monto negativo, igual que el importe total.');
          break;
        }
      }
    }

    if (this.diferenciaCentavos() !== 0 && this.diferenciaCentavos() !== null) {
      errores.push('La suma distribuida debe coincidir exactamente con el importe.');
    }

    return errores;
  });

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.valores.set(this.formulario.getRawValue()));
  }

  ngOnInit(): void {
    const pago = this.pago();
    this.formulario.controls.moneda.setValue(pago.moneda);
    this.reiniciarDistribucion(pago.servicio_realizado_ids?.[0] ?? null);
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

  // --- Distribución -------------------------------------------------------

  protected puedeAgregarFila(): boolean {
    if (this.procesando()) {
      return false;
    }
    const usados = new Set(this.filas().map((fila) => fila.servicio_realizado_id));
    return (
      this.filas().length < MAX_SERVICIOS_AJUSTE &&
      this.serviciosElegibles().some((id) => !usados.has(id))
    );
  }

  protected agregarFila(): void {
    if (!this.puedeAgregarFila()) {
      return;
    }
    const usados = new Set(this.filas().map((fila) => fila.servicio_realizado_id));
    const libre = this.serviciosElegibles().find((id) => !usados.has(id));
    if (libre === undefined) {
      return;
    }
    this.distribucion.push(this.crearFila(libre, ''));
    this.distribucionAutomatica.set(false);
    this.sincronizarFormulario();
  }

  protected quitarFila(indice: number): void {
    if (this.procesando() || this.distribucion.length <= MIN_SERVICIOS_AJUSTE) {
      return;
    }
    this.distribucion.removeAt(indice);
    this.distribucionAutomatica.set(false);
    this.sincronizarFormulario();
  }

  protected distribuirTodoEnElPrimero(): void {
    if (this.procesando()) {
      return;
    }
    this.distribucionAutomatica.set(true);
    this.reiniciarDistribucion(this.serviciosElegibles()[0] ?? null);
  }

  protected marcarEdicionManual(): void {
    this.distribucionAutomatica.set(false);
  }

  /**
   * Sin precios por servicio, la fila única sigue al importe mientras el
   * operador no la edite a mano. Se recalcula desde el valor del evento para no
   * depender del orden de los listeners del formulario.
   */
  protected alCambiarImporte(valorCrudo: string): void {
    const centavos = centavosDeMonto(valorCrudo);
    if (centavos === null || !this.distribucionAutomatica() || this.distribucion.length !== 1) {
      return;
    }
    this.distribucion.at(0).controls.monto.setValue(montoDeCentavos(-Math.abs(centavos)));
  }

  protected errorFila(indice: number): string | null {
    const fila = this.filas()[indice];
    if (!fila) {
      return null;
    }
    const centavos = centavosDeMonto(fila.monto);
    if (centavos === null) {
      return 'Escribe un importe con dos decimales, por ejemplo -40.00.';
    }
    return centavos >= 0 ? 'Cada fila debe llevar un monto negativo, igual que el importe total.' : null;
  }

  protected diferenciaCero(): boolean {
    return this.diferenciaCentavos() === 0;
  }

  // --- Formulario ---------------------------------------------------------

  protected textoMonto(valor: string | null): string {
    return valor === null ? '—' : this.formatear(valor, this.monedaActual());
  }

  protected errorImporte(): string | null {
    return mensajeImportePositivo(this.formulario.controls.montoADevolver, 'El importe a devolver');
  }

  protected errorMotivo(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.motivo, {
      etiqueta: 'El motivo',
      minimo: MOTIVO_MINIMO,
      maximo: MOTIVO_MAXIMO,
    });
  }

  protected errorNaturaleza(): string | null {
    const control = this.formulario.controls.naturaleza;
    return control.touched && control.invalid ? 'Selecciona la naturaleza del ajuste.' : null;
  }

  protected errorMoneda(): string | null {
    return mensajeMoneda(this.formulario.controls.moneda);
  }

  protected errorEvidencia(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.evidencia, {
      etiqueta: 'La evidencia',
      minimo: EVIDENCIA_MINIMA,
      maximo: EVIDENCIA_MAXIMA,
    });
  }

  protected errorReferencia(): string | null {
    return mensajeTextoAjuste(this.formulario.controls.referencia_devolucion, {
      etiqueta: 'La referencia de la devolución',
      minimo: REFERENCIA_LONGITUD.min,
      maximo: REFERENCIA_LONGITUD.max,
    });
  }

  protected errorSaldo(): string | null {
    if (!this.excedeSaldo()) {
      return null;
    }
    return `El importe supera el saldo vigente (${this.textoMonto(
      this.pago().importe_vigente ?? this.pago().monto,
    )}). Puedes devolver hasta ese saldo.`;
  }

  /** `aria-describedby` del importe: sus dos errores posibles y la ayuda. */
  protected descripcionImporte(): string {
    const ids: string[] = [];
    if (this.errorImporte()) {
      ids.push('reembolso-importe-error');
    }
    if (this.errorSaldo()) {
      ids.push('reembolso-saldo-error');
    }
    ids.push('reembolso-importe-ayuda');
    return ids.join(' ');
  }

  protected puedeEnviar(): boolean {
    return (
      !this.procesando() &&
      this.formulario.valid &&
      this.serviciosElegibles().length > 0 &&
      !this.excedeSaldo() &&
      this.erroresDistribucion().length === 0
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

    const valores = this.formulario.getRawValue();
    const naturaleza = NATURALEZAS_AJUSTE.find((item) => item === valores.naturaleza);
    const importe = this.importeNegativo();
    if (!naturaleza || importe === null) {
      this.formulario.markAllAsTouched();
      return;
    }

    const servicios: AjusteDetalleCrear[] = [];
    for (const fila of valores.distribucion) {
      const centavosFila = centavosDeMonto(fila.monto);
      if (centavosFila === null) {
        this.formulario.markAllAsTouched();
        return;
      }
      servicios.push({
        servicio_realizado_id: fila.servicio_realizado_id,
        monto: montoDeCentavos(centavosFila),
      });
    }

    const moneda = valores.moneda.trim();
    const evidencia = valores.evidencia.trim();
    const referencia = valores.referencia_devolucion.trim();

    this.confirmar.emit({
      motivo: valores.motivo.trim(),
      naturaleza,
      // El contrato exige signo negativo aunque el operador escriba positivo.
      importe,
      moneda: moneda.length > 0 ? moneda : null,
      evidencia: evidencia.length > 0 ? evidencia : null,
      referencia_devolucion: referencia.length > 0 ? referencia : null,
      servicios,
    });
  }

  // --- Internos -----------------------------------------------------------

  private diferenciaCentavos(): number | null {
    const total = centavosDeMonto(this.importeNegativo());
    const distribuido = centavosDeMonto(this.distribuido());
    if (total === null || distribuido === null) {
      return null;
    }
    return distribuido - total;
  }

  private crearFila(servicioId: number, monto: string): FilaDistribucion {
    return this.fb.nonNullable.group({
      servicio_realizado_id: this.fb.nonNullable.control(servicioId),
      monto: this.fb.nonNullable.control(monto),
    });
  }

  private reiniciarDistribucion(servicioId: number | null): void {
    this.distribucion.clear();
    if (servicioId !== null) {
      this.distribucion.push(this.crearFila(servicioId, this.importeNegativo() ?? ''));
    }
    this.sincronizarFormulario();
  }

  private sincronizarFormulario(): void {
    this.valores.set(this.formulario.getRawValue());
  }
}
