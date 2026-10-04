import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, map, Subscription } from 'rxjs';

import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { ServicioOftalmologicoService } from '../../../../../../services/servicio-oftalmologico.service';
import { ConsultaClinicaRespuesta } from '../../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { ConsultaClinicaService } from '../../../cu15-registrar-consulta-clinica/services/consulta-clinica.service';
import { fechaIsoLocal, fechaParaInput, limiteDia } from '../../models/fechas-servicios';
import {
  ServicioCatalogo, ServicioRealizado,
  ServiciosRealizadosFiltros, ServiciosRealizadosPagina, ServiciosRealizadosLoteGuardar,
} from '../../models/servicios-realizados.models';
import { ServiciosRealizadosService } from '../../services/servicios-realizados.service';

function idValido(control: AbstractControl): ValidationErrors | null {
  return Number.isSafeInteger(control.value) && control.value > 0 ? null : { idInvalido: true };
}

function importeValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 &&
    valor <= 99_999_999.99 && /^\d+(\.\d{1,2})?$/.test(String(valor));
}

function precioValido(control: AbstractControl): ValidationErrors | null {
  return control.value === null || importeValido(control.value) ? null : { precioInvalido: true };
}

function idFiltroValido(control: AbstractControl): ValidationErrors | null {
  return control.value === null || control.value === '' ? null : idValido(control);
}

function fechaValida(control: AbstractControl): ValidationErrors | null {
  const iso = fechaIsoLocal(control.value);
  if (!iso) return { fechaInvalida: true };
  return new Date(iso).getTime() > Date.now() ? { fechaFutura: true } : null;
}

export function mensajeErrorServicios(error: unknown, alternativa: string): string {
  if (!(error instanceof HttpErrorResponse)) return alternativa;
  if (error.status === 0) return 'No se pudo conectar con la clínica. Comprueba tu conexión y vuelve a intentar.';
  if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (error.status === 422) return 'Revisa los datos: selecciona un paciente y servicios activos, con precios de catálogo y una fecha válida.';
  if ([400, 403, 404, 409].includes(error.status) && typeof error.error?.detail === 'string') {
    return error.error.detail;
  }
  return alternativa;
}

@Component({
  selector: 'app-registrar-servicios-realizados',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Sidebar],
  templateUrl: './registrar-servicios-realizados.html',
  styleUrl: './registrar-servicios-realizados.css',
})
export class RegistrarServiciosRealizados implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly documento = inject(DOCUMENT);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly service = inject(ServiciosRealizadosService);
  private readonly pacientesService = inject(PacientesService);
  private readonly catalogoService = inject(ServicioOftalmologicoService);
  private readonly consultasService = inject(ConsultaClinicaService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly suscripcionesFilas = new Map<object, Subscription>();
  private listadoPeticion?: Subscription;
  private consultasPeticion?: Subscription;
  private detallePeticion?: Subscription;
  private focoAnterior: HTMLElement | null = null;
  private fechaOriginalLocal = '';
  private filtrosAplicados: ServiciosRealizadosFiltros = { estado: true };

  readonly sidebarMovilAbierto = signal(false);
  readonly cargandoPermisos = signal(true);
  readonly errorPermisos = signal<string | null>(null);
  readonly accion = signal('');
  readonly puedeLeer = computed(() => ['LECTURA', 'AMBAS'].includes(this.accion()));
  readonly puedeEscribir = computed(() => ['ESCRITURA', 'AMBAS'].includes(this.accion()));
  readonly pacientes = signal<Paciente[]>([]);
  readonly catalogo = signal<ServicioCatalogo[]>([]);
  readonly cargandoCatalogos = signal(false);
  readonly errorCatalogos = signal<string | null>(null);
  readonly consultas = signal<ConsultaClinicaRespuesta[]>([]);
  readonly cargandoConsultas = signal(false);
  readonly errorConsultas = signal<string | null>(null);
  readonly pagina = signal(1);
  readonly resultado = signal<ServiciosRealizadosPagina>({
    items: [], total: 0, page: 1, page_size: 20, total_pages: 0,
  });
  readonly cargandoListado = signal(false);
  readonly errorListado = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly errorAccion = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly dialogo = signal<'formulario' | 'detalle' | 'anulacion' | null>(null);
  readonly seleccionado = signal<ServicioRealizado | null>(null);
  readonly buscandoPaciente = signal('');
  readonly pacientesFormulario = computed(() => {
    const termino = this.buscandoPaciente().trim().toLocaleLowerCase();
    return this.pacientes().filter(p => p.estado &&
      `${p.nombres} ${p.apellidos} ${p.ci ?? ''}`.toLocaleLowerCase().includes(termino));
  });
  readonly serviciosActivos = computed(() => this.catalogo().filter(s => s.estado === true));
  readonly hayServiciosActivos = computed(() => this.serviciosActivos().length > 0);

  readonly form = this.fb.group({
    paciente_id: this.fb.control<number | null>(null, [Validators.required, idValido]),
    consulta_clinica_id: this.fb.control<number | null>(null, idFiltroValido),
    fecha_realizacion: this.fb.nonNullable.control('', [Validators.required, fechaValida]),
    servicios: this.fb.array([this.crearServicioFila()], [Validators.required, Validators.maxLength(50)]),
  });
  readonly filas = this.form.controls.servicios;
  readonly filtros = this.fb.nonNullable.group({
    paciente_id: '', servicio_id: '',
    consulta_clinica_id: this.fb.control<number | null>(null, idFiltroValido),
    estado: 'activos', desde: '', hasta: '', page_size: 20,
  });

  ngOnInit(): void {
    this.form.controls.paciente_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.cargarConsultas(id));
    this.cargarPermisos();
  }

  cargarPermisos(): void {
    this.cargandoPermisos.set(true);
    this.errorPermisos.set(null);
    this.menuService.obtenerMenu().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: modulos => {
        const funcion = modulos.flatMap(m => m.funciones).find(f =>
          f.nombre.trim().toLocaleLowerCase() === 'registrar servicios realizados');
        this.accion.set(funcion?.accion_nombre.trim().toUpperCase() ?? '');
        this.cargandoPermisos.set(false);
        if (this.puedeLeer() || this.puedeEscribir()) this.cargarCatalogos();
        if (this.puedeLeer()) this.cargarListado();
      },
      error: error => {
        this.cargandoPermisos.set(false);
        this.errorPermisos.set(mensajeErrorServicios(error, 'No se pudieron comprobar tus permisos.'));
      },
    });
  }

  cargarCatalogos(): void {
    if (this.cargandoCatalogos()) return;
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);
    forkJoin({
      pacientes: this.pacientesService.listarPacientes(),
      servicios: this.catalogoService.listarServicios(),
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoCatalogos.set(false)))
      .subscribe({
        next: datos => {
          this.pacientes.set(datos.pacientes);
          this.catalogo.set(datos.servicios.filter((s): s is ServicioCatalogo =>
            typeof s.id === 'number' && Number.isSafeInteger(s.id) && s.id > 0));
        },
        error: error => this.errorCatalogos.set(
          mensajeErrorServicios(error, 'No se pudieron cargar los pacientes y servicios.')),
      });
  }

  cargarListado(): void {
    if (!this.puedeLeer()) return;
    this.listadoPeticion?.unsubscribe();
    this.cargandoListado.set(true);
    this.errorListado.set(null);
    const filtros = { ...this.filtrosAplicados, page: this.pagina(), page_size: this.filtros.controls.page_size.value };
    this.listadoPeticion = this.service.listar(filtros)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: resultado => {
          const ultima = Math.max(1, resultado.total_pages);
          if (this.pagina() > ultima) {
            this.pagina.set(ultima);
            this.cargarListado();
            return;
          }
          this.resultado.set(resultado);
          this.cargandoListado.set(false);
        },
        error: error => {
          this.cargandoListado.set(false);
          this.errorListado.set(mensajeErrorServicios(error, 'No se pudieron cargar los servicios realizados.'));
        },
      });
  }

  aplicarFiltros(): void {
    this.filtros.markAllAsTouched();
    if (this.filtros.invalid) { this.errorListado.set('El número de consulta debe ser un entero positivo.'); return; }
    const f = this.filtros.getRawValue();
    const desde = f.desde ? limiteDia(f.desde) : undefined;
    const hasta = f.hasta ? limiteDia(f.hasta, true) : undefined;
    if ((f.desde && !desde) || (f.hasta && !hasta) || (desde && hasta && desde > hasta)) {
      this.errorListado.set('La fecha inicial debe ser válida y no puede ser posterior a la fecha final.');
      return;
    }
    this.filtrosAplicados = {
      paciente_id: f.paciente_id ? Number(f.paciente_id) : undefined,
      servicio_id: f.servicio_id ? Number(f.servicio_id) : undefined,
      consulta_clinica_id: f.consulta_clinica_id ?? undefined,
      estado: f.estado === 'activos', desde: desde ?? undefined, hasta: hasta ?? undefined,
    };
    this.pagina.set(1);
    this.cargarListado();
  }

  limpiarFiltros(): void {
    this.filtros.reset({ paciente_id: '', servicio_id: '', consulta_clinica_id: null, estado: 'activos', desde: '', hasta: '', page_size: 20 });
    this.aplicarFiltros();
  }

  cambiarPagina(numero: number): void {
    if (this.cargandoListado() || numero < 1 || numero > this.resultado().total_pages) return;
    this.pagina.set(numero);
    this.cargarListado();
  }

  buscarPaciente(termino: string): void {
    this.buscandoPaciente.set(termino);
    const id = this.form.controls.paciente_id.value;
    if (id && !this.pacientesFormulario().some(p => p.id === id)) {
      this.form.controls.paciente_id.setValue(null);
    }
  }

  pacienteActualFueraDeLista(): ServicioRealizado['paciente'] | null {
    const actual = this.seleccionado()?.paciente;
    return actual && this.form.controls.paciente_id.value === actual.id &&
      !this.pacientesFormulario().some(p => p.id === actual.id) ? actual : null;
  }

  abrirNuevo(): void {
    if (!this.puedeEscribir() || this.guardando()) return;
    this.seleccionado.set(null);
    this.buscandoPaciente.set('');
    this.consultasPeticion?.unsubscribe();
    this.consultas.set([]);
    this.cargandoConsultas.set(false);
    this.errorConsultas.set(null);
    this.fechaOriginalLocal = '';
    this.form.reset({
      paciente_id: null, consulta_clinica_id: null, fecha_realizacion: fechaParaInput(),
    }, { emitEvent: false });
    this.reiniciarServicios();
    this.abrirDialogo('formulario');
  }

  abrirDetalle(registro: ServicioRealizado): void {
    if (!this.puedeLeer() || this.guardando()) return;
    this.detallePeticion?.unsubscribe();
    this.seleccionado.set(null);
    this.cargandoDetalle.set(true);
    this.abrirDialogo('detalle');
    this.detallePeticion = this.service.consultar(registro.id)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: datos => { this.seleccionado.set(datos); this.cargandoDetalle.set(false); },
        error: error => {
          this.cargandoDetalle.set(false);
          this.errorAccion.set(mensajeErrorServicios(error, 'No se pudo consultar el servicio realizado.'));
        },
      });
  }

  abrirEdicion(registro: ServicioRealizado): void {
    if (!this.puedeEscribir() || !registro.estado || this.guardando()) return;
    this.seleccionado.set(registro);
    this.buscandoPaciente.set('');
    this.fechaOriginalLocal = registro.fecha_realizacion ? fechaParaInput(registro.fecha_realizacion) : '';
    this.form.reset({
      paciente_id: registro.paciente_id, consulta_clinica_id: registro.consulta_clinica_id,
      fecha_realizacion: this.fechaOriginalLocal || fechaParaInput(),
    }, { emitEvent: false });
    this.reiniciarServicios({
      servicio_id: registro.servicio_id, precio_aplicado: registro.precio_aplicado,
      observaciones: registro.observaciones,
    });
    this.cargarConsultas(registro.paciente_id, registro.consulta_clinica_id);
    this.abrirDialogo('formulario');
  }

  private crearServicioFila(datos?: { servicio_id: number; precio_aplicado: number | null; observaciones: string | null }) {
    const fila = this.fb.group({
      servicio_id: this.fb.control<number | null>(datos?.servicio_id ?? null, [Validators.required, idValido]),
      precio_aplicado: this.fb.control<number | null>(datos?.precio_aplicado ?? null, precioValido),
      observaciones: this.fb.nonNullable.control(datos?.observaciones ?? ''),
    });
    const suscripcion = fila.controls.servicio_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => {
        const servicio = this.catalogo().find(s => s.id === id && s.estado === true);
        const original = this.seleccionado();
        const precio = original?.servicio_id === id ? original.precio_aplicado : servicio?.precio_base;
        fila.controls.precio_aplicado.setValue(
          typeof precio === 'number' && Number.isFinite(precio) && precio >= 0 ? precio : null,
        );
      });
    this.suscripcionesFilas.set(fila, suscripcion);
    return fila;
  }

  private reiniciarServicios(datos?: { servicio_id: number; precio_aplicado: number | null; observaciones: string | null }): void {
    this.suscripcionesFilas.forEach(s => s.unsubscribe());
    this.suscripcionesFilas.clear();
    this.filas.clear({ emitEvent: false });
    this.filas.push(this.crearServicioFila(datos), { emitEvent: false });
  }

  agregarServicio(): void {
    if (this.guardando() || this.seleccionado() || this.filas.length >= 50) return;
    this.filas.push(this.crearServicioFila());
  }

  quitarServicio(indice: number): void {
    if (this.guardando() || this.seleccionado() || this.filas.length <= 1) return;
    const fila = this.filas.at(indice);
    this.suscripcionesFilas.get(fila)?.unsubscribe();
    this.suscripcionesFilas.delete(fila);
    this.filas.removeAt(indice);
  }

  servicioFilaNoDisponible(indice: number): ServicioCatalogo | null {
    const id = this.filas.at(indice).controls.servicio_id.value;
    return id && !this.serviciosActivos().some(s => s.id === id)
      ? this.catalogo().find(s => s.id === id) ?? this.seleccionado()?.servicio ?? null : null;
  }

  precioLegible(precio: number | null): string {
    return precio === null || !Number.isFinite(precio) ? 'No registrado' :
      new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(precio);
  }

  totalAplicado(): number {
    return this.filas.controls.reduce((total, fila) => {
      const precio = fila.controls.precio_aplicado.value;
      return total + (typeof precio === 'number' && Number.isFinite(precio) && precio >= 0 ? Math.round(precio * 100) : 0);
    }, 0) / 100;
  }

  reintentarConsultas(): void {
    this.cargarConsultas(this.form.controls.paciente_id.value, this.form.controls.consulta_clinica_id.value);
  }

  private cargarConsultas(pacienteId: number | null, seleccion: number | null = null): void {
    this.consultasPeticion?.unsubscribe();
    this.consultas.set([]);
    this.errorConsultas.set(null);
    this.form.controls.consulta_clinica_id.setValue(seleccion, { emitEvent: false });
    if (!pacienteId) { this.cargandoConsultas.set(false); return; }
    this.cargandoConsultas.set(true);
    this.consultasPeticion = this.consultasService.listarConsultas({ paciente_id: pacienteId })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: consultas => {
          this.consultas.set(consultas.filter(c => c.estado));
          this.cargandoConsultas.set(false);
        },
        error: error => {
          this.cargandoConsultas.set(false);
          this.errorConsultas.set(mensajeErrorServicios(error, 'No se pudieron cargar las consultas de este paciente.'));
        },
      });
  }

  consultaFueraDeLista(): number | null {
    const id = this.form.controls.consulta_clinica_id.value;
    return id && !this.consultas().some(c => c.id === id) ? id : null;
  }

  guardar(): void {
    if (!this.puedeEscribir() || this.guardando()) return;
    this.form.controls.fecha_realizacion.updateValueAndValidity();
    this.form.markAllAsTouched();
    this.errorAccion.set(null);
    if (this.form.invalid || this.cargandoCatalogos() || this.errorCatalogos() ||
        (this.form.controls.consulta_clinica_id.value !== null && (this.cargandoConsultas() || this.errorConsultas())) ||
        !this.hayServiciosActivos()) return;
    const valores = this.form.getRawValue();
    if (valores.paciente_id === null) return;
    if (!this.pacientes().some(p => p.id === valores.paciente_id && p.estado) ||
        valores.servicios.some(f => !this.serviciosActivos().some(s => s.id === f.servicio_id))) {
      this.errorAccion.set('Selecciona un paciente y servicios activos para guardar la atención.');
      return;
    }
    const consulta = this.consultas().find(c => c.id === valores.consulta_clinica_id && c.estado);
    if (valores.consulta_clinica_id !== null && !consulta) {
      this.errorAccion.set('Selecciona una consulta clínica activa del paciente o registra sin consulta asociada.');
      return;
    }
    const registro = this.seleccionado();
    const precios = valores.servicios.map(fila => registro?.servicio_id === fila.servicio_id
      ? registro.precio_aplicado : this.catalogo().find(s => s.id === fila.servicio_id)?.precio_base ?? null);
    if (precios.some((precio, i) => precio === null
      ? registro?.servicio_id !== valores.servicios[i].servicio_id : !importeValido(precio))) {
      this.errorAccion.set('El servicio no tiene un precio válido. Configúralo en el catálogo CU21 antes de registrarlo.');
      return;
    }
    if (valores.servicios.some((fila, i) => fila.precio_aplicado !== precios[i])) {
      this.errorAccion.set('El precio se carga automáticamente y no puede modificarse. Vuelve a seleccionar el servicio.');
      return;
    }
    const fecha = registro?.fecha_realizacion && valores.fecha_realizacion === this.fechaOriginalLocal
      ? registro.fecha_realizacion : fechaIsoLocal(valores.fecha_realizacion)!;
    if (consulta && new Date(fecha).getTime() < new Date(consulta.fecha_consulta).getTime()) {
      this.errorAccion.set('La fecha de realización no puede ser anterior a la consulta seleccionada.');
      return;
    }
    const datos: ServiciosRealizadosLoteGuardar = {
      paciente_id: valores.paciente_id, consulta_clinica_id: valores.consulta_clinica_id,
      fecha_realizacion: fecha,
      servicios: valores.servicios.map(fila => ({
        servicio_id: fila.servicio_id!, precio_aplicado: fila.precio_aplicado,
        observaciones: fila.observaciones.trim() || null,
      })),
    };
    this.guardando.set(true);
    const peticion = registro
      ? this.service.actualizar(registro.id, { ...datos.servicios[0], paciente_id: datos.paciente_id,
          consulta_clinica_id: datos.consulta_clinica_id, fecha_realizacion: fecha }).pipe(map(r => [r]))
      : this.service.registrarLote(datos);
    peticion.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false)))
      .subscribe({
        next: guardados => {
          this.dialogo.set(null);
          this.restaurarFoco();
          const paciente = guardados[0].paciente;
          this.mensaje.set(`${registro ? 'Servicio actualizado' : guardados.length === 1 ? 'Servicio registrado' :
            guardados.length + ' servicios registrados'} correctamente para ${paciente.nombres} ${paciente.apellidos}.`);
          if (this.puedeLeer()) {
            this.filtros.patchValue({ paciente_id: String(datos.paciente_id),
              consulta_clinica_id: datos.consulta_clinica_id, servicio_id: '', estado: 'activos', desde: '', hasta: '' });
            this.aplicarFiltros();
          }
        },
        error: error => this.errorAccion.set(mensajeErrorServicios(error, 'No se pudieron guardar los servicios. Tus datos se conservaron.')),
      });
  }

  pedirAnulacion(registro: ServicioRealizado): void {
    if (!this.puedeEscribir() || !registro.estado || this.guardando()) return;
    this.seleccionado.set(registro);
    this.abrirDialogo('anulacion');
  }

  confirmarAnulacion(): void {
    const registro = this.seleccionado();
    if (!registro || !this.puedeEscribir() || this.guardando()) return;
    this.guardando.set(true);
    this.errorAccion.set(null);
    this.service.anular(registro.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.dialogo.set(null);
          this.restaurarFoco();
          this.mensaje.set('El servicio realizado fue anulado. Su registro se conserva en el historial.');
          this.cargarListado();
        },
        error: error => this.errorAccion.set(mensajeErrorServicios(error, 'No se pudo anular el servicio realizado.')),
      });
  }

  private abrirDialogo(tipo: 'formulario' | 'detalle' | 'anulacion'): void {
    if (!this.dialogo()) this.focoAnterior = this.documento.activeElement as HTMLElement;
    this.errorAccion.set(null);
    this.sidebarMovilAbierto.set(false);
    this.dialogo.set(tipo);
    setTimeout(() => this.elemento.nativeElement.querySelector<HTMLElement>('[data-dialog-focus]')?.focus());
  }

  cerrarDialogo(): void {
    if (this.guardando()) return;
    this.detallePeticion?.unsubscribe();
    this.dialogo.set(null);
    this.restaurarFoco();
  }

  private restaurarFoco(): void {
    const anterior = this.focoAnterior;
    this.focoAnterior = null;
    setTimeout(() => {
      if (anterior?.isConnected) anterior.focus();
      else this.elemento.nativeElement.querySelector<HTMLElement>('.cabecera button')?.focus();
    });
  }

  @HostListener('document:keydown', ['$event'])
  tecladoDialogo(evento: KeyboardEvent): void {
    if (!this.dialogo()) return;
    if (evento.key === 'Escape') { evento.preventDefault(); this.cerrarDialogo(); return; }
    if (evento.key !== 'Tab') return;
    const elementos = Array.from(this.elemento.nativeElement.querySelectorAll<HTMLElement>(
      '[role="dialog"] button:not(:disabled), [role="dialog"] input:not(:disabled), [role="dialog"] select:not(:disabled), [role="dialog"] textarea:not(:disabled), [role="dialog"] a[href]'));
    const primero = elementos[0], ultimo = elementos.at(-1);
    if (!primero || !ultimo) return;
    if (evento.shiftKey && (this.documento.activeElement === primero || this.documento.activeElement?.hasAttribute('data-dialog-focus'))) {
      evento.preventDefault(); ultimo.focus();
    } else if (!evento.shiftKey && this.documento.activeElement === ultimo) {
      evento.preventDefault(); primero.focus();
    }
  }

  nombrePaciente(registro: ServicioRealizado): string {
    return `${registro.paciente.nombres} ${registro.paciente.apellidos}`;
  }

  fechaLegible(fecha: string | null): string {
    if (!fecha) return 'Sin fecha registrada';
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime()) ? 'Fecha no disponible' :
      new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(valor);
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
