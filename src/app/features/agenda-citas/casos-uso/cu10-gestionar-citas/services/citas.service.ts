import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, from, map, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CitaActualizar,
  CitaCrear,
  CitaMedica,
  FiltrosCitas,
} from '../models/citas.models';

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly citasUrl = `${environment.apiUrl}/agenda-citas/citas`;

  constructor(private readonly http: HttpClient) {}

  /** GET /agenda-citas/citas con filtros opcionales (fecha, paciente, oftalmólogo, estado). */
  listarCitas(filtros: FiltrosCitas = {}): Observable<CitaMedica[]> {
    let params = new HttpParams();
    if (filtros.fecha) {
      params = params.set('fecha', filtros.fecha);
    }
    if (filtros.paciente_id) {
      params = params.set('paciente_id', String(filtros.paciente_id));
    }
    if (filtros.oftalmologo_id) {
      params = params.set('oftalmologo_id', String(filtros.oftalmologo_id));
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<CitaMedica[]>(this.citasUrl, { params });
  }

  /** GET /agenda-citas/citas/{cita_id} */
  obtenerCita(citaId: number): Observable<CitaMedica> {
    return this.http.get<CitaMedica>(`${this.citasUrl}/${citaId}`);
  }

  /** POST /agenda-citas/citas (el estado inicial lo define el backend: PROGRAMADA). */
  crearCita(datos: CitaCrear): Observable<CitaMedica> {
    return this.http.post<CitaMedica>(this.citasUrl, datos);
  }

  /** PUT /agenda-citas/citas/{cita_id} (reprogramar fecha/hora). */
  reprogramarCita(citaId: number, datos: CitaActualizar): Observable<CitaMedica> {
    return this.http.put<CitaMedica>(`${this.citasUrl}/${citaId}`, datos);
  }

  /** PATCH /agenda-citas/citas/{cita_id}/estado */
  cambiarEstadoCita(citaId: number, estado: string): Observable<CitaMedica> {
    return this.http.patch<CitaMedica>(`${this.citasUrl}/${citaId}/estado`, { estado });
  }

  /**
   * CU37: GET /agenda-citas/citas/{cita_id}/constancia (PDF, solo citas ATENDIDA).
   * El backend no expone Content-Disposition por CORS, así que el nombre del
   * archivo se arma aquí. Con responseType blob el cuerpo del error también
   * llega como Blob; se convierte a JSON para conservar `error.detail`.
   */
  descargarConstancia(citaId: number): Observable<{ blob: Blob; nombre: string }> {
    return this.http
      .get(`${this.citasUrl}/${citaId}/constancia`, { responseType: 'blob' })
      .pipe(
        map((blob) => ({ blob, nombre: `constancia-cita-${citaId}.pdf` })),
        catchError((err: unknown) => this.errorDesdeBlob(err)),
      );
  }

  private errorDesdeBlob(err: unknown): Observable<never> {
    if (!(err instanceof HttpErrorResponse) || !(err.error instanceof Blob)) {
      return throwError(() => err);
    }
    return from(err.error.text()).pipe(
      map((texto) => {
        try {
          return JSON.parse(texto) as unknown;
        } catch {
          return null;
        }
      }),
      switchMap((cuerpo) =>
        throwError(
          () =>
            new HttpErrorResponse({
              error: cuerpo,
              headers: err.headers,
              status: err.status,
              statusText: err.statusText,
              url: err.url ?? undefined,
            }),
        ),
      ),
    );
  }
}
