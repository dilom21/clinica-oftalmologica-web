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
  CorregirPagoSolicitud,
  EVIDENCIA_MAXIMA,
  EVIDENCIA_MINIMA,
  MAX_SERVICIOS_AJUSTE,
  MIN_SERVICIOS_AJUSTE,
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  NATURALEZAS_AJUSTE,
  NATURALEZAS_CORRECCION_AL_ALZA,
  NaturalezaAjuste,
  centavosDeMonto,
  etiquetaNaturalezaAjuste,
  formatearMonto,
  montoDeCentavos,
  requiereEvidenciaParaCorreccionAlAlza,
  sumarMontos,
} from '../../models/ajustes-pagos.models';
import {
  PagoAdministrativo,
  etiquetaEstadoPago,
  referenciaPago,
} from '../../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import {
  mensajeImporteConSigno,
  mensajeMoneda,
  mensajeTextoAjuste,
  validarImporteConSigno,
  validarMonedaAjuste,
  validarTextoAjuste,
} from '../../validadores/ajustes.validadores';

type FilaDistribucion = FormGroup<{
  servicio_realizado_id: FormControl<number>;
  monto: FormControl<string>;
}>;

/**
 * Diálogo de corrección de importe.
 *
 * El importe que escribe el operador es el ajuste con signo: positivo al alza,
 * negativo a la baja. El pago conserva su estado `APROBADO`; sólo cambia el
 * libro de ajustes y, con él, el importe vigente. Una corrección no devuelve
 * dinero por sí sola.
 *
 * La distribución por servicio replica la regla del backend: entre 1 y 50
 * filas, servicios únicos del propio pago, cada fila con el mismo signo que el
 * total y suma exacta igual al importe. El componente sólo compone el cuerpo de
 * `POST /pagos/administrativos/{id}/corregir`.
 */
@Component({
  selector: 'app-dialogo-corregir-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialogo-corregir-pago.html',
  styleUrl: './dialogo-corregir-pago.css',
})
export class DialogoCorregirPago implements OnInit, AfterViewInit {
  readonly pago = input.required<PagoAdministrativo>();
  readonly nombrePaciente = input('Paciente');
  readonly procesando = input(false);
  readonly error = input<string | null>(null);

  readonly confirmar = output<CorregirPagoSolicitud>();
  readonly cancelar = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly etiquetaNaturaleza = etiquetaNaturalezaAjuste;
  protected readonly etiquetaEstado = etiquetaEstadoPago;
  protected readonly referenciaVisible = referenciaPago;
  protected readonly formatear = formatearMonto;

  protected readonly motivoMinimo = MOTIVO_MINIMO;
  protected readonly motivoMaximo = MOTIVO_MAXIMO;
  protected readonly evidenciaMinima = EVIDENCIA_MINIMA;
  protected readonly evidenciaMaxima = EVIDENCIA_MAXIMA;

  protected readonly distribucion = this.fb.array<FilaDistribucion>([]);

  protected readonly formulario = this.fb.nonNullable.group({
    importe: ['', [validarImporteConSigno]],
    motivo: ['', [validarTextoAjuste(MOTIVO_MINIMO, MOTIVO_MAXIMO, true)]],
    naturaleza: this.fb.nonNullable.control<NaturalezaAjuste | ''>('', [
      Validators.required,
    ]),
    moneda: ['', [validarMonedaAjuste]],
    evidencia: ['', [validarTextoAjuste(EVIDENCIA_MINIMA, EVIDENCIA_MAXIMA, false)]],
    distribucion: this.distribucion,
  });

  /** Copia reactiva del formulario: los cálculos de dinero no leen `controls`. */
  protected readonly valores = signal(this.formulario.getRawValue());

  /** Mientras sea verdadero, la única fila sigue al importe automáticamente. */
  private readonly distribucionAutomatica = signal(true);

  private readonly botonCancelar = viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');

  protected readonly serviciosElegibles = computed<number[]>(
    () => this.pago().servicio_realizado_ids ?? [],
  );

  protected readonly filas = computed(() => this.valores().distribucion);

  protected readonly importeCentavos = computed<number | null>(() =>
    centavosDeMonto(this.valores().importe),
  );

  /** Importe canónico de dos decimales, tal como se enviará al servidor. */
  protected readonly importeCanonico = computed<string | null>(() => {
    const centavos = this.importeCentavos();
    return centavos === null ? null : montoDeCentavos(centavos);
  });

  protected readonly importeVigente = computed<string>(
    () => this.pago().importe_vigente ?? this.pago().monto,
  );

  protected readonly distribuido = computed<string | null>(() =>
    sumarMontos(this.filas().map((fila) => fila.monto)),
  );

  protected readonly diferencia = computed<string | null>(() => {
    const centavos = this.diferenciaCentavos();
    return centavos === null ? null : montoDeCentavos(centavos);
  });

  /** Moneda con la que se presentan los importes: la del formulario. */
  protected readonly monedaActual = computed<string>(() => {
    const moneda = this.valores().moneda.trim();
    return moneda.length > 0 ? moneda : this.pago().moneda;
  });

  /** Explica al operador qué signo debe escribir en cada fila. */
  protected readonly pistaSigno = computed<string>(() => {
    const centavos = this.importeCentavos();
    if (centavos === null) {
      return 'Escribe primero el importe para conocer el signo de la distribución.';
    }
    return centavos > 0
      ? 'El ajuste es al alza: cada fila lleva un monto positivo y la suma debe ser exactamente el importe.'
      : 'El ajuste es a la baja: cada fila lleva un monto negativo y la suma debe ser exactamente el importe.';
  });

  protected readonly diferenciaCentavos = computed<number | null>(() => {
    const importe = this.importeCentavos();
    const distribuido = centavosDeMonto(this.distribuido());
    if (importe === null || distribuido === null) {
      return null;
    }
    return distribuido - importe;
  });

  /**
   * Al alza el backend sólo acepta `NATURALEZAS_CORRECCION_AL_ALZA` y exige
   * evidencia: el formulario se restringe en cuanto el importe es positivo.
   */
  protected readonly evidenciaObligatoria = computed<boolean>(() =>
    requiereEvidenciaParaCorreccionAlAlza(this.valores().importe),
  );

  protected readonly naturalezasPermitidas = computed<ReadonlyArray<NaturalezaAjuste>>(
    () =>
      this.evidenciaObligatoria() ? NATURALEZAS_CORRECCION_AL_ALZA : NATURALEZAS_AJUSTE,
  );

  protected readonly etiquetaNaturalezasAlAlza = NATURALEZAS_CORRECCION_AL_ALZA.map(
    etiquetaNaturalezaAjuste,
  ).join(', ');

  protected readonly erroresDistribucion = computed<string[]>(() => {
    const errores: string[] = [];
    const filas = this.filas();
    const elegibles = this.serviciosElegibles();

    if (elegibles.length === 0) {
      errores.push('El pago no informa servicios realizados; no se puede distribuir el ajuste.');
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

    const importe = this.importeCentavos();
    if (importe !== null) {
      const signo = Math.sign(importe);
      for (const fila of filas) {
        const centavos = centavosDeMonto(fila.monto);
        if (centavos === null) {
          errores.push('El monto de cada fila debe ser un importe con hasta dos decimales.');
          break;
        }
        if (Math.sign(centavos) !== signo) {
          errores.push('El monto de cada fila debe tener el mismo signo que el importe total.');
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
    this.sincronizarValores();
  }

  protected quitarFila(indice: number): void {
    if (this.procesando() || this.distribucion.length <= MIN_SERVICIOS_AJUSTE) {
      return;
    }
    this.distribucion.removeAt(indice);
    this.distribucionAutomatica.set(false);
    this.sincronizarValores();
  }

  /** Acción explícita: todo el importe en el primer servicio, una sola fila. */
  protected distribuirTodoEnElPrimero(): void {
    if (this.procesando()) {
      return;
    }
    this.distribucionAutomatica.set(true);
    this.reiniciarDistribucion(this.serviciosElegibles()[0] ?? null);
  }

  /** Una edición manual del operador desactiva el seguimiento automático. */
  protected marcarEdicionManual(): void {
    this.distribucionAutomatica.set(false);
  }

  protected errorFila(indice: number): string | null {
    const fila = this.filas()[indice];
    if (!fila) {
      return null;
    }
    const importe = this.importeCentavos();
    const centavos = centavosDeMonto(fila.monto);
    if (centavos === null) {
      return 'Escribe un importe con hasta dos decimales.';
    }
    if (importe !== null && Math.sign(centavos) !== Math.sign(importe)) {
      return 'El monto debe tener el mismo signo que el importe total.';
    }
    return null;
  }

  protected diferenciaCero(): boolean {
    return this.diferenciaCentavos() === 0;
  }

  // --- Formulario ---------------------------------------------------------

  protected textoMonto(valor: string | null): string {
    return valor === null ? '—' : this.formatear(valor, this.monedaActual());
  }

  protected errorImporte(): string | null {
    return mensajeImporteConSigno(this.formulario.controls.importe, 'El importe');
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

  /**
   * Un ajuste al alza sólo admite `NATURALEZAS_CORRECCION_AL_ALZA`, así que al
   * escribir un importe positivo se corrige la naturaleza ya elegida.
   */
  protected alCambiarImporte(valorCrudo: string): void {
    const centavos = centavosDeMonto(valorCrudo);
    if (centavos !== null && this.distribucionAutomatica() && this.distribucion.length === 1) {
      // Sin precios por servicio, la fila única sigue al importe mientras no se edite.
      this.distribucion.at(0).controls.monto.setValue(montoDeCentavos(centavos));
    }
    if (!requiereEvidenciaParaCorreccionAlAlza(valorCrudo)) {
      return;
    }
    const actual = this.formulario.controls.naturaleza.value;
    if (!NATURALEZAS_CORRECCION_AL_ALZA.includes(actual as NaturalezaAjuste)) {
      this.formulario.controls.naturaleza.setValue(NATURALEZAS_CORRECCION_AL_ALZA[0]);
    }
  }

  protected errorMoneda(): string | null {
    return mensajeMoneda(this.formulario.controls.moneda);
  }

  protected errorEvidencia(): string | null {
    const control = this.formulario.controls.evidencia;
    const valor = control.value.trim();
    if (!valor) {
      // La regla del backend es explícita: al alza la evidencia no es opcional.
      return this.evidenciaObligatoria()
        ? 'La evidencia es obligatoria al alza: justifica por qué el importe aumenta.'
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

  protected puedeEnviar(): boolean {
    return (
      !this.procesando() &&
      this.formulario.valid &&
      this.serviciosElegibles().length > 0 &&
      this.evidenciaValida() &&
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
    const centavos = this.importeCentavos();
    if (!naturaleza || centavos === null) {
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

    this.confirmar.emit({
      motivo: valores.motivo.trim(),
      naturaleza,
      importe: montoDeCentavos(centavos),
      moneda: moneda.length > 0 ? moneda : null,
      evidencia: evidencia.length > 0 ? evidencia : null,
      servicios,
    });
  }

  // --- Internos -----------------------------------------------------------

  private crearFila(servicioId: number, monto: string): FilaDistribucion {
    return this.fb.nonNullable.group({
      servicio_realizado_id: this.fb.nonNullable.control(servicioId),
      monto: this.fb.nonNullable.control(monto),
    });
  }

  private reiniciarDistribucion(servicioId: number | null): void {
    this.distribucion.clear();
    if (servicioId !== null) {
      this.distribucion.push(this.crearFila(servicioId, this.importeCanonico() ?? ''));
    }
    this.sincronizarValores();
  }

  private sincronizarValores(): void {
    this.valores.set(this.formulario.getRawValue());
  }
}
