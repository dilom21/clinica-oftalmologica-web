import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ExamenConResultadosRespuesta,
  ExamenOftalmologicoCrear,
  ExamenOftalmologicoRespuesta,
  ResultadoExamenCrear,
  ResultadoExamenRespuesta,
} from '../models/examenes.models';

/**
 * Servicio HTTP de CU18.
 *
 * Centraliza exámenes oftalmológicos y sus resultados. El `consulta_id` y el
 * `examen_id` viajan siempre en la URL; el body solo lleva los campos que el
 * backend acepta.
 */
@Injectable({ providedIn: 'root' })
export class ExamenesService {
  private readonly consultasBaseUrl = `${environment.apiUrl}/historial-clinico/consultas`;
  private readonly examenesBaseUrl = `${environment.apiUrl}/historial-clinico/examenes`;

  constructor(private readonly http: HttpClient) {}

  // --- Exámenes -----------------------------------------------------------

  listarExamenes(consultaId: number): Observable<ExamenOftalmologicoRespuesta[]> {
    return this.http.get<ExamenOftalmologicoRespuesta[]>(
      `${this.consultasBaseUrl}/${consultaId}/examenes`,
    );
  }

  registrarExamen(
    consultaId: number,
    datos: ExamenOftalmologicoCrear,
  ): Observable<ExamenOftalmologicoRespuesta> {
    return this.http.post<ExamenOftalmologicoRespuesta>(
      `${this.consultasBaseUrl}/${consultaId}/examenes`,
      datos,
    );
  }

  obtenerExamen(examenId: number): Observable<ExamenConResultadosRespuesta> {
    return this.http.get<ExamenConResultadosRespuesta>(
      `${this.examenesBaseUrl}/${examenId}`,
    );
  }

  // --- Resultados ---------------------------------------------------------

  listarResultados(examenId: number): Observable<ResultadoExamenRespuesta[]> {
    return this.http.get<ResultadoExamenRespuesta[]>(
      `${this.examenesBaseUrl}/${examenId}/resultados`,
    );
  }

  registrarResultado(
    examenId: number,
    datos: ResultadoExamenCrear,
  ): Observable<ResultadoExamenRespuesta> {
    return this.http.post<ResultadoExamenRespuesta>(
      `${this.examenesBaseUrl}/${examenId}/resultados`,
      datos,
    );
  }
}
