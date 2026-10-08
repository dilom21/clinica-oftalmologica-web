import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  IndicacionCrear,
  IndicacionRespuesta,
  RecetaCrear,
  RecetaRespuesta,
  TratamientoCrear,
  TratamientoRespuesta,
} from '../models/tratamientos-recetas.models';

/**
 * Servicio HTTP de CU17.
 *
 * Centraliza el acceso a tratamientos, indicaciones y recetas de una consulta
 * clínica existente. El `consulta_id` siempre viaja en la URL; el body solo
 * contiene los campos que el backend acepta.
 */
@Injectable({ providedIn: 'root' })
export class TratamientosRecetasService {
  private readonly consultasBaseUrl = `${environment.apiUrl}/historial-clinico/consultas`;
  private readonly recetasBaseUrl = `${environment.apiUrl}/historial-clinico/recetas`;

  constructor(private readonly http: HttpClient) {}

  // --- Tratamientos -------------------------------------------------------

  listarTratamientos(consultaId: number): Observable<TratamientoRespuesta[]> {
    return this.http.get<TratamientoRespuesta[]>(
      `${this.consultasBaseUrl}/${consultaId}/tratamientos`,
    );
  }

  registrarTratamiento(
    consultaId: number,
    datos: TratamientoCrear,
  ): Observable<TratamientoRespuesta> {
    return this.http.post<TratamientoRespuesta>(
      `${this.consultasBaseUrl}/${consultaId}/tratamientos`,
      datos,
    );
  }

  // --- Indicaciones -------------------------------------------------------

  listarIndicaciones(consultaId: number): Observable<IndicacionRespuesta[]> {
    return this.http.get<IndicacionRespuesta[]>(
      `${this.consultasBaseUrl}/${consultaId}/indicaciones`,
    );
  }

  registrarIndicacion(
    consultaId: number,
    datos: IndicacionCrear,
  ): Observable<IndicacionRespuesta> {
    return this.http.post<IndicacionRespuesta>(
      `${this.consultasBaseUrl}/${consultaId}/indicaciones`,
      datos,
    );
  }

  // --- Recetas ------------------------------------------------------------

  listarRecetas(consultaId: number): Observable<RecetaRespuesta[]> {
    return this.http.get<RecetaRespuesta[]>(
      `${this.consultasBaseUrl}/${consultaId}/recetas`,
    );
  }

  registrarReceta(consultaId: number, datos: RecetaCrear): Observable<RecetaRespuesta> {
    return this.http.post<RecetaRespuesta>(
      `${this.consultasBaseUrl}/${consultaId}/recetas`,
      datos,
    );
  }

  obtenerReceta(recetaId: number): Observable<RecetaRespuesta> {
    return this.http.get<RecetaRespuesta>(`${this.recetasBaseUrl}/${recetaId}`);
  }
}
