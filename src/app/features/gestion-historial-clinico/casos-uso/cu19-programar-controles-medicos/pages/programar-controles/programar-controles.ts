import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Sidebar } from '../../../../../../core/layouts/sidebar/sidebar';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import { mensajeErrorHttp } from '../../../../../agenda-citas/casos-uso/cu11-configurar-disponibilidad/utils/errores';
import { Paciente } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import { SeguimientoControles } from '../../components/seguimiento-controles/seguimiento-controles';

@Component({
  selector: 'app-programar-controles',
  imports: [Sidebar, SeguimientoControles],
  templateUrl: './programar-controles.html',
  styleUrls: [
    '../../../cu13-consultar-historial-clinico/pages/consultar-historial-clinico/consultar-historial-clinico.css',
    './programar-controles.css',
  ],
})
export class ProgramarControles implements OnInit, OnDestroy {
  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly pacienteId = signal<number | null>(null);
  protected readonly consultaInicialId = signal<number | null>(null);
  protected readonly buscarTermino = signal('');
  protected readonly cargandoPacientes = signal(true);
  protected readonly errorPacientes = signal<string | null>(null);
  protected readonly errorContexto = signal<string | null>(null);
  protected readonly pacienteSeleccionado = computed(() => this.pacientes().find((paciente) => paciente.id === this.pacienteId()) ?? null);
  protected readonly pacientesFiltrados = computed(() => {
    const termino = this.buscarTermino().trim().toLowerCase();
    return this.pacientes().filter((paciente) => paciente.id === this.pacienteId() ||
      `${paciente.nombres} ${paciente.apellidos} ${paciente.ci}`.toLowerCase().includes(termino));
  });

  private readonly pacientesService = inject(PacientesService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.cargarPacientes();
    this.subscriptions.add(this.route.queryParamMap.subscribe(() => this.aplicarContexto()));
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  protected cargarPacientes(): void {
    this.cargandoPacientes.set(true);
    this.errorPacientes.set(null);
    this.subscriptions.add(this.pacientesService.listarPacientes().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.cargandoPacientes.set(false);
        this.aplicarContexto();
      },
      error: (error: unknown) => {
        this.cargandoPacientes.set(false);
        this.errorPacientes.set(mensajeErrorHttp(error, {
          mensaje403: 'No tienes permisos para consultar los pacientes.',
          mensaje404: 'No se encontró el paciente solicitado.',
        }));
      },
    }));
  }

  private aplicarContexto(): void {
    if (this.cargandoPacientes() || this.errorPacientes()) return;
    const params = this.route.snapshot.queryParamMap;
    const idTexto = params.get('paciente_id');
    const consultaTexto = params.get('consulta_id');
    const id = Number(idTexto);
    const consultaId = Number(consultaTexto);
    const pacienteValido = !!idTexto && Number.isInteger(id) && id > 0 && this.pacientes().some((paciente) => paciente.id === id);
    this.errorContexto.set(idTexto && !pacienteValido ? 'No se encontró el paciente indicado en esta atención.' : null);
    this.pacienteId.set(pacienteValido ? id : null);
    this.consultaInicialId.set(pacienteValido && Number.isInteger(consultaId) && consultaId > 0 ? consultaId : null);
  }

  protected seleccionarPaciente(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    this.pacienteId.set(id || null);
    this.consultaInicialId.set(null);
    this.errorContexto.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { paciente_id: id || null, consulta_id: null },
      replaceUrl: true,
    });
  }

  protected buscar(event: Event): void { this.buscarTermino.set((event.target as HTMLInputElement).value); }
  protected alternarSidebar(): void { this.sidebarMovilAbierto.update((abierto) => !abierto); }
  protected cerrarSidebar(): void { this.sidebarMovilAbierto.set(false); }
  protected cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
