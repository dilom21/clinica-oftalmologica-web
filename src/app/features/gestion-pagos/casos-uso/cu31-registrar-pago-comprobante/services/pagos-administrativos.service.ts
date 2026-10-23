import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import {
  FiltrosPagos,
  NotificacionPago,
  PagoAdministrativo,
  PagoAdministrativoCrear,
  PagosAdministrativosPagina,
  ResumenServiciosPendientes,
} from '../models/pagos-administrativos.models';

/**
 * Acceso HTTP a los endpoints administrativos del CU31.
 *
 * El JWT y el contexto de la clínica los resuelve el backend a partir de la
 * sesión (`authInterceptor` + resolución multitenant del servidor); esta capa
 * nunca envía identificadores de empresa ni de tenant.
 */
@Injectable({ providedIn: 'root' })
export class PagosAdministrativosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pagos/administrativos`;

  listarServiciosPendientes(
    pacienteId: number,
    consultaClinicaId?: number | null,
  ): Observable<ResumenServiciosPendientes> {
    let params = new HttpParams().set('paciente_id', pacienteId);
    if (consultaClinicaId) {
      params = params.set('consulta_clinica_id', consultaClinicaId);
    }
    return this.http.get<ResumenServiciosPendientes>(
      `${this.baseUrl}/servicios-pendientes`,
      { params },
    );
  }

  registrarPago(
    datos: PagoAdministrativoCrear,
    claveIdempotencia: string,
  ): Observable<PagoAdministrativo> {
    const headers = new HttpHeaders({ 'Idempotency-Key': claveIdempotencia });
    return this.http.post<PagoAdministrativo>(this.baseUrl, datos, { headers });
  }

  listarPagos(filtros: FiltrosPagos = {}): Observable<PagosAdministrativosPagina> {
    let params = new HttpParams()
      .set('page', filtros.page ?? 1)
      .set('page_size', filtros.page_size ?? 20);

    if (filtros.paciente_id) {
      params = params.set('paciente_id', filtros.paciente_id);
    }
    if (filtros.metodo_pago) {
      params = params.set('metodo_pago', filtros.metodo_pago);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }

    return this.http.get<PagosAdministrativosPagina>(this.baseUrl, { params });
  }

  obtenerPago(pagoId: number): Observable<PagoAdministrativo> {
    return this.http.get<PagoAdministrativo>(`${this.baseUrl}/${pagoId}`);
  }

  confirmarPago(pagoId: number): Observable<PagoAdministrativo> {
    return this.http.post<PagoAdministrativo>(
      `${this.baseUrl}/${pagoId}/confirmar`,
      {},
    );
  }

  /** Respuesta binaria auténtica del backend (`application/pdf`). */
  descargarComprobante(pagoId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/${pagoId}/comprobante`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  consultarNotificacion(pagoId: number): Observable<NotificacionPago> {
    return this.http.get<NotificacionPago>(
      `${this.baseUrl}/${pagoId}/notificacion`,
    );
  }

  reintentarNotificacion(pagoId: number): Observable<NotificacionPago> {
    return this.http.post<NotificacionPago>(
      `${this.baseUrl}/${pagoId}/notificacion/reintentar`,
      {},
    );
  }
}
