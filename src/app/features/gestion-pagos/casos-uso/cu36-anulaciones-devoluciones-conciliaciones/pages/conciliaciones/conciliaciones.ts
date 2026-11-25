import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { permisosPagos } from '../../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import { DialogoAtribuirHuerfano } from '../../components/dialogo-atribuir-huerfano/dialogo-atribuir-huerfano';
import {
  AtribuirReembolsoHuerfanoSolicitud,
  PagoAjuste,
  ReembolsoHuerfano,
  formatearFechaHora,
  formatearMonto,
  mensajeErrorAjuste,
  montoDesdeUnidadesMenores,
  puedeAtribuirHuerfano,
} from '../../models/ajustes-pagos.models';
import { AjustesPagosService } from '../../services/ajustes-pagos.service';

type EstadoPermiso = 'verificando' | 'autorizado' | 'denegado' | 'error';

@Component({
  selector: 'app-conciliaciones',
  standalone: true,
  imports: [CommonModule, Sidebar, DialogoAtribuirHuerfano],
  templateUrl: './conciliaciones.html',
  styleUrl: './conciliaciones.css',
})
export class Conciliaciones implements OnInit {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly estadoPermiso = signal<EstadoPermiso>('verificando');
  protected readonly huerfanos = signal<ReembolsoHuerfano[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seleccionado = signal<ReembolsoHuerfano | null>(null);
  protected readonly procesando = signal(false);
  protected readonly errorAtribucion = signal<string | null>(null);
  protected readonly resultado = signal<string | null>(null);

  protected readonly fecha = formatearFechaHora;
  protected readonly puedeAtribuir = puedeAtribuirHuerfano;

  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);
  private readonly ajustesService = inject(AjustesPagosService);
  private readonly destroyRef = inject(DestroyRef);
  private listadoSolicitado = false;
  private generacionListado = 0;

  private readonly sincronizarPermisos = effect(() => {
    const estado = this.menuService.estado();
    if (estado === 'error') {
      this.estadoPermiso.set('error');
      return;
    }
    if (estado !== 'listo') {
      this.estadoPermiso.set('verificando');
      return;
    }
    const modulos = this.menuService.modulos();
    if (!Array.isArray(modulos)) {
      this.estadoPermiso.set('error');
      return;
    }
    if (!this.authService.tenantCode()) {
      this.estadoPermiso.set('denegado');
      return;
    }
    const funciones = modulos.flatMap((modulo) => Array.isArray(modulo?.funciones) ? modulo.funciones : []);
    if (!permisosPagos(funciones).registrar) {
      this.estadoPermiso.set('denegado');
      return;
    }
    this.estadoPermiso.set('autorizado');
    if (!this.listadoSolicitado) {
      this.listadoSolicitado = true;
      untracked(() => this.cargar());
    }
  });

  ngOnInit(): void { this.menuService.cargar(); }

  protected alternarSidebar(): void { this.sidebarMovilAbierto.update((valor) => !valor); }
  protected cerrarSidebar(): void { this.sidebarMovilAbierto.set(false); }
  protected reintentarMenu(): void { this.menuService.reintentar(); }
  protected reintentar(): void { this.cargar(); }

  protected monto(huerfano: ReembolsoHuerfano): string {
    return formatearMonto(montoDesdeUnidadesMenores(huerfano.amount, huerfano.currency), huerfano.currency);
  }

  protected abrirAtribucion(huerfano: ReembolsoHuerfano): void {
    if (!puedeAtribuirHuerfano(huerfano) || this.procesando()) return;
    this.seleccionado.set(huerfano);
    this.errorAtribucion.set(null);
    this.resultado.set(null);
  }

  protected cerrarAtribucion(): void {
    if (!this.procesando()) this.seleccionado.set(null);
  }

  protected atribuir(datos: AtribuirReembolsoHuerfanoSolicitud): void {
    const huerfano = this.seleccionado();
    if (!huerfano || this.procesando()) return;
    this.procesando.set(true);
    this.errorAtribucion.set(null);
    this.ajustesService.atribuirReembolsoHuerfano(huerfano.id, datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ajuste) => {
          this.procesando.set(false);
          this.seleccionado.set(null);
          this.resultado.set(this.mensajeResultado(ajuste));
          this.cargar();
        },
        error: (error: unknown) => {
          this.procesando.set(false);
          this.errorAtribucion.set(mensajeErrorAjuste(error, 'No se pudo atribuir el reembolso.'));
        },
      });
  }

  private cargar(): void {
    const generacion = ++this.generacionListado;
    this.cargando.set(true);
    this.error.set(null);
    this.ajustesService.listarReembolsosHuerfanos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          if (generacion !== this.generacionListado) return;
          this.huerfanos.set(items ?? []);
          this.error.set(null);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          if (generacion !== this.generacionListado) return;
          this.huerfanos.set([]);
          this.cargando.set(false);
          this.error.set(mensajeErrorAjuste(error, 'No se pudieron cargar los reembolsos pendientes.'));
        },
      });
  }

  private mensajeResultado(ajuste: PagoAjuste): string {
    return ajuste.estado === 'CONFIRMADO'
      ? `El reembolso fue atribuido y el ajuste #${ajuste.id} quedó confirmado.`
      : `El reembolso fue atribuido, pero el ajuste #${ajuste.id} quedó en estado ${ajuste.estado}; todavía no es un resultado exitoso.`;
  }
}
