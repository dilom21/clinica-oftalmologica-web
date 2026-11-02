import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import {
  EstadoStock,
  EstadoVencimiento,
  FiltrosInventario,
  LotesProducto,
  PaginaAlertas,
  PaginaInventario,
  TipoAlerta,
} from '../../models/inventario.models';
import { InventarioService } from '../../services/inventario.service';

const FILTROS_INICIALES = {
  q: '',
  categoria: '',
  stock: 'TODOS',
  vencimiento: 'TODOS',
  dias_vencimiento: 30,
  page_size: 20,
} as const;

@Component({
  selector: 'app-consultar-inventario-alertas',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Sidebar],
  templateUrl: './consultar-inventario-alertas.html',
  styleUrl: './consultar-inventario-alertas.css',
})
export class ConsultarInventarioAlertas implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventarioService);
  private readonly menu = inject(MenuService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly tituloLotes = viewChild<ElementRef<HTMLElement>>('tituloLotes');
  private focoAnterior: HTMLElement | null = null;
  private peticion?: Subscription;
  private peticionLotes?: Subscription;
  private revisionObservada: number | null = null;
  private revisionCargada: number | null = null;
  private numeroPeticion = 0;
  private numeroPeticionLotes = 0;
  private filtrosAplicados: FiltrosInventario = { ...FILTROS_INICIALES };

  readonly sidebarMovilAbierto = signal(false);
  readonly vista = signal<'productos' | 'alertas'>('productos');
  readonly sesionTenant = signal(!!this.auth.tenantCode());
  readonly accesoDenegado = signal(false);
  readonly contextoListo = computed(() => {
    this.auth.revisionSesion();
    this.auth.estadoEmpresa();
    this.auth.empresa();
    return this.auth.empresaCoincideConSesion();
  });
  readonly empresa = computed(() => this.contextoListo() ? this.auth.empresaNombre() : null);
  readonly cargandoEmpresa = computed(() => this.auth.estadoEmpresa() === 'verificando');
  readonly errorEmpresa = computed(() => this.auth.estadoEmpresa() === 'error');
  readonly cargandoPermisos = computed(() => ['inicial', 'cargando'].includes(this.menu.estado()));
  readonly errorPermisos = computed(() => this.menu.estado() === 'error');
  readonly permisoLectura = computed(
    () =>
      this.menu.estado() === 'listo' &&
      this.menu
        .modulos()
        .some(
          (modulo) =>
            modulo.nombre === 'Inventario y Proveedores' &&
            modulo.funciones.some(
              (funcion) =>
                funcion.nombre === 'Consultar inventario y alertas' &&
                ['LECTURA', 'AMBAS'].includes(funcion.accion_nombre.trim().toUpperCase()),
            ),
        ),
  );
  readonly puedeConsultar = computed(
    () => this.sesionTenant() && this.contextoListo() && this.permisoLectura() && !this.accesoDenegado(),
  );
  readonly inventario = signal<PaginaInventario | null>(null);
  readonly alertas = signal<PaginaAlertas | null>(null);
  readonly resultado = computed(() =>
    this.vista() === 'productos' ? this.inventario() : this.alertas(),
  );
  readonly pagina = signal(1);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly noDisponible = signal(false);
  readonly seleccionado = signal<{ id: number; nombre: string } | null>(null);
  readonly detalle = signal<LotesProducto | null>(null);
  readonly cargandoLotes = signal(false);
  readonly errorLotes = signal<string | null>(null);

  readonly filtros = this.fb.nonNullable.group({
    q: ['', Validators.maxLength(120)],
    categoria: ['', Validators.maxLength(120)],
    stock: this.fb.nonNullable.control<NonNullable<FiltrosInventario['stock']>>('TODOS'),
    vencimiento:
      this.fb.nonNullable.control<NonNullable<FiltrosInventario['vencimiento']>>('TODOS'),
    dias_vencimiento: [
      30,
      [Validators.required, Validators.min(1), Validators.max(365), Validators.pattern(/^\d+$/)],
    ],
    page_size: [
      20,
      [Validators.required, Validators.min(1), Validators.max(100), Validators.pattern(/^\d+$/)],
    ],
  });

  private readonly sincronizarAcceso = effect(() => {
    const revision = this.auth.revisionSesion();
    const empresa = this.auth.tenantCode();
    const contextoListo = this.contextoListo();
    const estadoMenu = this.menu.estado();
    const autorizado = this.permisoLectura() && !this.accesoDenegado();
    this.sesionTenant.set(!!empresa);
    untracked(() => {
      if (this.revisionObservada !== revision) {
        this.revisionObservada = revision;
        this.revisionCargada = null;
        this.limpiarDatos();
        this.accesoDenegado.set(false);
        this.filtrosAplicados = { ...FILTROS_INICIALES };
        this.filtros.reset(FILTROS_INICIALES);
        this.pagina.set(1);
        this.vista.set('productos');
      }
      if (empresa && contextoListo && estadoMenu === 'inicial') this.menu.cargar();
      if (!empresa || !contextoListo || !autorizado) {
        this.revisionCargada = null;
        this.limpiarDatos();
        return;
      }
      if (this.revisionCargada !== revision) {
        this.limpiarDatos();
        this.revisionCargada = revision;
        this.actualizar();
      }
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.peticion?.unsubscribe();
      this.peticionLotes?.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.auth.inicializarContextoEmpresa();
    this.menu.cargar();
  }

  comprobarPermisos(): void {
    this.auth.sincronizarSesion();
    this.auth.inicializarContextoEmpresa();
    this.accesoDenegado.set(false);
    this.menu.reintentar();
  }

  aplicarFiltros(): void {
    this.filtros.markAllAsTouched();
    if (this.filtros.invalid || !this.validarAcceso()) return;
    const valores = this.filtros.getRawValue();
    this.filtrosAplicados = {
      ...valores,
      q: valores.q.trim(),
      categoria: valores.categoria.trim(),
    };
    this.pagina.set(1);
    this.actualizar();
  }

  limpiarFiltros(): void {
    this.filtros.reset(FILTROS_INICIALES);
    this.aplicarFiltros();
  }

  cambiarVista(vista: 'productos' | 'alertas'): void {
    if (this.vista() === vista || !this.validarAcceso()) return;
    this.vista.set(vista);
    this.pagina.set(1);
    this.actualizar();
  }

  cambiarPagina(pagina: number): void {
    if (
      this.cargando() ||
      !Number.isInteger(pagina) ||
      pagina < 1 ||
      pagina > (this.resultado()?.total_pages ?? 0)
    )
      return;
    this.pagina.set(pagina);
    this.actualizar();
  }

  actualizar(): void {
    if (!this.validarAcceso()) return;
    const revision = this.auth.revisionSesion();
    const peticion = ++this.numeroPeticion;
    this.peticion?.unsubscribe();
    this.cerrarLotes(false);
    this.inventario.set(null);
    this.alertas.set(null);
    this.error.set(null);
    this.noDisponible.set(false);
    this.cargando.set(true);
    const filtros = { ...this.filtrosAplicados, page: this.pagina() };
    if (this.vista() === 'productos') {
      this.peticion = this.api.consultar(filtros).subscribe({
        next: (resultado) => {
          if (!this.respuestaVigente(revision, peticion, false)) return;
          if (this.ajustarPagina(resultado.total_pages)) return;
          this.inventario.set(resultado);
          this.cargando.set(false);
        },
        error: (error) => {
          if (this.respuestaVigente(revision, peticion, false)) this.procesarError(error);
        },
      });
    } else {
      this.peticion = this.api.alertas(filtros).subscribe({
        next: (resultado) => {
          if (!this.respuestaVigente(revision, peticion, false)) return;
          if (this.ajustarPagina(resultado.total_pages)) return;
          this.alertas.set(resultado);
          this.cargando.set(false);
        },
        error: (error) => {
          if (this.respuestaVigente(revision, peticion, false)) this.procesarError(error);
        },
      });
    }
  }

  verLotes(producto: { id: number; nombre: string }, evento?: Event): void {
    if (!this.validarAcceso()) return;
    const origen = evento?.currentTarget;
    const focoAnterior = origen instanceof HTMLElement ? origen : this.focoAnterior;
    this.cerrarLotes(false);
    const revision = this.auth.revisionSesion();
    const peticion = this.numeroPeticionLotes;
    this.focoAnterior = focoAnterior;
    this.seleccionado.set(producto);
    this.cargandoLotes.set(true);
    afterNextRender(
      () => {
        if (!this.respuestaVigente(revision, peticion, true)) return;
        const titulo = this.tituloLotes()?.nativeElement;
        titulo?.focus({ preventScroll: true });
        titulo?.scrollIntoView?.({ block: 'start' });
      },
      { injector: this.injector },
    );
    this.peticionLotes = this.api
      .lotes(producto.id, this.filtrosAplicados.dias_vencimiento)
      .subscribe({
        next: (detalle) => {
          if (!this.respuestaVigente(revision, peticion, true)) return;
          this.detalle.set(detalle);
          this.cargandoLotes.set(false);
        },
        error: (error) => {
          if (!this.respuestaVigente(revision, peticion, true)) return;
          if (this.procesarErrorAcceso(error)) return;
          this.cargandoLotes.set(false);
          this.errorLotes.set(
            this.mensajeError(error, 'No se pudieron consultar los lotes del producto.'),
          );
        },
      });
  }

  cerrarLotes(restaurarFoco = true): void {
    this.numeroPeticionLotes++;
    this.peticionLotes?.unsubscribe();
    this.seleccionado.set(null);
    this.detalle.set(null);
    this.errorLotes.set(null);
    this.cargandoLotes.set(false);
    const origen = this.focoAnterior;
    this.focoAnterior = null;
    if (restaurarFoco && origen?.isConnected) origen.focus();
  }

  cerrarSesion(): void {
    this.limpiarDatos();
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  fechaLegible(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${fecha}T12:00:00`));
  }

  etiquetaStock(estado: EstadoStock): string {
    return {
      NORMAL: 'Normal',
      BAJO: 'Stock bajo',
      AGOTADO: 'Agotado',
      SIN_UMBRAL: 'Sin mínimo definido',
    }[estado];
  }

  etiquetaVencimiento(estado: EstadoVencimiento): string {
    return {
      VIGENTE: 'Vigente',
      PROXIMO: 'Próximo a vencer',
      VENCIDO: 'Vencido',
      SIN_FECHA: 'Sin fecha',
    }[estado];
  }

  etiquetaAlerta(tipo: TipoAlerta): string {
    return {
      STOCK_BAJO: 'Stock bajo',
      AGOTADO: 'Agotado',
      PROXIMO_VENCIMIENTO: 'Próximo a vencer',
      VENCIDO: 'Vencido',
    }[tipo];
  }

  private validarAcceso(): boolean {
    this.auth.sincronizarSesion();
    const empresa = this.auth.tenantCode();
    if (
      !empresa ||
      this.revisionCargada !== this.auth.revisionSesion() ||
      !this.auth.empresaCoincideConSesion() ||
      !this.puedeConsultar()
    ) {
      this.sesionTenant.set(!!empresa);
      this.limpiarDatos();
      return false;
    }
    return true;
  }

  private respuestaVigente(revision: number, peticion: number, lotes: boolean): boolean {
    if (peticion !== (lotes ? this.numeroPeticionLotes : this.numeroPeticion)) return false;
    // El almacenamiento puede haber cambiado antes de que llegue el evento de otra pestaña.
    if (!this.auth.esSesionActual(revision)) {
      this.auth.sincronizarSesion();
      this.limpiarDatos();
      return false;
    }
    if (!this.auth.tenantCode()) {
      this.limpiarDatos();
      this.sesionTenant.set(false);
      this.auth.logout();
      return false;
    }
    return this.revisionCargada === revision && this.auth.empresaCoincideConSesion() && this.puedeConsultar();
  }

  private ajustarPagina(totalPaginas: number): boolean {
    const ultima = Math.max(1, totalPaginas);
    if (this.pagina() <= ultima) return false;
    this.pagina.set(ultima);
    this.actualizar();
    return true;
  }

  private limpiarDatos(): void {
    this.numeroPeticion++;
    this.peticion?.unsubscribe();
    this.cerrarLotes(false);
    this.inventario.set(null);
    this.alertas.set(null);
    this.error.set(null);
    this.noDisponible.set(false);
    this.cargando.set(false);
  }

  private procesarError(error: unknown): void {
    if (this.procesarErrorAcceso(error)) return;
    this.cargando.set(false);
    this.noDisponible.set(
      error instanceof HttpErrorResponse &&
        error.status === 503 &&
        error.error?.detail?.codigo === 'INVENTARIO_DEPENDENCIAS_PENDIENTES',
    );
    this.error.set(
      this.mensajeError(error, 'No se pudo consultar el inventario. Intenta nuevamente.'),
    );
  }

  private procesarErrorAcceso(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (error.status === 401 || error.status === 403) {
      this.limpiarDatos();
      this.accesoDenegado.set(true);
      if (error.status === 401) {
        this.sesionTenant.set(false);
        this.auth.logout();
      }
      return true;
    }
    return false;
  }

  private mensajeError(error: unknown, alternativa: string): string {
    if (!(error instanceof HttpErrorResponse)) return alternativa;
    if (error.status === 0)
      return 'No se pudo conectar con la clínica. Comprueba tu conexión y vuelve a intentar.';
    if (
      error.status === 503 &&
      error.error?.detail?.codigo === 'INVENTARIO_DEPENDENCIAS_PENDIENTES'
    ) {
      return 'El inventario todavía no está disponible para esta empresa.';
    }
    if (error.status === 404) return 'El producto solicitado ya no está disponible.';
    if (error.status === 422) return 'Revisa los filtros e intenta nuevamente.';
    return alternativa;
  }
}
