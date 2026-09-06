import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../Auth/services/auth.service';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import {
  BitacoraFiltros,
  RegistroBitacora,
} from '../../models/bitacora.models';
import { BitacoraService } from '../../services/bitacora.service';

@Component({
  selector: 'app-consultar-bitacora',
  imports: [Sidebar],
  templateUrl: './consultar-bitacora.html',
  styleUrl: './consultar-bitacora.css',
})
export class ConsultarBitacora {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly registros = signal<RegistroBitacora[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly filtrosAbiertos = signal(true);
  protected readonly paginaActual = signal(1);
  protected readonly totalRegistros = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly tamanoPagina = 20;

  protected usuarioId = '';
  protected accion = '';
  protected entidadAfectada = '';
  protected idRegistroAfectado = '';
  protected desde = '';
  protected hasta = '';

  private readonly bitacoraService = inject(BitacoraService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly paginasVisibles = computed<Array<number | 'ellipsis'>>(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    if (total <= 5) {
      return Array.from({ length: total }, (_, indice) => indice + 1);
    }
    if (actual <= 3) {
      return [1, 2, 3, 4, 5, 'ellipsis', total];
    }
    if (actual >= total - 2) {
      return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, 'ellipsis', actual - 1, actual, actual + 1, 'ellipsis', total];
  });

  constructor() {
    this.consultar();
  }

  consultar(): void {
    this.paginaActual.set(1);
    this.cargarPagina(1);
  }

  seleccionarPagina(pagina: number): void {
    if (pagina !== this.paginaActual() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarPagina(pagina);
    }
  }

  irPaginaAnterior(): void {
    this.seleccionarPagina(this.paginaActual() - 1);
  }

  irPaginaSiguiente(): void {
    this.seleccionarPagina(this.paginaActual() + 1);
  }

  private cargarPagina(pagina: number): void {
    const filtros: BitacoraFiltros = {};
    this.agregarNumero(filtros, 'usuario_id', this.usuarioId);
    this.agregarTexto(filtros, 'accion', this.accion);
    this.agregarTexto(filtros, 'entidad_afectada', this.entidadAfectada);
    this.agregarNumero(filtros, 'id_registro_afectado', this.idRegistroAfectado);
    this.agregarTexto(filtros, 'desde', this.desde);
    this.agregarTexto(filtros, 'hasta', this.hasta);

    this.cargando.set(true);
    this.errorCarga.set(false);
    this.bitacoraService.consultar(filtros, pagina, this.tamanoPagina).subscribe({
      next: (respuesta) => {
        this.registros.set(respuesta.items);
        this.paginaActual.set(respuesta.page);
        this.totalRegistros.set(respuesta.total);
        this.totalPaginas.set(respuesta.total_pages);
        this.cargando.set(false);
      },
      error: () => {
        this.registros.set([]);
        this.totalRegistros.set(0);
        this.totalPaginas.set(0);
        this.cargando.set(false);
        this.errorCarga.set(true);
      },
    });
  }

  limpiarFiltros(): void {
    this.usuarioId = '';
    this.accion = '';
    this.entidadAfectada = '';
    this.idRegistroAfectado = '';
    this.desde = '';
    this.hasta = '';
    this.consultar();
  }

  alternarFiltros(): void {
    this.filtrosAbiertos.update((abiertos) => !abiertos);
  }

  alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(fecha));
  }

  private agregarNumero(
    filtros: BitacoraFiltros,
    clave: 'usuario_id' | 'id_registro_afectado',
    valor: string,
  ): void {
    if (valor.trim()) {
      filtros[clave] = Number(valor);
    }
  }

  private agregarTexto(
    filtros: BitacoraFiltros,
    clave: 'accion' | 'entidad_afectada' | 'desde' | 'hasta',
    valor: string,
  ): void {
    if (valor.trim()) {
      filtros[clave] = valor;
    }
  }
}