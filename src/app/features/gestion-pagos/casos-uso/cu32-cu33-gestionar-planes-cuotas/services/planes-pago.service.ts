import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { PagosAdministrativosService } from '../../cu31-registrar-pago-comprobante/services/pagos-administrativos.service';
import {
  CancelarPlanPago,
  ConsultaPaciente,
  ConsultasPacienteResultado,
  CuotaRespuesta,
  FiltrosPlanes,
  IntentosCuotaRespuesta,
  PagoCuotaCrear,
  PagoCuotaRespuesta,
  PlanPagoCrear,
  PlanPagoRespuesta,
  PlanesPagoPagina,
  ServiciosDisponiblesPlanRespuesta,
} from '../models/planes-cuotas.models';

interface ConsultaClinicaApi {
  id: number;
  fecha_consulta?: string | null;
  motivo_consulta?: string | null;
  estado?: boolean | null;
}

/**
 * CU32/CU33 — contratos reales de `/pagos` (planes, cuotas e intentos).
 *
 * No inventa rutas: cada método corresponde a un endpoint publicado por
 * `app/modules/gestion_pagos/api/planes_cuotas.py`. Las rutas de Stripe y
 * `mis-planes` son exclusivas del paciente (Flutter) y no se usan aquí.
 */
@Injectable({ providedIn: 'root' })
export class PlanesPagoService {
  private readonly http = inject(HttpClient);
  private readonly pagosAdministrativos = inject(PagosAdministrativosService);
  private readonly planesUrl = `${environment.apiUrl}/pagos/planes`;
  private readonly cuotasUrl = `${environment.apiUrl}/pagos/cuotas`;
  private readonly consultasUrl = `${environment.apiUrl}/historial-clinico/consultas`;

  listarServiciosDisponibles(
    pacienteId: number,
    consultaClinicaId: number,
  ): Observable<ServiciosDisponiblesPlanRespuesta> {
    const params = new HttpParams()
      .set('paciente_id', pacienteId)
      .set('consulta_clinica_id', consultaClinicaId);
    return this.http.get<ServiciosDisponiblesPlanRespuesta>(
      `${this.planesUrl}/servicios-disponibles`,
      { params },
    );
  }

  crearPlan(datos: PlanPagoCrear, claveIdempotencia: string): Observable<PlanPagoRespuesta> {
    return this.http.post<PlanPagoRespuesta>(this.planesUrl, datos, {
      headers: this.cabeceraIdempotencia(claveIdempotencia),
    });
  }

  listarPlanes(filtros: FiltrosPlanes = {}): Observable<PlanesPagoPagina> {
    let params = new HttpParams()
      .set('page', filtros.page ?? 1)
      .set('page_size', filtros.page_size ?? 20);
    if (filtros.paciente_id) {
      params = params.set('paciente_id', filtros.paciente_id);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<PlanesPagoPagina>(this.planesUrl, { params });
  }

  obtenerPlan(planId: number): Observable<PlanPagoRespuesta> {
    return this.http.get<PlanPagoRespuesta>(`${this.planesUrl}/${planId}`);
  }

  cancelarPlan(planId: number, motivo: string): Observable<PlanPagoRespuesta> {
    const datos: CancelarPlanPago = { motivo: motivo.trim() };
    return this.http.post<PlanPagoRespuesta>(`${this.planesUrl}/${planId}/cancelar`, datos);
  }

  registrarPagoCuota(
    cuotaId: number,
    datos: PagoCuotaCrear,
    claveIdempotencia: string,
  ): Observable<PagoCuotaRespuesta> {
    return this.http.post<PagoCuotaRespuesta>(`${this.cuotasUrl}/${cuotaId}/pagos`, datos, {
      headers: this.cabeceraIdempotencia(claveIdempotencia),
    });
  }

  confirmarPagoCuota(cuotaId: number, pagoId: number): Observable<PagoCuotaRespuesta> {
    return this.http.post<PagoCuotaRespuesta>(
      `${this.cuotasUrl}/${cuotaId}/pagos/${pagoId}/confirmar`,
      null,
    );
  }

  rechazarPagoCuota(
    cuotaId: number,
    pagoId: number,
    motivo: string,
  ): Observable<PagoCuotaRespuesta> {
    return this.http.post<PagoCuotaRespuesta>(
      `${this.cuotasUrl}/${cuotaId}/pagos/${pagoId}/rechazar`,
      { motivo: motivo.trim() },
    );
  }

  listarIntentosCuota(cuotaId: number): Observable<IntentosCuotaRespuesta> {
    return this.http.get<IntentosCuotaRespuesta>(`${this.cuotasUrl}/${cuotaId}/intentos`);
  }

  /** Cuota del plan recién refrescado (evita otra petición si ya viene en el plan). */
  buscarCuota(plan: PlanPagoRespuesta, cuotaId: number): CuotaRespuesta | null {
    return plan.cuotas.find((cuota) => cuota.id === cuotaId) ?? null;
  }

  /**
   * Consultas del paciente. Se usa el listado clínico real; si el usuario no
   * tiene lectura del historial (403/404) se derivan las consultas con
   * servicios impagos usando la API de pagos, que sí está en su alcance.
   */
  listarConsultasPaciente(pacienteId: number): Observable<ConsultasPacienteResultado> {
    const params = new HttpParams().set('paciente_id', pacienteId);
    return this.http.get<ConsultaClinicaApi[]>(this.consultasUrl, { params }).pipe(
      map((consultas) => ({
        consultas: (consultas ?? []).map<ConsultaPaciente>((consulta) => ({
          id: consulta.id,
          fecha: consulta.fecha_consulta ?? null,
          motivo: consulta.motivo_consulta ?? null,
          activa: consulta.estado !== false,
        })),
        origen: 'historial' as const,
      })),
      catchError((error: { status?: number }) => {
        if (error?.status !== 403 && error?.status !== 404) {
          return throwError(() => error);
        }
        return this.pagosAdministrativos.listarServiciosPendientes(pacienteId).pipe(
          map((resumen) => {
            const ids = new Set<number>();
            for (const servicio of resumen.servicios ?? []) {
              if (servicio.consulta_clinica_id) {
                ids.add(servicio.consulta_clinica_id);
              }
            }
            return {
              consultas: [...ids].map<ConsultaPaciente>((id) => ({
                id,
                fecha: null,
                motivo: null,
                activa: true,
              })),
              origen: 'pagos' as const,
            };
          }),
        );
      }),
    );
  }

  private cabeceraIdempotencia(clave: string): HttpHeaders {
    return new HttpHeaders({ 'Idempotency-Key': clave });
  }
}
