import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuModulo } from '../../../../../../core/models/menu.models';
import { EstadoMenu, MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { PaginaAlertas, PaginaInventario } from '../../models/inventario.models';
import { InventarioService } from '../../services/inventario.service';
import { ConsultarInventarioAlertas } from './consultar-inventario-alertas';

@Component({ selector: 'app-sidebar', template: '' })
class SidebarPrueba {
  mobileOpen = input(false);
  mobileClose = output<void>();
}

const producto = {
  id: 42,
  codigo: 'P-42',
  nombre: 'Producto de prueba',
  categoria: 'Insumos',
  stock_actual: 2,
  stock_minimo: 5,
  estado_stock: 'BAJO' as const,
  lotes: [],
};
const datos: PaginaInventario = {
  items: [producto],
  total: 25,
  page: 1,
  page_size: 20,
  total_pages: 2,
  resumen: { productos: 25, stock_bajo: 2, agotados: 1, lotes_proximos: 3, lotes_vencidos: 1 },
  fecha_corte: '2026-10-26',
};
const avisos: PaginaAlertas = {
  items: [
    {
      tipo: 'STOCK_BAJO',
      producto_id: 42,
      producto_nombre: producto.nombre,
      lote_id: null,
      lote_codigo: null,
      existencia: 2,
      fecha_vencimiento: null,
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
  fecha_corte: '2026-10-26',
};

describe('CU30 — consulta y seguridad de la página', () => {
  let fixture: ComponentFixture<ConsultarInventarioAlertas>;
  let pagina: ConsultarInventarioAlertas;
  let codigoEmpresa: string | null;
  const empresa = signal<{ codigo: string; nombre: string; tenantId: number } | null>(null);
  const estadoMenu = signal<EstadoMenu>('listo');
  const modulos = signal<MenuModulo[]>([]);
  const api = { consultar: vi.fn(), alertas: vi.fn(), lotes: vi.fn() };
  const menu = {
    estado: estadoMenu.asReadonly(),
    modulos: modulos.asReadonly(),
    cargar: vi.fn(),
    reintentar: vi.fn(),
  };
  const auth = {
    empresa: empresa.asReadonly(),
    empresaNombre: computed(() => empresa()?.nombre ?? null),
    tenantCode: vi.fn(() => codigoEmpresa),
    inicializarContextoEmpresa: vi.fn(),
    logout: vi.fn(),
  };

  function permiso(accion = 'LECTURA', nombre = 'Consultar inventario y alertas'): void {
    modulos.set([
      {
        id: 5,
        nombre: 'Inventario y Proveedores',
        funciones: [{ id: 30, nombre, accion_id: 1, accion_nombre: accion }],
      },
    ]);
  }
  function iniciar(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }
  function texto(): string {
    return fixture.nativeElement.textContent;
  }

  beforeEach(async () => {
    vi.resetAllMocks();
    codigoEmpresa = 'EMPRESA-1';
    empresa.set({ codigo: codigoEmpresa, nombre: 'Empresa de prueba', tenantId: 1 });
    estadoMenu.set('listo');
    permiso();
    auth.tenantCode.mockImplementation(() => codigoEmpresa);
    auth.logout.mockImplementation(() => {
      codigoEmpresa = null;
      empresa.set(null);
      estadoMenu.set('inicial');
    });
    api.consultar.mockReturnValue(of(datos));
    api.alertas.mockReturnValue(of(avisos));
    api.lotes.mockReturnValue(
      of({
        producto_id: 42,
        fecha_corte: '2026-10-26',
        lotes: [
          {
            id: 8,
            codigo: 'L-8',
            existencia: 2,
            fecha_vencimiento: '2026-11-01',
            estado_vencimiento: 'PROXIMO',
          },
        ],
      }),
    );
    await TestBed.configureTestingModule({
      imports: [ConsultarInventarioAlertas],
      providers: [
        provideRouter([]),
        { provide: InventarioService, useValue: api },
        { provide: MenuService, useValue: menu },
        { provide: AuthService, useValue: auth },
      ],
    })
      .overrideComponent(ConsultarInventarioAlertas, {
        remove: { imports: [Sidebar] },
        add: { imports: [SidebarPrueba] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(ConsultarInventarioAlertas);
    pagina = fixture.componentInstance;
  });

  it('muestra existencias, resumen y nombre real de empresa únicamente después de consultar', () => {
    const pendiente = new Subject<PaginaInventario>();
    api.consultar.mockReturnValue(pendiente);
    iniciar();
    expect(texto()).toContain('Empresa de prueba');
    expect(texto()).toContain('Cargando inventario');
    expect(fixture.nativeElement.querySelector('.resumen')).toBeNull();
    pendiente.next(datos);
    fixture.detectChanges();
    expect(texto()).toContain(producto.nombre);
    expect(texto()).toContain('Stock actual');
    expect(texto()).toContain('Stock bajo');
    expect(fixture.nativeElement.querySelector('.resumen')).not.toBeNull();
  });

  it('espera permisos y bloquea escritura, alias de función y usuarios sin permiso', () => {
    estadoMenu.set('cargando');
    iniciar();
    expect(api.consultar).not.toHaveBeenCalled();
    expect(texto()).toContain('Comprobando acceso');
    estadoMenu.set('listo');
    permiso('ESCRITURA');
    fixture.detectChanges();
    expect(api.consultar).not.toHaveBeenCalled();
    expect(texto()).toContain('Acceso no autorizado');
    permiso('LECTURA', 'Gestionar inventario');
    fixture.detectChanges();
    expect(api.consultar).not.toHaveBeenCalled();
    for (const nombre of [
      'Consultar inventario y alertas (Web)',
      'consultar inventario y alertas',
      '  CONSULTAR   INVENTARIO Y ALERTAS  ',
      'Consultar inventario y alertas ',
    ]) {
      permiso('LECTURA', nombre);
      fixture.detectChanges();
      expect(api.consultar).not.toHaveBeenCalled();
    }
    permiso('AMBAS');
    fixture.detectChanges();
    expect(api.consultar).toHaveBeenCalledTimes(1);
  });

  it('requiere sesión tenant y no consulta con una sesión legacy o vencida', () => {
    codigoEmpresa = null;
    empresa.set(null);
    iniciar();
    expect(api.consultar).not.toHaveBeenCalled();
    expect(texto()).toContain('Inicia sesión en tu empresa');
    pagina.actualizar();
    expect(api.consultar).not.toHaveBeenCalled();
  });

  it('rechaza la función canónica asignada a un módulo ajeno', () => {
    modulos.set(modulos().map((modulo) => ({ ...modulo, nombre: 'Otra área' })));
    iniciar();
    expect(api.consultar).not.toHaveBeenCalled();
    expect(texto()).toContain('Acceso no autorizado');
    permiso();
    fixture.detectChanges();
    expect(api.consultar).toHaveBeenCalledTimes(1);
  });

  it('distingue dependencia pendiente de inventario vacío y permite reintentar', () => {
    api.consultar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: {
              detail: {
                codigo: 'INVENTARIO_DEPENDENCIAS_PENDIENTES',
                mensaje: 'Detalle interno',
                dependencias: ['CU26'],
              },
            },
          }),
      ),
    );
    iniciar();
    expect(texto()).toContain('Inventario no disponible');
    expect(texto()).not.toContain('No se encontraron productos');
    expect(texto()).not.toContain('CU26');
    expect(texto()).not.toContain('Detalle interno');
    expect(fixture.nativeElement.querySelector('.resumen')).toBeNull();
    api.consultar.mockReturnValue(
      of({
        ...datos,
        items: [],
        total: 0,
        total_pages: 0,
        resumen: { productos: 0, stock_bajo: 0, agotados: 0, lotes_proximos: 0, lotes_vencidos: 0 },
      }),
    );
    pagina.actualizar();
    fixture.detectChanges();
    expect(texto()).toContain('No se encontraron productos');
    expect(texto()).not.toContain('Inventario no disponible');
  });

  it('aplica filtros, reinicia página y comparte el umbral de vencimiento con los lotes', () => {
    iniciar();
    pagina.cambiarPagina(2);
    expect(api.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    pagina.filtros.patchValue({
      q: '  Producto  ',
      categoria: 'Insumos',
      stock: 'BAJO',
      vencimiento: 'PROXIMO',
      dias_vencimiento: 60,
    });
    pagina.aplicarFiltros();
    expect(api.consultar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: 'Producto',
        categoria: 'Insumos',
        stock: 'BAJO',
        vencimiento: 'PROXIMO',
        dias_vencimiento: 60,
        page: 1,
      }),
    );
    pagina.verLotes(producto);
    fixture.detectChanges();
    expect(api.lotes).toHaveBeenCalledWith(42, 60);
    expect(texto()).toContain('L-8');
    expect(texto()).toContain('Próximo a vencer');
    pagina.limpiarFiltros();
    expect(api.consultar).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: '', stock: 'TODOS', dias_vencimiento: 30, page: 1 }),
    );
    expect(pagina.seleccionado()).toBeNull();
  });

  it('rechaza filtros inválidos y páginas fuera del rango', () => {
    iniciar();
    for (const dias of [0, 366, 1.5]) {
      pagina.filtros.patchValue({ dias_vencimiento: dias });
      pagina.aplicarFiltros();
    }
    pagina.cambiarPagina(0);
    pagina.cambiarPagina(3);
    pagina.cambiarPagina(1.5);
    expect(api.consultar).toHaveBeenCalledTimes(1);
    pagina.filtros.patchValue({ dias_vencimiento: 30, q: 'x'.repeat(121) });
    pagina.aplicarFiltros();
    expect(api.consultar).toHaveBeenCalledTimes(1);
  });

  it('enfoca el detalle de lotes y devuelve el foco al botón que lo abrió', () => {
    iniciar();
    const boton = fixture.nativeElement.querySelector('button.enlace') as HTMLButtonElement;
    boton.focus();
    boton.click();
    fixture.detectChanges();
    TestBed.tick();
    expect(document.activeElement?.id).toBe('lotes-titulo');
    pagina.cerrarLotes();
    fixture.detectChanges();
    expect(document.activeElement).toBe(boton);
  });

  it('recupera la última página cuando cambia el total de productos o alertas', () => {
    iniciar();
    api.consultar
      .mockReturnValueOnce(of({ ...datos, items: [], page: 2, total: 1, total_pages: 1 }))
      .mockReturnValueOnce(of({ ...datos, total: 1, total_pages: 1 }));
    pagina.cambiarPagina(2);
    expect(pagina.pagina()).toBe(1);
    expect(api.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    expect(pagina.inventario()?.items).toHaveLength(1);
    api.alertas.mockReturnValueOnce(of({ ...avisos, total: 25, total_pages: 2 }));
    pagina.cambiarVista('alertas');
    api.alertas
      .mockReturnValueOnce(of({ ...avisos, items: [], page: 2, total_pages: 1 }))
      .mockReturnValueOnce(of(avisos));
    pagina.cambiarPagina(2);
    expect(pagina.pagina()).toBe(1);
    expect(api.alertas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    expect(pagina.alertas()?.items).toHaveLength(1);
  });

  it('cancela la consulta anterior al buscar o cambiar de vista y consulta alertas', () => {
    const primera = new Subject<PaginaInventario>(),
      segunda = new Subject<PaginaInventario>();
    api.consultar.mockReturnValueOnce(primera).mockReturnValueOnce(segunda);
    iniciar();
    expect(primera.observed).toBe(true);
    pagina.aplicarFiltros();
    expect(primera.observed).toBe(false);
    expect(segunda.observed).toBe(true);
    pagina.cambiarVista('alertas');
    fixture.detectChanges();
    expect(segunda.observed).toBe(false);
    expect(api.alertas).toHaveBeenCalledTimes(1);
    expect(texto()).toContain('Alertas de inventario');
    expect(texto()).toContain(producto.nombre);
    expect(fixture.nativeElement.querySelector('.resumen')).toBeNull();
  });

  it('cancela lotes y listados y elimina datos si pierde el permiso', () => {
    const pendienteLotes = new Subject();
    api.lotes.mockReturnValue(pendienteLotes);
    iniciar();
    pagina.verLotes(producto);
    expect(pendienteLotes.observed).toBe(true);
    const pendienteListado = new Subject<PaginaInventario>();
    api.consultar.mockReturnValue(pendienteListado);
    pagina.actualizar();
    expect(pendienteLotes.observed).toBe(false);
    modulos.set([]);
    fixture.detectChanges();
    expect(pendienteListado.observed).toBe(false);
    expect(pagina.inventario()).toBeNull();
    expect(pagina.seleccionado()).toBeNull();
    expect(texto()).toContain('Acceso no autorizado');
  });

  it('el cambio de empresa descarta resultados y filtros de la empresa anterior', () => {
    iniciar();
    pagina.filtros.patchValue({ q: 'Producto' });
    pagina.aplicarFiltros();
    const nueva = new Subject<PaginaInventario>();
    api.consultar.mockReturnValue(nueva);
    codigoEmpresa = 'EMPRESA-7';
    empresa.set({ codigo: codigoEmpresa, nombre: 'Séptima empresa', tenantId: 7 });
    fixture.detectChanges();
    expect(pagina.inventario()).toBeNull();
    expect(pagina.filtros.controls.q.value).toBe('');
    expect(texto()).toContain('Séptima empresa');
    expect(texto()).not.toContain(producto.nombre);
    expect(api.consultar).toHaveBeenLastCalledWith(expect.objectContaining({ q: '', page: 1 }));
  });

  it('un 401 elimina los datos y solicita iniciar sesión; un 403 bloquea reconsultas', () => {
    iniciar();
    api.alertas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    pagina.cambiarVista('alertas');
    fixture.detectChanges();
    expect(texto()).toContain('Acceso no autorizado');
    expect(pagina.inventario()).toBeNull();
    pagina.actualizar();
    expect(api.alertas).toHaveBeenCalledTimes(1);
    api.alertas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    pagina.comprobarPermisos();
    fixture.detectChanges();
    expect(auth.logout).toHaveBeenCalled();
    expect(texto()).toContain('Inicia sesión en tu empresa');
    expect(pagina.alertas()).toBeNull();
  });

  it('oculta detalles técnicos de errores, ofrece reintento y cancela al destruir', () => {
    api.consultar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'SQL interno' } })),
    );
    iniciar();
    expect(texto()).toContain('No se pudo consultar el inventario');
    expect(texto()).not.toContain('SQL interno');
    const pendiente = new Subject<PaginaInventario>();
    api.consultar.mockReturnValue(pendiente);
    pagina.actualizar();
    expect(pendiente.observed).toBe(true);
    fixture.destroy();
    expect(pendiente.observed).toBe(false);
  });

  it('el cambio de token en otra pestaña cancela consultas y oculta datos', () => {
    const pendiente = new Subject<PaginaInventario>();
    api.consultar.mockReturnValue(pendiente);
    iniciar();
    pagina.cambioSesion(new StorageEvent('storage', { key: 'access_token' }));
    fixture.detectChanges();
    expect(pendiente.observed).toBe(false);
    expect(pagina.inventario()).toBeNull();
    expect(pagina.accesoDenegado()).toBe(true);
  });
});
