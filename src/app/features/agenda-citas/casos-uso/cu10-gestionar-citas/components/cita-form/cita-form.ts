import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AgendaService } from '../../../cu09-consultar-agenda-disponibilidad/services/agenda.service';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { CitasService } from '../../services/citas.service';
import {
  DisponibilidadCita,
  fechaActualInput,
  formatearFechaCita,
  formatearHoraCita,
  horariosReservables,
  IntervaloCita,
  OftalmologoCita,
} from '../../models/citas.models';
import { SelectorHorarios } from '../selector-horarios/selector-horarios';

@Component({
  selector: 'app-cu10-cita-form',
  imports: [SelectorHorarios],
  templateUrl: './cita-form.html',
  styleUrl: './cita-form.css',
})
export class CitaForm {
  readonly pacientes = input<Paciente[]>([]);
  readonly oftalmologos = input<OftalmologoCita[]>([]);

  readonly citaRegistrada = output<{ fecha: string }>();

  private readonly elementRef = inject(ElementRef);
  private readonly agendaService = inject(AgendaService);
  private readonly citasService = inject(CitasService);

  protected readonly buscadorAbierto = signal(false);
  protected readonly busquedaPaciente = signal('');
  protected readonly pacienteSeleccionado = signal<Paciente | null>(null);

  protected readonly pacientesFiltrados = computed(() => {
    const termino = this.busquedaPaciente().trim().toLowerCase();
    const candidatos = this.pacientes();
    if (!termino) {
      return candidatos.slice(0, 60);
    }
    return candidatos
      .filter((paciente) => {
        const enNombres = paciente.nombres.toLowerCase().includes(termino);
        const enApellidos = paciente.apellidos.toLowerCase().includes(termino);
        const enCI = paciente.ci.toLowerCase().includes(termino);
        return enNombres || enApellidos || enCI;
      })
      .slice(0, 60);
  });

  protected readonly oftalmologoId = signal('');
  protected readonly oftalmologoSeleccionado = computed(() => {
    const idTexto = this.oftalmologoId();
    if (!idTexto) {
      return null;
    }
    const id = Number(idTexto);
    return this.oftalmologos().find((oftalmologo) => oftalmologo.id === id) ?? null;
  });

  protected readonly fecha = signal(fechaActualInput());
  protected readonly fechaMinima = fechaActualInput();

  protected readonly consultando = signal(false);
  protected readonly errorConsulta = signal<string | null>(null);
  protected readonly disponibilidad = signal<DisponibilidadCita | null>(null);

  protected readonly opcionesHorarios = computed(() => {
    const disp = this.disponibilidad();
    if (!disp) {
      return [];
    }
    return horariosReservables(disp.intervalos_disponibles);
  });

  protected readonly horarioSeleccionado = signal<IntervaloCita | null>(null);
  protected readonly motivo = signal('');
  protected readonly observaciones = signal('');

  protected readonly guardando = signal(false);
  protected readonly errorRegistro = signal<string | null>(null);
  protected readonly errorLocal = signal<string | null>(null);

  protected readonly puedeConsultar = computed(
    () =>
      !!this.pacienteSeleccionado() &&
      this.oftalmologoId() !== '' &&
      this.fecha() !== '' &&
      !this.consultando() &&
      !this.guardando(),
  );

  protected readonly puedeRegistrar = computed(
    () =>
      this.puedeConsultar() &&
      !!this.horarioSeleccionado(),
  );

  @HostListener('document:click', ['$event'])
  onClicFuera(event: Event): void {
    if (!this.buscadorAbierto()) {
      return;
    }
    const objetivo = event.target as Node;
    if (!this.elementRef.nativeElement.contains(objetivo)) {
      this.buscadorAbierto.set(false);
    }
  }

  alternarBuscadorPaciente(): void {
    this.buscadorAbierto.update((abierto) => !abierto);
    if (this.buscadorAbierto()) {
      this.busquedaPaciente.set('');
    }
  }

  buscarPaciente(event: Event): void {
    this.busquedaPaciente.set((event.target as HTMLInputElement).value);
    this.buscadorAbierto.set(true);
  }

  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado.set(paciente);
    this.busquedaPaciente.set('');
    this.buscadorAbierto.set(false);
    this.errorLocal.set(null);
  }

  cambiarOftalmologo(event: Event): void {
    this.oftalmologoId.set((event.target as HTMLSelectElement).value);
    this.limpiarResultadosConsulta();
  }

  cambiarFecha(event: Event): void {
    this.fecha.set((event.target as HTMLInputElement).value);
    this.limpiarResultadosConsulta();
  }

  consultarDisponibilidad(): void {
    const paciente = this.pacienteSeleccionado();
    const idTexto = this.oftalmologoId();
    const fechaTexto = this.fecha();

    if (!paciente || !idTexto || !fechaTexto) {
      this.errorLocal.set(
        'Debes seleccionar paciente, oftalmólogo y fecha antes de consultar la disponibilidad.',
      );
      return;
    }

    const oftalmologoId = Number(idTexto);

    this.errorLocal.set(null);
    this.errorConsulta.set(null);
    this.disponibilidad.set(null);
    this.horarioSeleccionado.set(null);
    this.consultando.set(true);

    this.agendaService.obtenerDisponibilidad(oftalmologoId, fechaTexto).subscribe({
      next: (disponibilidad) => {
        this.disponibilidad.set(disponibilidad);
        this.consultando.set(false);
      },
      error: (err: unknown) => {
        this.consultando.set(false);
        this.errorConsulta.set(this.extraerError(err, 'No se pudo consultar la disponibilidad.'));
      },
    });
  }

  seleccionarHorario(intervalo: IntervaloCita): void {
    this.horarioSeleccionado.set(intervalo);
    this.errorLocal.set(null);
    this.errorRegistro.set(null);
  }

  quitarHorario(): void {
    this.horarioSeleccionado.set(null);
  }

  escribirMotivo(event: Event): void {
    this.motivo.set((event.target as HTMLTextAreaElement).value);
  }

  escribirObservaciones(event: Event): void {
    this.observaciones.set((event.target as HTMLTextAreaElement).value);
  }

  registrarCita(): void {
    if (this.guardando()) {
      return;
    }

    if (!this.puedeRegistrar()) {
      this.errorLocal.set(
        'Selecciona el paciente, oftalmólogo, fecha y horario, y escribe el motivo de la consulta.',
      );
      return;
    }

    const paciente = this.pacienteSeleccionado()!;
    const oftalmologoId = Number(this.oftalmologoId());
    const horario = this.horarioSeleccionado()!;

    this.errorLocal.set(null);
    this.errorRegistro.set(null);
    this.guardando.set(true);

    this.citasService
      .crearCita({
        paciente_id: paciente.id,
        oftalmologo_id: oftalmologoId,
        fecha: this.fecha(),
        hora_inicio: horario.hora_inicio,
        motivo: this.motivo().trim() || null,
        observaciones: this.observaciones().trim() || null,
      })
      .subscribe({
        next: (citaCreada) => {
          this.guardando.set(false);
          const fechaRegistrada = citaCreada.fecha ?? this.fecha();
          this.reiniciarFormulario();
          this.citaRegistrada.emit({ fecha: fechaRegistrada });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorRegistro.set(this.extraerError(err, 'No se pudo registrar la cita.'));
        },
      });
  }

  limpiarFormulario(): void {
    if (this.consultando() || this.guardando()) {
      return;
    }
    this.reiniciarFormulario();
  }

  formatearHora(hora: string): string {
    return formatearHoraCita(hora);
  }

  formatearFecha(fecha: string): string {
    return formatearFechaCita(fecha);
  }

  private limpiarResultadosConsulta(): void {
    if (this.consultando() || this.guardando()) {
      return;
    }
    this.disponibilidad.set(null);
    this.horarioSeleccionado.set(null);
    this.errorConsulta.set(null);
    this.errorRegistro.set(null);
  }

  private reiniciarFormulario(): void {
    this.buscadorAbierto.set(false);
    this.busquedaPaciente.set('');
    this.pacienteSeleccionado.set(null);
    this.oftalmologoId.set('');
    this.fecha.set(fechaActualInput());
    this.consultando.set(false);
    this.errorConsulta.set(null);
    this.disponibilidad.set(null);
    this.horarioSeleccionado.set(null);
    this.motivo.set('');
    this.observaciones.set('');
    this.guardando.set(false);
    this.errorRegistro.set(null);
    this.errorLocal.set(null);
  }

  private extraerError(err: unknown, mensajeDefault: string): string {
    const detalle = this.leerDetalle(err);
    if (detalle) {
      return detalle;
    }

    switch (this.leerStatus(err)) {
      case 400:
        return 'La solicitud enviada no es válida.';
      case 401:
        return 'Tu sesión ha expirado o no has iniciado sesión.';
      case 403:
        return 'No tienes permisos para gestionar citas médicas.';
      case 404:
        return 'El oftalmólogo o paciente solicitado no fue encontrado.';
      case 409:
        return 'El horario seleccionado ya no está disponible.';
      case 422:
        return 'Algunos datos enviados no son válidos.';
      case 500:
        return 'Ocurrió un error en el servidor.';
      case 0:
        return 'No se pudo conectar con el servidor.';
      default:
        return mensajeDefault;
    }
  }

  private leerDetalle(err: unknown): string | null {
    const errObj = err as { error?: { detail?: unknown } } | null;
    const detalle = errObj?.error?.detail;
    return typeof detalle === 'string' && detalle.trim() ? detalle : null;
  }

  private leerStatus(err: unknown): number {
    const errObj = err as { status?: unknown } | null;
    return typeof errObj?.status === 'number' ? errObj.status : 0;
  }
}
