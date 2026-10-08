import { Component, computed, input, output } from '@angular/core';
import { ConsultaClinicaRespuesta } from '../../../cu15-registrar-consulta-clinica/models/consulta-clinica.models';
import { DiagnosticoRespuesta } from '../../../cu16-registrar-diagnostico/models/diagnostico.models';
import { PacienteHistorial } from '../../../cu13-consultar-historial-clinico/models/historial-clinico.models';
import { DiagnosticoChip } from '../../../cu13-consultar-historial-clinico/components/diagnostico-chip/diagnostico-chip';
import { formatearFechaHora } from '../../models/tratamientos-recetas.models';

/**
 * Resumen premium de la consulta clínica seleccionada.
 *
 * CU17 necesita contexto clínico (paciente, fecha, oftalmólogo, motivo, cita y
 * diagnósticos) pero no debe duplicar la vista completa de CU15/CU16: aquí se
 * muestra de forma compacta y los diagnósticos solo como chips de referencia.
 */
@Component({
  selector: 'app-contexto-consulta',
  imports: [DiagnosticoChip],
  templateUrl: './contexto-consulta.html',
  styleUrl: './contexto-consulta.css',
})
export class ContextoConsulta {
  readonly paciente = input.required<PacienteHistorial | null>();
  readonly consulta = input.required<ConsultaClinicaRespuesta | null>();
  readonly diagnosticos = input<DiagnosticoRespuesta[]>([]);
  readonly cargandoDiagnosticos = input(false);
  readonly errorDiagnosticos = input<string | null>(null);

  readonly reintentarDiagnosticos = output<void>();

  protected readonly iniciales = computed(() => {
    const paciente = this.paciente();
    if (!paciente) {
      return '—';
    }
    return `${paciente.nombres.charAt(0)}${paciente.apellidos.charAt(0)}`.toUpperCase();
  });

  protected readonly nombreOftalmologo = computed(() => {
    const oftalmologo = this.consulta()?.oftalmologo;
    if (!oftalmologo) {
      return 'Oftalmólogo no asignado';
    }
    return (
      `${oftalmologo.nombres} ${oftalmologo.apellidos}`.trim() ||
      'Oftalmólogo no asignado'
    );
  });

  protected readonly fechaConsulta = computed(() =>
    formatearFechaHora(this.consulta()?.fecha_consulta),
  );
}
