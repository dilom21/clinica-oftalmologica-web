import { Component, computed, inject, Input, OnChanges, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MenuService } from '../../../../../../core/services/menu.service';
import { ID_ROL_USUARIO } from '../../../../../autenticacion-seguridad/Auth/models/auth.models';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { mensajeErrorHttp } from '../../../../../agenda-citas/casos-uso/cu11-configurar-disponibilidad/utils/errores';
import { ConsultaClinicaRespuesta } from '../../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { ConsultaClinicaService } from '../../../cu15-registrar-consulta-clinica/services/consulta-clinica.service';
import {
  ControlMedicoActualizar,
  ControlMedicoRespuesta,
  EstadoControlMedico,
  ESTADOS_CONTROL_MEDICO,
  esFechaControlValida,
  fechaActualClinica,
  formatearFechaControl,
  MOTIVO_CONTROL_MAX_LENGTH,
} from '../../models/control-medico.models';
import { ControlMedicoService } from '../../services/control-medico.service';

function normalizarNombre(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

@Component({
  selector: 'app-seguimiento-controles',
  imports: [ReactiveFormsModule],
  templateUrl: './seguimiento-controles.html',
  styleUrl: './seguimiento-controles.css',
})
export class SeguimientoControles implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) pacienteId!: number;
  @Input() consultaInicialId: number | null = null;

  protected readonly consultas = signal<ConsultaClinicaRespuesta[]>([]);
  protected readonly controles = signal<ControlMedicoRespuesta[]>([]);
  protected readonly cargandoConsultas = signal(false);
  protected readonly cargandoControles = signal(false);
  protected readonly errorConsultas = signal<string | null>(null);
  protected readonly errorControles = signal<string | null>(null);
  protected readonly errorPermisos = signal<string | null>(null);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly formularioAbierto = signal(false);
  protected readonly consultaFormulario = signal<ConsultaClinicaRespuesta | null>(null);
  protected readonly controlEnEdicion = signal<ControlMedicoRespuesta | null>(null);
  protected readonly filtroConsultaId = signal<number | null>(null);
  protected readonly permisoEscritura = signal(false);
  protected readonly oftalmologoId = signal<number | null>(null);
  private readonly permisosCargados = signal(false);
  private readonly perfilCargado = signal(false);
  protected readonly cargandoSesion = computed(() => !this.permisosCargados() || !this.perfilCargado());
  protected readonly estados = ESTADOS_CONTROL_MEDICO;
  protected readonly motivoMax = MOTIVO_CONTROL_MAX_LENGTH;
  protected readonly fecha = formatearFechaControl;
  protected readonly contextoDisponible = computed(() => !this.cargandoConsultas() && !this.cargandoControles() && !this.errorConsultas() && !this.errorControles());

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly consultaService = inject(ConsultaClinicaService);
  private readonly controlService = inject(ControlMedicoService);
  private readonly sesionSubs = new Subscription();
  private contextoSubs = new Subscription();
  private contextoVersion = 0;
  private listaControlesVersion = 0;
  private contextoInicialAbierto = false;

  protected readonly form = this.fb.nonNullable.group({
    fecha_programada: ['', [Validators.required]],
    motivo: ['', [Validators.required, Validators.maxLength(MOTIVO_CONTROL_MAX_LENGTH), Validators.pattern(/\S/)]],
    observaciones: [''],
    estado: ['PROGRAMADO' as EstadoControlMedico, [Validators.required]],
  });

  protected readonly controlesFiltrados = computed(() => {
    const consultaId = this.filtroConsultaId();
    return this.controles().filter((control) => consultaId === null || control.consulta_clinica_id === consultaId);
  });

  ngOnInit(): void {
    this.sesionSubs.add(this.menuService.obtenerMenu().subscribe({
      next: (modulos) => {
        this.permisoEscritura.set(modulos.some((modulo) => modulo.funciones.some((funcion) =>
          normalizarNombre(funcion.nombre) === 'programar controles medicos' &&
          ['escritura', 'ambas'].includes(normalizarNombre(funcion.accion_nombre)),
        )));
        this.permisosCargados.set(true);
        this.abrirContextoInicial();
      },
      error: (error: unknown) => {
        this.errorPermisos.set(this.error(error));
        this.permisosCargados.set(true);
      },
    }));
    if (this.authService.obtenerRolIdActual() === ID_ROL_USUARIO.OFTALMOLOGO) {
      this.sesionSubs.add(this.controlService.obtenerOftalmologoActual().subscribe({
        next: (oftalmologo) => {
          this.oftalmologoId.set(oftalmologo?.id ?? null);
          this.perfilCargado.set(true);
          this.abrirContextoInicial();
        },
        error: (error: unknown) => {
          this.errorPermisos.set(this.error(error));
          this.perfilCargado.set(true);
        },
      }));
    } else {
      this.perfilCargado.set(true);
    }
  }

  ngOnChanges(): void {
    this.contextoSubs.unsubscribe();
    this.contextoSubs = new Subscription();
    this.contextoVersion++;
    this.contextoInicialAbierto = false;
    this.consultas.set([]);
    this.controles.set([]);
    this.filtroConsultaId.set(this.consultaInicialId);
    this.enviando.set(false);
    this.formularioAbierto.set(false);
    this.consultaFormulario.set(null);
    this.controlEnEdicion.set(null);
    this.exito.set(null);
    this.errorEnvio.set(null);
    this.errorConsultas.set(null);
    this.errorControles.set(null);
    if (Number.isInteger(this.pacienteId) && this.pacienteId > 0) this.cargar();
  }

  ngOnDestroy(): void {
    this.contextoVersion++;
    this.contextoSubs.unsubscribe();
    this.sesionSubs.unsubscribe();
  }

  protected cargar(): void {
    const version = this.contextoVersion;
    const listaVersion = ++this.listaControlesVersion;
    this.cargandoConsultas.set(true);
    this.cargandoControles.set(true);
    this.errorConsultas.set(null);
    this.errorControles.set(null);
    this.contextoSubs.add(this.consultaService.listarConsultas({ paciente_id: this.pacienteId }).subscribe({
      next: (consultas) => {
        if (version !== this.contextoVersion) return;
        this.consultas.set(consultas);
        this.cargandoConsultas.set(false);
        this.abrirContextoInicial();
      },
      error: (error: unknown) => {
        if (version !== this.contextoVersion) return;
        this.cargandoConsultas.set(false);
        this.errorConsultas.set(this.error(error));
      },
    }));
    this.contextoSubs.add(this.controlService.listarControles({ paciente_id: this.pacienteId }).subscribe({
      next: (controles) => {
        if (version !== this.contextoVersion || listaVersion !== this.listaControlesVersion) return;
        this.controles.set(controles);
        this.cargandoControles.set(false);
        this.abrirContextoInicial();
      },
      error: (error: unknown) => {
        if (version !== this.contextoVersion || listaVersion !== this.listaControlesVersion) return;
        this.cargandoControles.set(false);
        this.errorControles.set(this.error(error));
      },
    }));
  }

  private abrirContextoInicial(): void {
    if (this.contextoInicialAbierto || !this.consultaInicialId || !this.contextoDisponible()) return;
    const consulta = this.consultas().find((registro) => registro.id === this.consultaInicialId);
    if (consulta && this.puedeAdministrarConsulta(consulta)) {
      this.contextoInicialAbierto = true;
      this.programar(consulta);
    }
  }

  protected motivoSesion(): string | null {
    if (this.cargandoSesion()) return 'Verificando permisos y perfil del oftalmólogo...';
    if (this.errorPermisos()) return this.errorPermisos();
    if (this.authService.obtenerRolIdActual() !== ID_ROL_USUARIO.OFTALMOLOGO) {
      return 'Solo un oftalmólogo puede programar controles médicos. Inicia sesión con el responsable de la atención.';
    }
    if (this.oftalmologoId() === null) {
      return 'Tu cuenta no tiene un perfil de oftalmólogo activo. Para programar un control, inicia sesión con el oftalmólogo responsable de la atención.';
    }
    if (!this.permisoEscritura()) {
      return 'Tu cuenta no tiene permiso de escritura para programar controles médicos. Solicita al administrador que revise tus permisos.';
    }
    return null;
  }

  protected motivoConsulta(consulta: ConsultaClinicaRespuesta): string | null {
    const motivoSesion = this.motivoSesion();
    if (motivoSesion) return motivoSesion;
    if (this.oftalmologoId() !== consulta.oftalmologo.id) {
      return `Solo ${this.nombreOftalmologo(consulta)} puede programar controles de esta atención. Selecciona una consulta tuya o inicia sesión con su cuenta.`;
    }
    if (!consulta.estado) return 'Esta consulta está inactiva. El control requiere una atención clínica activa.';
    const fecha = consulta.fecha_consulta;
    const instante = fecha ? new Date(fecha.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(fecha) ? fecha : `${fecha}Z`) : null;
    if (!instante || Number.isNaN(instante.getTime())) {
      return 'La fecha de esta consulta no es válida. Revisa el registro antes de programar un control.';
    }
    if (instante.getTime() > Date.now()) {
      return 'Esta atención tiene una fecha futura. Podrás programar un control después de la atención.';
    }
    return null;
  }

  protected puedeAdministrarConsulta(consulta: ConsultaClinicaRespuesta): boolean {
    return this.motivoConsulta(consulta) === null;
  }

  protected puedeEditar(control: ControlMedicoRespuesta): boolean {
    const consulta = this.consultas().find((registro) => registro.id === control.consulta_clinica_id);
    return !!consulta && control.oftalmologo_id === this.oftalmologoId() && this.puedeAdministrarConsulta(consulta);
  }

  protected programar(consulta: ConsultaClinicaRespuesta): void {
    if (this.enviando() || !this.contextoDisponible() || !this.puedeAdministrarConsulta(consulta)) return;
    this.consultaFormulario.set(consulta);
    this.controlEnEdicion.set(null);
    if (this.filtroConsultaId() !== null) this.filtroConsultaId.set(consulta.id);
    this.form.reset({ fecha_programada: '', motivo: '', observaciones: '', estado: 'PROGRAMADO' });
    this.errorEnvio.set(null);
    this.exito.set(null);
    this.formularioAbierto.set(true);
  }

  protected editar(control: ControlMedicoRespuesta): void {
    if (this.enviando() || !this.contextoDisponible() || !this.puedeEditar(control)) return;
    const version = this.contextoVersion;
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.contextoSubs.add(this.controlService.obtenerControl(control.id).subscribe({
      next: (detalle) => {
        if (version !== this.contextoVersion) return;
        this.enviando.set(false);
        const consulta = this.consultas().find((registro) => registro.id === detalle.consulta_clinica_id);
        if (!consulta || detalle.paciente_id !== this.pacienteId || !this.puedeEditar(detalle)) return;
        this.consultaFormulario.set(consulta);
        this.controlEnEdicion.set(detalle);
        this.form.reset({
          fecha_programada: detalle.fecha_programada,
          motivo: detalle.motivo ?? '',
          observaciones: detalle.observaciones ?? '',
          estado: detalle.estado ?? 'PROGRAMADO',
        });
        this.exito.set(null);
        this.formularioAbierto.set(true);
      },
      error: (error: unknown) => {
        if (version !== this.contextoVersion) return;
        this.enviando.set(false);
        this.errorEnvio.set(this.error(error));
      },
    }));
  }

  protected cerrarFormulario(): void {
    if (this.enviando()) return;
    this.formularioAbierto.set(false);
    this.consultaFormulario.set(null);
    this.controlEnEdicion.set(null);
    this.errorEnvio.set(null);
  }

  protected cambiarFiltro(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.filtroConsultaId.set(valor ? Number(valor) : null);
  }

  protected fechaMinima(): string {
    const fechaConsulta = this.fechaConsulta(this.consultaFormulario()?.fecha_consulta);
    const control = this.controlEnEdicion();
    const valor = this.form.getRawValue();
    const puedeConservarFecha = control && valor.fecha_programada === control.fecha_programada &&
      !(control.estado !== 'PROGRAMADO' && valor.estado === 'PROGRAMADO');
    return puedeConservarFecha ? fechaConsulta : [fechaActualClinica(), fechaConsulta].sort().at(-1)!;
  }

  protected guardar(): void {
    if (this.enviando() || !this.contextoDisponible()) return;
    const consulta = this.consultaFormulario();
    if (!consulta || !this.puedeAdministrarConsulta(consulta)) return;
    this.form.markAllAsTouched();
    const valor = this.form.getRawValue();
    if (this.form.invalid || !esFechaControlValida(valor.fecha_programada) ||
      valor.fecha_programada < this.fechaMinima()) {
      this.errorEnvio.set('Revisa los campos obligatorios y la fecha del control antes de guardar.');
      return;
    }
    const control = this.controlEnEdicion();
    const observaciones = valor.observaciones.trim() || null;
    const actualizacion: ControlMedicoActualizar = { motivo: valor.motivo.trim(), observaciones };
    if (control && valor.fecha_programada !== control.fecha_programada) actualizacion.fecha_programada = valor.fecha_programada;
    if (control && valor.estado !== control.estado) actualizacion.estado = valor.estado;
    const solicitud = control
      ? this.controlService.actualizarControl(control.id, actualizacion)
      : this.controlService.programarControl(consulta.id, {
        fecha_programada: valor.fecha_programada, motivo: valor.motivo.trim(), observaciones,
      });
    const version = this.contextoVersion;
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.contextoSubs.add(solicitud.subscribe({
      next: (respuesta) => {
        if (version !== this.contextoVersion || respuesta.paciente_id !== this.pacienteId) return;
        this.listaControlesVersion++;
        this.cargandoControles.set(false);
        this.controles.update((lista) => [...lista.filter((registro) => registro.id !== respuesta.id), respuesta]
          .sort((a, b) => b.fecha_programada.localeCompare(a.fecha_programada) || b.id - a.id));
        this.enviando.set(false);
        this.formularioAbierto.set(false);
        this.consultaFormulario.set(null);
        this.controlEnEdicion.set(null);
        this.exito.set(control ? 'Control médico actualizado correctamente.' : 'Control médico programado correctamente.');
      },
      error: (error: unknown) => {
        if (version !== this.contextoVersion) return;
        this.enviando.set(false);
        this.errorEnvio.set(this.error(error));
      },
    }));
  }

  protected campoInvalido(campo: 'fecha_programada' | 'motivo'): boolean {
    const control = this.form.controls[campo];
    return (control.touched || control.dirty) && (control.invalid ||
      (campo === 'fecha_programada' && (!esFechaControlValida(control.value) || control.value < this.fechaMinima())));
  }

  protected fechaConsulta(fecha: string | undefined): string {
    if (!fecha) return '';
    const instante = new Date(fecha.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(fecha) ? fecha : `${fecha}Z`);
    return Number.isNaN(instante.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(instante);
  }

  protected nombreOftalmologo(consulta: ConsultaClinicaRespuesta): string {
    return `${consulta.oftalmologo.nombres} ${consulta.oftalmologo.apellidos}`.trim();
  }

  protected etiquetaEstado(estado: EstadoControlMedico | null): string {
    return estado === 'PROGRAMADO' ? 'Programado' : estado === 'REALIZADO' ? 'Realizado' : estado === 'CANCELADO' ? 'Cancelado' : 'Sin estado';
  }

  private error(error: unknown): string {
    return mensajeErrorHttp(error, {
      mensaje403: 'No tienes permisos para realizar esta operación sobre controles médicos.',
      mensaje404: 'No se encontró la consulta o el control médico solicitado.',
    });
  }
}
