import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import {
  AnularPagoSolicitud,
  AtribuirReembolsoHuerfanoSolicitud,
  ConciliarAjusteSolicitud,
  CorregirPagoSolicitud,
  HistorialAjustes,
  PagoAjuste,
  ReembolsarPagoSolicitud,
  ReembolsoHuerfano,
} from '../models/ajustes-pagos.models';

/**
 * Acceso HTTP a los endpoints administrativos del CU36 (libro de ajustes,
 * conciliaciones y reembolsos huérfanos).
 *
 * Igual que CU31, el JWT y el contexto de la clínica los resuelve el backend a
 * partir de la sesión; esta capa nunca envía identificadores de empresa ni de
 * tenant. No se capturan errores aquí: las páginas traducen el
 * `HttpErrorResponse` con `mensajeErrorAjuste`.
 */
@Injectable({ providedIn: 'root' })
export class AjustesPagosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pagos/administrativos`;

  consultarHistorialAjustes(pagoId: number): Observable<HistorialAjustes> {
    return this.http.get<HistorialAjustes>(`${this.baseUrl}/${pagoId}/ajustes`);
  }

  consultarAjuste(ajusteId: number): Observable<PagoAjuste> {
    return this.http.get<PagoAjuste>(`${this.baseUrl}/ajustes/${ajusteId}`);
  }

  /**
   * La conciliación es idempotente por estado del ajuste: el backend no exige
   * `Idempotency-Key`, por eso se envía el cuerpo sin cabeceras propias.
   */
  conciliarAjuste(
    ajusteId: number,
    datos: ConciliarAjusteSolicitud,
  ): Observable<PagoAjuste> {
    return this.http.post<PagoAjuste>(
      `${this.baseUrl}/ajustes/${ajusteId}/conciliar`,
      datos,
    );
  }

  listarReembolsosHuerfanos(): Observable<ReembolsoHuerfano[]> {
    return this.http.get<ReembolsoHuerfano[]>(`${this.baseUrl}/reembolsos-huerfanos`);
  }

  /** La atribución también es idempotente por estado: sin `Idempotency-Key`. */
  atribuirReembolsoHuerfano(
    huerfanoId: number,
    datos: AtribuirReembolsoHuerfanoSolicitud,
  ): Observable<PagoAjuste> {
    return this.http.post<PagoAjuste>(
      `${this.baseUrl}/reembolsos-huerfanos/${huerfanoId}/atribuir`,
      datos,
    );
  }

  anularPago(
    pagoId: number,
    datos: AnularPagoSolicitud,
    claveIdempotencia: string,
  ): Observable<PagoAjuste> {
    const headers = new HttpHeaders({ 'Idempotency-Key': claveIdempotencia });
    return this.http.post<PagoAjuste>(`${this.baseUrl}/${pagoId}/anular`, datos, {
      headers,
    });
  }

  corregirPago(
    pagoId: number,
    datos: CorregirPagoSolicitud,
    claveIdempotencia: string,
  ): Observable<PagoAjuste> {
    const headers = new HttpHeaders({ 'Idempotency-Key': claveIdempotencia });
    return this.http.post<PagoAjuste>(`${this.baseUrl}/${pagoId}/corregir`, datos, {
      headers,
    });
  }

  reembolsarPago(
    pagoId: number,
    datos: ReembolsarPagoSolicitud,
    claveIdempotencia: string,
  ): Observable<PagoAjuste> {
    const headers = new HttpHeaders({ 'Idempotency-Key': claveIdempotencia });
    return this.http.post<PagoAjuste>(`${this.baseUrl}/${pagoId}/reembolsos`, datos, {
      headers,
    });
  }
}
