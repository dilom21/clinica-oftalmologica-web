import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Paciente, PacienteActualizar, PacienteCrear } from '../models/pacientes.models';
import { AntecedenteClinico } from '../models/antecedentes.models';
@Injectable({ providedIn: 'root' })
export class PacientesService {
  private readonly pacientesUrl = `${environment.apiUrl}/pacientes`;

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
// =========================================================
  // CU14 - GESTIONAR ANTECEDENTES CLÍNICOS
  // =========================================================

  listarAntecedentesPorHistorial(historialClinicoId: number): Observable<AntecedenteClinico[]> {
    return this.http.get<AntecedenteClinico[]>(`${this.pacientesUrl}/historial/${historialClinicoId}/antecedentes`);
  }

  crearAntecedente(datos: AntecedenteClinico): Observable<AntecedenteClinico> {
    return this.http.post<AntecedenteClinico>(`${this.pacientesUrl}/antecedentes`, datos);
  }

  actualizarAntecedente(antecedenteId: number, datos: Partial<AntecedenteClinico>): Observable<AntecedenteClinico> {
    return this.http.put<AntecedenteClinico>(`${this.pacientesUrl}/antecedentes/${antecedenteId}`, datos);
  }
}

