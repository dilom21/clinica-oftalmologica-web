import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { DetallePago } from '../detalle-pago/detalle-pago';
import {
  PagoAdministrativo,
  PermisosPagos,
  etiquetaMetodoPago,
  formatearFechaHora,
  formatearMonto,
  mensajeErrorPago,
  referenciaPago,
} from '../../models/pagos-administrativos.models';
import { PagosAdministrativosService } from '../../services/pagos-administrativos.service';

/**
 * Vista «Confirmaciones pendientes».
 *
 * El backend no ofrece un endpoint dedicado: se consulta el listado
 * administrativo con `estado=PENDIENTE` y se muestran las transferencias y QR,
 * que son los únicos métodos que requieren confirmación manual.
 */
@Component({
  selector: 'app-confirmaciones-pendientes',
  standalone: true,
  imports: [CommonModule, DetallePago],
  templateUrl: './confirmaciones-pendientes.html',
  styleUrl: './confirmaciones-pendientes.css',
})
export class ConfirmacionesPendientes implements OnInit {
  readonly pacientes = input<Paciente[]>([]);
  readonly permisos = input<PermisosPagos>({
    ver: false,
    registrar: false,
    confirmar: false,
  });
  readonly cargandoPacientes = input(false);

  protected readonly referencia = referenciaPago;
  protected readonly metodo = etiquetaMetodoPago;
  protected readonly fechaHora = formatearFechaHora;

  protected readonly items = signal<PagoAdministrativo[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seleccionado = signal<PagoAdministrativo | null>(null);

  protected readonly busquedaPaciente = signal('');
  protected readonly mostrarPacientes = signal(false);
  protected readonly pacienteFiltro = signal<Paciente | null>(null);

  /** Sólo transferencias y QR pueden confirmarse manualmente. */
  protected readonly visibles = computed(() =>
    this.items().filter(
      (pago) => pago.metodo_pago === 'TRANSFERENCIA' || pago.metodo_pago === 'QR',
    ),
  );

  protected readonly omitidos = computed(() => this.items().length - this.visibles().length);

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

  private readonly nombresPacientes = computed(() => {
    const mapa = new Map<number, string>();
    for (const paciente of this.pacientes()) {
      mapa.set(paciente.id, `${paciente.nombres} ${paciente.apellidos}`.trim());
    }
    return mapa;
  });

  private readonly api = inject(PagosAdministrativosService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (this.permisos().ver) {
      this.cargar();
    }
  }

  protected cargar(): void {
    if (!this.permisos().ver || this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.api
      .listarPagos({
        estado: 'PENDIENTE',
        paciente_id: this.pacienteFiltro()?.id ?? null,
        page: this.pagina(),
        page_size: this.tamanoPagina(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.items.set(pagina.items ?? []);
          this.total.set(pagina.total);
          this.totalPaginas.set(pagina.total_pages);
          this.cargando.set(false);
          this.sincronizarSeleccion();
        },
        error: (error: unknown) => {
          this.items.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.seleccionado.set(null);
          this.cargando.set(false);
          this.error.set(
            mensajeErrorPago(error, 'No se pudieron cargar los pagos pendientes.'),
          );
        },
      });
  }

  protected actualizarListado(): void {
    this.pagina.set(1);
    this.cargar();
  }

  protected irAPagina(delta: number): void {
    const destino = this.pagina() + delta;
    const limite = this.totalPaginas();
    if (destino < 1 || (limite > 0 && destino > limite) || this.cargando()) {
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

  private sincronizarSeleccion(): void {
    const visibles = this.visibles();
    const actual = this.seleccionado();
    if (actual) {
      this.seleccionado.set(
        visibles.find((item) => item.id === actual.id) ?? visibles[0] ?? null,
      );
      return;
    }
    this.seleccionado.set(visibles[0] ?? null);
  }
}
