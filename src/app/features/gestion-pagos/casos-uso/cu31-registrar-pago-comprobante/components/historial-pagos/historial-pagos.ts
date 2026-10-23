import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { DetallePago } from '../detalle-pago/detalle-pago';
import {
  ESTADOS_PAGO,
  EstadoPago,
  FiltrosPagos,
  METODOS_FILTRO,
  MetodoPagoRegistrado,
  PagoAdministrativo,
  PermisosPagos,
  etiquetaEstadoPago,
  etiquetaMetodoPago,
  fechaFinIso,
  fechaInicioIso,
  formatearFechaHora,
  formatearMonto,
  mensajeErrorPago,
  referenciaPago,
} from '../../models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';

/**
 * Vista «Historial de pagos»: filtros y paginación resueltos por el servidor
 * (`page`, `page_size`, `estado`, `metodo_pago`, `paciente_id`, `desde`, `hasta`).
 */
@Component({
  selector: 'app-historial-pagos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DetallePago],
  templateUrl: './historial-pagos.html',
  styleUrl: './historial-pagos.css',
})
export class HistorialPagos implements OnInit {
  readonly pacientes = input<Paciente[]>([]);
  readonly permisos = input<PermisosPagos>({
    ver: false,
    registrar: false,
    confirmar: false,
  });
  readonly cargandoPacientes = input(false);

  protected readonly estados = ESTADOS_PAGO;
  protected readonly metodos = METODOS_FILTRO;
  protected readonly etiquetaEstado = etiquetaEstadoPago;
  protected readonly etiquetaMetodo = etiquetaMetodoPago;
  protected readonly referencia = referenciaPago;
  protected readonly fechaHora = formatearFechaHora;

  protected readonly items = signal<PagoAdministrativo[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly pagina = signal(1);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seleccionado = signal<PagoAdministrativo | null>(null);

  protected readonly busquedaPaciente = signal('');
  protected readonly mostrarPacientes = signal(false);
  protected readonly pacienteFiltro = signal<Paciente | null>(null);

  protected readonly resultadosPacientes = computed(() => {
    const termino = this.busquedaPaciente().trim().toLowerCase();
    const activos = this.pacientes().filter((item) => item.estado);
    if (!termino) {
      return activos.slice(0, 5);
    }
    return activos
      .filter((item) =>
        `${item.nombres} ${item.apellidos} ${item.ci}`.toLowerCase().includes(termino),
      )
      .slice(0, 5);
  });

  protected readonly nombresPacientes = computed(() => {
    const mapa = new Map<number, string>();
    for (const paciente of this.pacientes()) {
      mapa.set(paciente.id, `${paciente.nombres} ${paciente.apellidos}`.trim());
    }
    return mapa;
  });

  private readonly api = inject(PagosAdministrativosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    estado: [''],
    metodo_pago: [''],
    desde: [''],
    hasta: [''],
    page_size: [20],
  });

  ngOnInit(): void {
    if (this.permisos().ver) {
      this.cargar();
    }
  }

  protected cargar(): void {
    if (!this.permisos().ver || this.cargando()) {
      return;
    }
    const valor = this.form.getRawValue();
    const desde = valor.desde ? fechaInicioIso(valor.desde) : null;
    const hasta = valor.hasta ? fechaFinIso(valor.hasta) : null;

    if ((valor.desde && !desde) || (valor.hasta && !hasta)) {
      this.error.set('Las fechas del filtro no son válidas.');
      return;
    }
    if (desde && hasta && desde > hasta) {
      this.error.set('La fecha «Desde» no puede ser posterior a la fecha «Hasta».');
      return;
    }

    const filtros: FiltrosPagos = {
      paciente_id: this.pacienteFiltro()?.id ?? null,
      estado: (valor.estado || null) as EstadoPago | null,
      metodo_pago: (valor.metodo_pago || null) as MetodoPagoRegistrado | null,
      desde,
      hasta,
      page: this.pagina(),
      page_size: Number(valor.page_size) || 20,
    };

    this.cargando.set(true);
    this.error.set(null);

    this.api
      .listarPagos(filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.items.set(pagina.items ?? []);
          this.total.set(pagina.total);
          this.totalPaginas.set(pagina.total_pages);
          this.cargando.set(false);
          this.sincronizarSeleccion(pagina.items ?? []);
        },
        error: (error: unknown) => {
          this.items.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.seleccionado.set(null);
          this.cargando.set(false);
          this.error.set(
            mensajeErrorPago(error, 'No se pudo cargar el historial de pagos.'),
          );
        },
      });
  }

  protected aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.form.reset({
      estado: '',
      metodo_pago: '',
      desde: '',
      hasta: '',
      page_size: 20,
    });
    this.pacienteFiltro.set(null);
    this.busquedaPaciente.set('');
    this.mostrarPacientes.set(false);
    this.pagina.set(1);
    this.cargar();
  }

  protected irAPagina(delta: number): void {
    const destino = this.pagina() + delta;
    const limite = this.totalPaginas();
    if (
      destino < 1 ||
      (limite > 0 && destino > limite) ||
      this.cargando()
    ) {
      return;
    }
    this.pagina.set(destino);
    this.cargar();
  }

  protected seleccionar(pago: PagoAdministrativo): void {
    this.seleccionado.set(pago);
  }

  protected actualizarPago(pago: PagoAdministrativo): void {
    this.items.update((items) =>
      items.map((item) => (item.id === pago.id ? pago : item)),
    );
    this.seleccionado.set(pago);
  }

  protected actualizarBusquedaPaciente(valor: string): void {
    this.busquedaPaciente.set(valor);
    this.mostrarPacientes.set(true);
  }

  protected elegirPaciente(paciente: Paciente): void {
    this.pacienteFiltro.set(paciente);
    this.busquedaPaciente.set('');
    this.mostrarPacientes.set(false);
    this.pagina.set(1);
    this.cargar();
  }

  protected quitarPacienteFiltro(): void {
    this.pacienteFiltro.set(null);
    this.pagina.set(1);
    this.cargar();
  }

  protected nombrePaciente(pacienteId: number): string {
    return this.nombresPacientes().get(pacienteId) ?? `Paciente #${pacienteId}`;
  }

  protected monto(valor: string): string {
    return formatearMonto(valor);
  }

  protected claseEstado(estado: EstadoPago): string {
    switch (estado) {
      case 'APROBADO':
        return 'historial__badge--aprobado';
      case 'PENDIENTE':
        return 'historial__badge--pendiente';
      case 'RECHAZADO':
      case 'ANULADO':
        return 'historial__badge--negativo';
      default:
        return 'historial__badge--neutro';
    }
  }

  private sincronizarSeleccion(items: PagoAdministrativo[]): void {
    const actual = this.seleccionado();
    if (actual) {
      const refrescado = items.find((item) => item.id === actual.id);
      this.seleccionado.set(refrescado ?? items[0] ?? null);
      return;
    }
    this.seleccionado.set(items[0] ?? null);
  }
}
