import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AntecedenteClinico } from '../models/antecedentes.models';
import { Paciente, PacienteActualizar, PacienteCrear } from '../models/pacientes.models';

@Injectable({ providedIn: 'root' })
export class PacientesService {
  private readonly pacientesUrl = `${environment.apiUrl}/pacientes`;
  private readonly historialClinicoUrl = `${environment.apiUrl}/historial-clinico`;

  constructor(private readonly http: HttpClient) {}

  listarPacientes(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.pacientesUrl);
  }

  obtenerPaciente(pacienteId: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.pacientesUrl}/${pacienteId}`);
  }

  crearPaciente(datos: PacienteCrear): Observable<Paciente> {
    return this.http.post<Paciente>(this.pacientesUrl, datos);
  }

  actualizarPaciente(pacienteId: number, datos: PacienteActualizar): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.pacientesUrl}/${pacienteId}`, datos);
  }

  listarAntecedentesPorHistorial(
    historialClinicoId: number,
  ): Observable<AntecedenteClinico[]> {
    return this.http.get<AntecedenteClinico[]>(
      `${this.pacientesUrl}/historial/${historialClinicoId}/antecedentes`,
    );
  }

  crearAntecedente(
    datos: Partial<AntecedenteClinico>,
  ): Observable<AntecedenteClinico> {
    return this.http.post<AntecedenteClinico>(
      `${this.pacientesUrl}/antecedentes`,
      datos,
    );
  }

  actualizarAntecedente(
    antecedenteId: number,
    datos: Partial<AntecedenteClinico>,
  ): Observable<AntecedenteClinico> {
    return this.http.put<AntecedenteClinico>(
      `${this.pacientesUrl}/antecedentes/${antecedenteId}`,
      datos,
    );
  }
}