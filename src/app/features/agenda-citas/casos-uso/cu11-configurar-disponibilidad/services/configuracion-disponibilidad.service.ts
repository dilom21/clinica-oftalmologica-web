import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  BloqueoHorario,
  BloqueoHorarioGuardar,
  ConfiguracionDisponibilidad,
  HorarioOftalmologo,
  HorarioOftalmologoGuardar,
  OftalmologoConfiguracion,
} from '../models/configuracion-disponibilidad.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionDisponibilidadService {
  private readonly baseUrl = `${environment.apiUrl}/agenda-citas/configuracion`;

  constructor(private readonly http: HttpClient) {}

  listarOftalmologosConfigurables(): Observable<OftalmologoConfiguracion[]> {
    return this.http.get<OftalmologoConfiguracion[]>(
      `${this.baseUrl}/oftalmologos`,
    );
  }

  obtenerConfiguracion(
    oftalmologoId: number,
  ): Observable<ConfiguracionDisponibilidad> {
    return this.http.get<ConfiguracionDisponibilidad>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}`,
    );
  }

  crearHorario(
    oftalmologoId: number,
    datos: HorarioOftalmologoGuardar,
  ): Observable<HorarioOftalmologo> {
    return this.http.post<HorarioOftalmologo>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}/horarios`,
      datos,
    );
  }

  actualizarHorario(
    oftalmologoId: number,
    horarioId: number,
    datos: HorarioOftalmologoGuardar,
  ): Observable<HorarioOftalmologo> {
    return this.http.put<HorarioOftalmologo>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}/horarios/${horarioId}`,
      datos,
    );
  }

  cambiarEstadoHorario(
    oftalmologoId: number,
    horarioId: number,
    estado: boolean,
  ): Observable<HorarioOftalmologo> {
    return this.http.patch<HorarioOftalmologo>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}/horarios/${horarioId}/estado`,
      { estado },
    );
  }

  crearBloqueo(
    oftalmologoId: number,
    datos: BloqueoHorarioGuardar,
  ): Observable<BloqueoHorario> {
    return this.http.post<BloqueoHorario>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}/bloqueos`,
      datos,
    );
  }

  actualizarBloqueo(
    oftalmologoId: number,
    bloqueoId: number,
    datos: BloqueoHorarioGuardar,
  ): Observable<BloqueoHorario> {
    return this.http.put<BloqueoHorario>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}/bloqueos/${bloqueoId}`,
      datos,
    );
  }

  cambiarEstadoBloqueo(
    oftalmologoId: number,
    bloqueoId: number,
    estado: boolean,
  ): Observable<BloqueoHorario> {
    return this.http.patch<BloqueoHorario>(
      `${this.baseUrl}/oftalmologos/${oftalmologoId}/bloqueos/${bloqueoId}/estado`,
      { estado },
    );
  }
}
