import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { EstadoNotificacion } from '../estado-notificacion/estado-notificacion';
import { ServiciosPendientes } from '../servicios-pendientes/servicios-pendientes';
import { SpinnerPago } from '../spinner-pago/spinner-pago';
import {
  METODOS_PAGO,
  MetodoPago,
  PagoAdministrativo,
  PagoAdministrativoCrear,
  PermisosPagos,
  ServicioPendienteAdministrativo,
  etiquetaEstadoPago,
  etiquetaMetodoPago,
  formatearFechaHora,
  formatearMonto,
  generarClaveIdempotencia,
  mensajeErrorPago,
  puedeDescargarComprobante,
  referenciaPago,
} from '../../models/pagos-administrativos.models';
import { ComprobantePagoService } from '../../services/comprobante-pago.service';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';

interface IntentoIncierto {
  clave: string;
  payload: PagoAdministrativoCrear;
  monto: number;
}

/**
 * Vista «Registrar pago» del CU31.
 *
 * Reglas de negocio respetadas:
 * - el importe sale de `precio_aplicado` del backend, nunca del usuario;
 * - todos los servicios deben pertenecer a la misma consulta;
 * - una sola solicitud en vuelo y clave de idempotencia estable por intento;
 * - un resultado incierto no se reintenta con una clave nueva.
 */
@Component({
  selector: 'app-registro-pago',
  standalone: true,
  imports: [CommonModule, ServiciosPendientes, EstadoNotificacion, SpinnerPago],
  templateUrl: './registro-pago.html',
  styleUrl: './registro-pago.css',
})
export class RegistroPago {
  readonly pacientes = input<Paciente[]>([]);
  readonly permisos = input<PermisosPagos>({
    ver: false,
    registrar: false,
    confirmar: false,
  });
  readonly cargandoPacientes = input(false);

  protected readonly metodos = METODOS_PAGO;
  protected readonly etiquetaMetodo = etiquetaMetodoPago;
  protected readonly etiquetaEstado = etiquetaEstadoPago;
  protected readonly referenciaVisible = referenciaPago;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly comprobanteDisponible = puedeDescargarComprobante;

  protected readonly busqueda = signal('');
  protected readonly mostrarResultados = signal(false);
  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly servicios = signal<ServicioPendienteAdministrativo[]>([]);
  protected readonly cargandoServicios = signal(false);
  protected readonly errorServicios = signal<string | null>(null);
  protected readonly seleccionados = signal<number[]>([]);
  protected readonly metodo = signal<MetodoPago>('EFECTIVO');
  protected readonly referencia = signal('');
  protected readonly observaciones = signal('');
  protected readonly enviando = signal(false);
  protected readonly errorRegistro = signal<string | null>(null);
  protected readonly avisoSeleccion = signal<string | null>(null);
  protected readonly resultado = signal<PagoAdministrativo | null>(null);
  protected readonly incierto = signal<IntentoIncierto | null>(null);
  protected readonly reconciliando = signal(false);
  protected readonly mensajeReconciliacion = signal<string | null>(null);
  protected readonly descargando = signal(false);
  protected readonly errorComprobante = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);

  protected readonly seleccionadosSet = computed(
    () => new Set(this.seleccionados()),
  );

  protected readonly serviciosSeleccionados = computed(() => {
    const ids = this.seleccionadosSet();
    return this.servicios().filter((servicio) =>
      ids.has(servicio.servicio_realizado_id),
    );
  });

  protected readonly total = computed(() =>
    this.serviciosSeleccionados().reduce(
      (suma, servicio) => suma + (Number(servicio.precio_aplicado) || 0),
      0,
    ),
  );

  protected readonly totalFormateado = computed(() => formatearMonto(this.total()));

  protected readonly consultaSeleccionada = computed<number | null>(() => {
    const seleccionados = this.serviciosSeleccionados();
    return seleccionados.length ? seleccionados[0].consulta_clinica_id : null;
  });

  protected readonly resultadosPacientes = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const activos = this.pacientes().filter((item) => item.estado);
    if (!termino) {
      return activos.slice(0, 6);
    }
    return activos
      .filter((item) =>
        `${item.nombres} ${item.apellidos} ${item.ci}`
          .toLowerCase()
          .includes(termino),
      )
      .slice(0, 6);
  });

  protected readonly puedeRegistrar = computed(() => {
    const permisos = this.permisos();
    if (!permisos.registrar) {
      return false;
    }
    if (!this.paciente() || this.seleccionados().length === 0) {
      return false;
    }
    return this.metodo() === 'EFECTIVO' || this.referencia().trim().length >= 3;
  });

  private readonly api = inject(PagosAdministrativosService);
  private readonly comprobantes = inject(ComprobantePagoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private clavePendiente: string | null = null;
  private solicitudServicios = 0;

  // --- Paciente -----------------------------------------------------------

  protected actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.mostrarResultados.set(true);
  }

  protected seleccionarPaciente(paciente: Paciente): void {
    this.paciente.set(paciente);
    this.busqueda.set('');
    this.mostrarResultados.set(false);
    this.reiniciarOperacion(true);
    this.cargarServicios(paciente.id);
  }

  protected cambiarPaciente(): void {
    this.paciente.set(null);
    this.servicios.set([]);
    this.seleccionados.set([]);
    this.reiniciarOperacion(false);
    this.mostrarResultados.set(true);
  }

  protected nombrePaciente(paciente: Paciente): string {
    return `${paciente.nombres} ${paciente.apellidos}`.trim();
  }

  protected iniciales(paciente: Paciente): string {
    const nombre = paciente.nombres?.trim().charAt(0) ?? '';
    const apellido = paciente.apellidos?.trim().charAt(0) ?? '';
    return `${nombre}${apellido}`.toUpperCase() || 'PA';
  }

  // --- Servicios ----------------------------------------------------------

  protected cargarServicios(pacienteId = this.paciente()?.id): void {
    if (!pacienteId) {
      return;
    }
    const solicitud = ++this.solicitudServicios;
    this.cargandoServicios.set(true);
    this.errorServicios.set(null);

    this.api
      .listarServiciosPendientes(pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => {
          if (solicitud !== this.solicitudServicios) {
            return;
          }
          const servicios = resumen.servicios ?? [];
          this.servicios.set(servicios);
          const disponibles = new Set(
            servicios
              .filter((servicio) => servicio.cobrable)
              .map((servicio) => servicio.servicio_realizado_id),
          );
          this.seleccionados.update((ids) =>
            ids.filter((id) => disponibles.has(id)),
          );
          this.cargandoServicios.set(false);
        },
        error: (error: unknown) => {
          if (solicitud !== this.solicitudServicios) {
            return;
          }
          this.servicios.set([]);
          this.seleccionados.set([]);
          this.cargandoServicios.set(false);
          this.errorServicios.set(
            mensajeErrorPago(error, 'No se pudieron cargar los servicios pendientes.'),
          );
        },
      });
  }

  protected alternarServicio(servicio: ServicioPendienteAdministrativo): void {
    if (!this.permisos().registrar || !servicio.cobrable) {
      return;
    }
    const consulta = this.consultaSeleccionada();
    const actuales = new Set(this.seleccionados());
    this.avisoSeleccion.set(null);
    this.errorRegistro.set(null);

    if (actuales.has(servicio.servicio_realizado_id)) {
      actuales.delete(servicio.servicio_realizado_id);
    } else if (consulta !== null && consulta !== servicio.consulta_clinica_id) {
      this.avisoSeleccion.set(
        'Sólo puedes cobrar servicios de una misma consulta. Finaliza este cobro antes de agregar servicios de otra consulta.',
      );
      return;
    } else {
      actuales.add(servicio.servicio_realizado_id);
    }
    this.seleccionados.set([...actuales]);
  }

  // --- Registro -----------------------------------------------------------

  protected seleccionarMetodo(metodo: MetodoPago): void {
    if (this.enviando() || !this.permisos().registrar) {
      return;
    }
    this.metodo.set(metodo);
    this.errorRegistro.set(null);
  }

  protected actualizarReferencia(valor: string): void {
    this.referencia.set(valor);
    this.errorRegistro.set(null);
  }

  protected actualizarObservaciones(valor: string): void {
    this.observaciones.set(valor);
  }

  protected registrar(): void {
    if (this.enviando()) {
      return;
    }
    const payload = this.construirPayload();
    if (!payload) {
      return;
    }
    const clave = this.clavePendiente ?? generarClaveIdempotencia();
    this.enviar(payload, clave);
  }

  protected reintentarMismoIntento(): void {
    const intento = this.incierto();
    if (!intento || this.enviando()) {
      return;
    }
    this.enviar(intento.payload, intento.clave);
  }

  protected descartarIntento(): void {
    this.incierto.set(null);
    this.clavePendiente = null;
    this.mensajeReconciliacion.set(null);
    this.errorRegistro.set(null);
  }

  protected reconciliar(): void {
    const intento = this.incierto();
    if (!intento || this.reconciliando()) {
      return;
    }
    this.reconciliando.set(true);
    this.mensajeReconciliacion.set(null);

    this.api
      .listarPagos({
        paciente_id: intento.payload.paciente_id,
        page: 1,
        page_size: 20,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.reconciliando.set(false);
          const encontrado = pagina.items?.find(
            (pago) =>
              pago.metodo_pago === intento.payload.metodo_pago &&
              Number(pago.monto) === Number(intento.monto) &&
              this.mismosServicios(
                pago.servicio_realizado_ids,
                intento.payload.servicio_realizado_ids,
              ),
          );
          if (encontrado) {
            this.cerrarResultado(encontrado);
            this.exito.set(
              `Se encontró el pago ${referenciaPago(encontrado.id)} registrado con esta operación.`,
            );
          } else {
            this.mensajeReconciliacion.set(
              'No se encontró un pago con estos servicios en los registros recientes. Puedes reintentar con la misma clave sin duplicar el cobro.',
            );
          }
        },
        error: (error: unknown) => {
          this.reconciliando.set(false);
          this.mensajeReconciliacion.set(
            mensajeErrorPago(
              error,
              'No se pudo verificar si el pago fue registrado. Intenta nuevamente.',
            ),
          );
        },
      });
  }

  protected cancelarOperacion(): void {
    if (this.enviando()) {
      return;
    }
    this.reiniciarOperacion(true);
  }

  protected registrarOtroPago(): void {
    this.reiniciarOperacion(true);
    this.cargarServicios();
  }

  protected irAlHistorial(): void {
    void this.router.navigate(['/pagos/historial']);
  }

  protected descargarComprobante(): void {
    const pago = this.resultado();
    if (!pago || this.descargando()) {
      return;
    }
    this.descargando.set(true);
    this.errorComprobante.set(null);
    this.comprobantes
      .descargar(pago.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.descargando.set(false),
        error: (error: unknown) => {
          this.descargando.set(false);
          this.errorComprobante.set(
            mensajeErrorPago(error, 'No se pudo descargar el comprobante.'),
          );
        },
      });
  }

  protected monto(valor: string): string {
    return formatearMonto(valor);
  }


  // --- Internos -----------------------------------------------------------

  private construirPayload(): PagoAdministrativoCrear | null {
    const paciente = this.paciente();
    const ids = this.seleccionados();
    const metodo = this.metodo();
    const referencia = this.referencia().trim();

    if (!this.permisos().registrar) {
      this.errorRegistro.set(
        'Tu permiso actual no habilita el registro de pagos.',
      );
      return null;
    }
    if (!paciente) {
      this.errorRegistro.set('Selecciona un paciente para continuar.');
      return null;
    }
    if (ids.length === 0) {
      this.errorRegistro.set(
        'Selecciona al menos un servicio pendiente de cobro.',
      );
      return null;
    }
    if (metodo !== 'EFECTIVO' && referencia.length < 3) {
      this.errorRegistro.set(
        'Ingresa la referencia bancaria (mínimo 3 caracteres) para transferencia o QR.',
      );
      return null;
    }

    return {
      paciente_id: paciente.id,
      servicio_realizado_ids: [...ids].sort((a, b) => a - b),
      metodo_pago: metodo,
      referencia_bancaria: metodo === 'EFECTIVO' ? null : referencia,
      observaciones: this.observaciones().trim() || null,
    };
  }

  private enviar(payload: PagoAdministrativoCrear, clave: string): void {
    if (this.enviando()) {
      return;
    }
    this.clavePendiente = clave;
    this.enviando.set(true);
    this.errorRegistro.set(null);
    this.exito.set(null);
    this.mensajeReconciliacion.set(null);

    this.api
      .registrarPago(payload, clave)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        // La animación depende sólo de esta petición: termina siempre, tanto
        // en éxito como en error o resultado incierto.
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (pago) => {
          this.clavePendiente = null;
          this.incierto.set(null);
          this.resultado.set(pago);
          this.seleccionados.set([]);
          this.referencia.set('');
          this.observaciones.set('');
          this.exito.set(
            pago.estado === 'APROBADO'
              ? 'Pago registrado y aprobado correctamente.'
              : 'Pago registrado. Queda pendiente de confirmación administrativa.',
          );
          this.cargarServicios();
        },
        error: (error: unknown) => {
          const estado = error instanceof HttpErrorResponse ? error.status : -1;
          const resultadoIncierto = estado === 0 || estado === -1 || estado >= 500;
          if (resultadoIncierto) {
            this.incierto.set({
              clave,
              payload,
              monto: this.total(),
            });
            return;
          }
          this.clavePendiente = null;
          this.errorRegistro.set(
            mensajeErrorPago(error, 'No se pudo registrar el pago.'),
          );
          if (estado === 409) {
            this.cargarServicios();
          }
        },
      });
  }

  private cerrarResultado(pago: PagoAdministrativo): void {
    this.clavePendiente = null;
    this.incierto.set(null);
    this.resultado.set(pago);
    this.seleccionados.set([]);
    this.cargarServicios();
  }

  private mismosServicios(recibidos: number[], enviados: number[]): boolean {
    if (recibidos.length !== enviados.length) {
      return false;
    }
    const ordenados = [...recibidos].sort((a, b) => a - b);
    return ordenados.every((id, indice) => id === enviados[indice]);
  }

  private reiniciarOperacion(limpiarAvisos: boolean): void {
    this.seleccionados.set([]);
    this.metodo.set('EFECTIVO');
    this.referencia.set('');
    this.observaciones.set('');
    this.errorRegistro.set(null);
    this.avisoSeleccion.set(null);
    this.incierto.set(null);
    this.clavePendiente = null;
    this.resultado.set(null);
    this.mensajeReconciliacion.set(null);
    this.errorComprobante.set(null);
    if (limpiarAvisos) {
      this.exito.set(null);
    }
  }
}
