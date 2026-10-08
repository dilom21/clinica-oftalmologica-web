import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, input, output, signal, Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { ServicioOftalmologicoService } from '../../../../../../services/servicio-oftalmologico.service';
import { ConsultaClinicaService } from '../../../cu15-registrar-consulta-clinica/services/consulta-clinica.service';
import { fechaParaInput } from '../../models/fechas-servicios';
import { MenuModulo } from '../../../../../../core/models/menu.models';
import { ServicioRealizado } from '../../models/servicios-realizados.models';
import { ServiciosRealizadosService } from '../../services/servicios-realizados.service';
import { mensajeErrorServicios, RegistrarServiciosRealizados } from './registrar-servicios-realizados';

@Component({ selector: 'app-sidebar', template: '' })
class SidebarPrueba { mobileOpen = input(false); mobileClose = output<void>(); }

const registro: ServicioRealizado = {
  id: 9, servicio_id: 3, paciente_id: 5, consulta_clinica_id: 100, precio_aplicado: 125.25,
  oftalmologo_id: 2, fecha_realizacion: '2020-01-02T12:00:00.123Z', observaciones: 'Original', estado: true,
  servicio: { id: 3, nombre: 'Fondo de ojo', descripcion: null, precio_base: 150, duracion_estimada: 20, estado: true },
  paciente: { id: 5, nombres: 'Ana', apellidos: 'Pérez' },
  oftalmologo: { id: 2, nombres: 'Luis', apellidos: 'Méndez', matricula: 'M1', especialidad: null },
};
const consulta = { id: 100, estado: true, fecha_consulta: '2020-01-01T12:00:00Z', oftalmologo: registro.oftalmologo };

describe('CU22 — criterios de aceptación en la página', () => {
  let fixture: ComponentFixture<RegistrarServiciosRealizados>;
  let pagina: RegistrarServiciosRealizados;
  let accion: string;
  const api = { listar: vi.fn(), consultar: vi.fn(), registrarLote: vi.fn(), actualizar: vi.fn(), anular: vi.fn() };
  const consultas = { listarConsultas: vi.fn() };
  const pacientes = { listarPacientes: vi.fn() }, catalogo = { listarServicios: vi.fn() };
  let menuEstado: WritableSignal<'inicial' | 'cargando' | 'listo' | 'error'>;
  let menuModulos: WritableSignal<MenuModulo[]>;
  let menu: {
    estado: Signal<'inicial' | 'cargando' | 'listo' | 'error'>;
    modulos: Signal<MenuModulo[]>;
    cargando: Signal<boolean>;
    error: Signal<boolean>;
    cargar: ReturnType<typeof vi.fn>;
    reintentar: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    accion = 'AMBAS'; vi.resetAllMocks();
    api.listar.mockReturnValue(of({ items: [registro], total: 1, page: 1, page_size: 20, total_pages: 1 }));
    api.consultar.mockReturnValue(of(registro)); api.registrarLote.mockReturnValue(of([registro]));
    api.actualizar.mockReturnValue(of(registro)); api.anular.mockReturnValue(of({ ...registro, estado: false }));
    consultas.listarConsultas.mockReturnValue(of([consulta]));
    pacientes.listarPacientes.mockReturnValue(of([
      { ...registro.paciente, ci: 'CI5', estado: true },
      { id: 6, nombres: 'Otro', apellidos: 'Paciente', estado: true },
    ]));
    catalogo.listarServicios.mockReturnValue(of([
      registro.servicio,
      { id: 4, nombre: 'Tonometría', precio_base: 20.50, estado: true },
      { id: 8, nombre: 'Servicio inactivo', precio_base: 30, estado: false },
      { id: 10, nombre: 'Sin precio', precio_base: null, estado: true },
      { id: 11, nombre: 'Servicio sin costo', precio_base: 0, estado: true },
    ]));
    menuEstado = signal<'inicial' | 'cargando' | 'listo' | 'error'>('inicial');
    menuModulos = signal<MenuModulo[]>([]);
    const resolverMenu = vi.fn(() => {
      menuModulos.set([{
        id: 1,
        nombre: 'Atención clínica',
        funciones: accion ? [
          { id: 22, nombre: 'Registrar servicios realizados', accion_nombre: accion, accion_id: 3 },
        ] : [],
      }]);
      menuEstado.set('listo');
    });
    menu = {
      estado: menuEstado.asReadonly(),
      modulos: menuModulos.asReadonly(),
      cargando: computed(() => ['inicial', 'cargando'].includes(menuEstado())),
      error: computed(() => menuEstado() === 'error'),
      cargar: resolverMenu,
      reintentar: resolverMenu,
    };
    await TestBed.configureTestingModule({
      imports: [RegistrarServiciosRealizados], providers: [
        provideRouter([]),
        { provide: ServiciosRealizadosService, useValue: api },
        { provide: ConsultaClinicaService, useValue: consultas },
        { provide: MenuService, useValue: menu }, { provide: PacientesService, useValue: pacientes },
        { provide: ServicioOftalmologicoService, useValue: catalogo },
        { provide: AuthService, useValue: { logout: vi.fn() } },
      ],
    }).overrideComponent(RegistrarServiciosRealizados, {
      remove: { imports: [Sidebar] }, add: { imports: [SidebarPrueba] },
    }).compileComponents();
    fixture = TestBed.createComponent(RegistrarServiciosRealizados); pagina = fixture.componentInstance;
  });

  function iniciar(): void { fixture.detectChanges(); }
  function completar(): void {
    pagina.abrirNuevo();
    pagina.form.controls.paciente_id.setValue(5);
    pagina.form.controls.consulta_clinica_id.setValue(100);
    pagina.form.controls.fecha_realizacion.setValue(fechaParaInput('2020-01-02T12:00:00Z'));
    pagina.filas.at(0).setValue({ servicio_id: 3, precio_aplicado: 150, observaciones: '  Atención realizada  ' });
  }

  it('no solicita datos clínicos sin permiso', () => {
    accion = ''; iniciar();
    expect(api.listar).not.toHaveBeenCalled(); expect(pacientes.listarPacientes).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Acceso no autorizado');
    pagina.abrirNuevo(); expect(pagina.dialogo()).toBeNull();
  });

  it('lectura permite historial y oculta las acciones de escritura', () => {
    accion = 'LECTURA'; iniciar();
    expect(fixture.nativeElement.querySelector('[aria-label="Editar servicio realizado #9"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/gestion-servicios"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('125,25');
    pagina.pedirAnulacion(registro); pagina.confirmarAnulacion();
    expect(api.anular).not.toHaveBeenCalled();
  });

  it('escritura no solicita el historial protegido por lectura', () => {
    accion = 'ESCRITURA'; iniciar();
    expect(pagina.puedeEscribir()).toBe(true); expect(api.listar).not.toHaveBeenCalled();
  });

  it('carga el precio base y muestra un campo de solo lectura', () => {
    iniciar(); pagina.abrirNuevo();
    const fila = pagina.filas.at(0);
    fila.controls.servicio_id.setValue(3); expect(fila.controls.precio_aplicado.value).toBe(150);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="precio_aplicado"]');
    expect(input.readOnly).toBe(true); expect(input.getAttribute('aria-readonly')).toBe('true');
    fila.controls.servicio_id.setValue(4); expect(fila.controls.precio_aplicado.value).toBe(20.50);
  });

  it('rechaza un importe distinto aunque se altere programáticamente el formulario', () => {
    iniciar(); completar(); pagina.filas.at(0).controls.precio_aplicado.setValue(100);
    pagina.guardar(); expect(api.registrarLote).not.toHaveBeenCalled();
    expect(pagina.errorAccion()).toContain('no puede modificarse');
  });

  it('ofrece solo servicios activos del catálogo', () => {
    iniciar(); pagina.abrirNuevo(); fixture.detectChanges();
    const opciones = fixture.nativeElement.querySelector('[formArrayName="servicios"] select').textContent;
    expect(opciones).toContain('Fondo de ojo'); expect(opciones).not.toContain('Servicio inactivo');
  });

  it('bloquea el registro cuando CU21 no tiene precio definido', () => {
    iniciar(); completar();
    const fila = pagina.filas.at(0); fila.controls.servicio_id.setValue(10);
    expect(fila.controls.precio_aplicado.value).toBeNull();
    pagina.guardar(); expect(api.registrarLote).not.toHaveBeenCalled();
    expect(pagina.errorAccion()).toContain('catálogo CU21');
    fila.controls.precio_aplicado.setValue(0); pagina.guardar();
    expect(api.registrarLote).not.toHaveBeenCalled();
  });

  it('permite precio cero cuando ese es el precio configurado en CU21', () => {
    iniciar(); completar(); pagina.filas.at(0).controls.servicio_id.setValue(11);
    pagina.guardar();
    expect(api.registrarLote.mock.lastCall![0].servicios[0].precio_aplicado).toBe(0);
  });

  it('registra precio aplicado, consulta y observación normalizada', () => {
    iniciar(); completar(); pagina.guardar();
    const datos = api.registrarLote.mock.lastCall![0];
    expect(datos.consulta_clinica_id).toBe(100);
    expect(datos.servicios).toEqual([{ servicio_id: 3, precio_aplicado: 150, observaciones: 'Atención realizada' }]);
    expect(datos.fecha_realizacion).toBe('2020-01-02T12:00:00.000Z');
    expect(datos).not.toHaveProperty('oftalmologo_id');
    expect(pagina.dialogo()).toBeNull(); expect(pagina.mensaje()).toContain('Servicio registrado correctamente');
    expect(api.listar.mock.lastCall![0].consulta_clinica_id).toBe(100);
  });

  it('envía varios servicios en una sola petición con observaciones independientes', () => {
    api.registrarLote.mockReturnValue(of([registro, { ...registro, id: 10 }]));
    iniciar(); completar(); pagina.agregarServicio();
    pagina.filas.at(1).setValue({ servicio_id: 4, precio_aplicado: 20.50, observaciones: '  Segunda atención  ' });
    pagina.guardar();
    expect(api.registrarLote).toHaveBeenCalledTimes(1);
    expect(api.registrarLote.mock.lastCall![0].servicios).toEqual([
      { servicio_id: 3, precio_aplicado: 150, observaciones: 'Atención realizada' },
      { servicio_id: 4, precio_aplicado: 20.50, observaciones: 'Segunda atención' },
    ]);
    expect(pagina.mensaje()).toContain('2 servicios registrados correctamente');
  });

  it('quita una fila sin alterar los datos de las otras', () => {
    iniciar(); completar(); pagina.agregarServicio();
    pagina.filas.at(1).controls.servicio_id.setValue(4);
    pagina.quitarServicio(1);
    expect(pagina.filas.length).toBe(1); expect(pagina.filas.at(0).controls.precio_aplicado.value).toBe(150);
    pagina.quitarServicio(0); expect(pagina.filas.length).toBe(1);
  });

  it('exige paciente y servicio pero permite registrar sin consulta', () => {
    iniciar(); pagina.abrirNuevo(); pagina.guardar(); expect(api.registrarLote).not.toHaveBeenCalled();
    completar(); pagina.form.controls.consulta_clinica_id.setValue(null); pagina.guardar();
    expect(api.registrarLote).toHaveBeenCalledTimes(1);
    expect(api.registrarLote.mock.lastCall![0].consulta_clinica_id).toBeNull();
    expect(api.listar.mock.lastCall![0].paciente_id).toBe(5);
    expect(api.listar.mock.lastCall![0].consulta_clinica_id).toBeUndefined();
  });

  it.each([-1, 1.001, 100_000_000, NaN, Infinity])('rechaza el precio inválido %s', precio => {
    iniciar(); completar(); pagina.filas.at(0).controls.precio_aplicado.setValue(precio); pagina.guardar();
    expect(api.registrarLote).not.toHaveBeenCalled();
  });

  it('rechaza fechas futuras y anteriores a la consulta', () => {
    iniciar(); completar();
    pagina.form.controls.fecha_realizacion.setValue(fechaParaInput(new Date(Date.now() + 86_400_000)));
    pagina.guardar(); expect(api.registrarLote).not.toHaveBeenCalled();
    pagina.form.controls.fecha_realizacion.setValue(fechaParaInput('2019-01-01T12:00:00Z'));
    pagina.guardar(); expect(pagina.errorAccion()).toContain('anterior a la consulta');
  });

  it('evita doble envío mientras la petición está pendiente', () => {
    const pendiente = new Subject<ServicioRealizado[]>(); api.registrarLote.mockReturnValue(pendiente);
    iniciar(); completar(); pagina.guardar(); pagina.guardar();
    expect(api.registrarLote).toHaveBeenCalledTimes(1); expect(pagina.guardando()).toBe(true);
    pendiente.next([registro]); pendiente.complete(); expect(pagina.guardando()).toBe(false);
  });

  it('conserva todas las filas ante errores de conexión o conflicto', () => {
    api.registrarLote.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Servicio inactivo' } })));
    iniciar(); completar(); pagina.agregarServicio();
    pagina.filas.at(1).setValue({ servicio_id: 4, precio_aplicado: 20.50, observaciones: 'Segunda' }); pagina.guardar();
    expect(pagina.dialogo()).toBe('formulario'); expect(pagina.filas.length).toBe(2);
    expect(pagina.filas.at(0).controls.observaciones.value).toBe('  Atención realizada  ');
    expect(pagina.errorAccion()).toBe('Servicio inactivo'); expect(pagina.guardando()).toBe(false);
  });

  it('cancela las consultas pendientes y limpia la asociación al cambiar paciente', () => {
    const primera = new Subject<unknown[]>(), segunda = new Subject<unknown[]>();
    consultas.listarConsultas.mockReturnValueOnce(primera).mockReturnValueOnce(segunda);
    iniciar(); pagina.abrirNuevo(); pagina.form.controls.paciente_id.setValue(5);
    pagina.form.controls.consulta_clinica_id.setValue(100); pagina.form.controls.paciente_id.setValue(6);
    expect(pagina.form.controls.consulta_clinica_id.value).toBeNull(); expect(primera.observers.length).toBe(0);
    segunda.next([]); segunda.complete(); expect(pagina.consultas()).toEqual([]);
  });

  it('un fallo de carga de consultas impide guardar y permite reintentar', () => {
    consultas.listarConsultas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    iniciar(); completar(); pagina.guardar(); expect(api.registrarLote).not.toHaveBeenCalled();
    consultas.listarConsultas.mockReturnValue(of([consulta])); pagina.reintentarConsultas(); pagina.guardar();
    expect(api.registrarLote).toHaveBeenCalledTimes(1);
  });

  it('un fallo al cargar consultas permite guardar cuando la asociación queda vacía', () => {
    consultas.listarConsultas.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    iniciar(); completar(); pagina.form.controls.consulta_clinica_id.setValue(null); pagina.guardar();
    expect(api.registrarLote).toHaveBeenCalledTimes(1);
    expect(api.registrarLote.mock.lastCall![0].consulta_clinica_id).toBeNull();
  });

  it('no espera la carga opcional de consultas para registrar sin asociación', () => {
    const pendiente = new Subject<unknown[]>(); consultas.listarConsultas.mockReturnValue(pendiente);
    iniciar(); completar(); pagina.form.controls.consulta_clinica_id.setValue(null); pagina.guardar();
    expect(api.registrarLote).toHaveBeenCalledTimes(1);
    pendiente.complete();
  });

  it('limpia identidad y consulta cuando la búsqueda oculta al paciente seleccionado', () => {
    iniciar(); completar(); pagina.buscarPaciente('Otro');
    expect(pagina.form.controls.paciente_id.value).toBeNull(); expect(pagina.form.controls.consulta_clinica_id.value).toBeNull();
    pagina.guardar(); expect(api.registrarLote).not.toHaveBeenCalled();
  });

  it('al editar conserva el precio aplicado y la precisión de la fecha original', () => {
    consultas.listarConsultas.mockReturnValue(of([{ ...consulta, fecha_consulta: '2020-01-02T12:00:00.100Z' }]));
    iniciar(); pagina.abrirEdicion(registro);
    expect(pagina.filas.at(0).controls.precio_aplicado.value).toBe(125.25);
    pagina.filas.at(0).controls.observaciones.setValue('Corregido'); pagina.guardar();
    expect(api.actualizar.mock.lastCall![0]).toBe(9);
    expect(api.actualizar.mock.lastCall![1].precio_aplicado).toBe(125.25);
    expect(api.actualizar.mock.lastCall![1].fecha_realizacion).toBe(registro.fecha_realizacion);
  });

  it('edita observaciones de un histórico sin importe ni consulta, conservando ambos nulos', () => {
    const historico = { ...registro, precio_aplicado: null, consulta_clinica_id: null };
    api.actualizar.mockReturnValue(of(historico));
    iniciar(); pagina.abrirEdicion(historico);
    expect(pagina.filas.at(0).controls.precio_aplicado.value).toBeNull();
    pagina.filas.at(0).controls.observaciones.setValue('Corregido'); pagina.guardar();
    expect(api.actualizar).toHaveBeenCalledTimes(1);
    expect(api.actualizar.mock.lastCall![1].precio_aplicado).toBeNull();
    expect(api.actualizar.mock.lastCall![1].consulta_clinica_id).toBeNull();
    expect(pagina.precioLegible(null)).toBe('No registrado');
  });

  it('recupera el precio histórico al volver al servicio original durante la edición', () => {
    iniciar(); pagina.abrirEdicion(registro);
    const fila = pagina.filas.at(0);
    fila.controls.servicio_id.setValue(4); expect(fila.controls.precio_aplicado.value).toBe(20.50);
    fila.controls.servicio_id.setValue(3); expect(fila.controls.precio_aplicado.value).toBe(125.25);
    pagina.guardar(); expect(api.actualizar.mock.lastCall![1].precio_aplicado).toBe(125.25);
  });

  it('bloquea referencias que dejaron de estar activas', () => {
    iniciar(); completar(); pagina.pacientes.update(datos => datos.map(p => ({ ...p, estado: false }))); pagina.guardar();
    expect(api.registrarLote).not.toHaveBeenCalled(); expect(pagina.errorAccion()).toContain('activos');
  });

  it('anula solo después de confirmar y actualiza el listado', () => {
    iniciar(); pagina.pedirAnulacion(registro); expect(api.anular).not.toHaveBeenCalled(); pagina.confirmarAnulacion();
    expect(api.anular).toHaveBeenCalledWith(9); expect(api.listar).toHaveBeenCalledTimes(2);
  });

  it('filtra historial por consulta y paciente conservando estado false', () => {
    iniciar(); pagina.filtros.patchValue({ consulta_clinica_id: 100, paciente_id: '5', estado: 'anulados' });
    pagina.aplicarFiltros();
    const filtro = api.listar.mock.lastCall![0];
    expect(filtro.consulta_clinica_id).toBe(100); expect(filtro.paciente_id).toBe(5);
    expect(filtro.estado).toBe(false); expect(filtro.page).toBe(1);
  });

  it('rechaza un rango invertido o un número de consulta inválido', () => {
    iniciar(); pagina.filtros.patchValue({ desde: '2020-01-03', hasta: '2020-01-01' }); pagina.aplicarFiltros();
    expect(api.listar).toHaveBeenCalledTimes(1);
    pagina.filtros.patchValue({ desde: '', hasta: '', consulta_clinica_id: 1.5 }); pagina.aplicarFiltros();
    expect(api.listar).toHaveBeenCalledTimes(1);
  });

  it('consulta el detalle actualizado con el precio aplicado', () => {
    iniciar(); pagina.abrirDetalle(registro);
    expect(api.consultar).toHaveBeenCalledWith(9); expect(pagina.seleccionado()?.precio_aplicado).toBe(125.25);
  });

  it('muestra mensajes claros de validación, sesión y conexión sin trazas', () => {
    expect(mensajeErrorServicios(new HttpErrorResponse({ status: 422 }), 'Error')).toContain('Revisa los datos');
    expect(mensajeErrorServicios(new HttpErrorResponse({ status: 401 }), 'Error')).toContain('sesión');
    expect(mensajeErrorServicios(new HttpErrorResponse({ status: 0 }), 'Error')).toContain('conectar');
    expect(mensajeErrorServicios(new HttpErrorResponse({ status: 500, error: { detail: 'trace secreto' } }), 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});
