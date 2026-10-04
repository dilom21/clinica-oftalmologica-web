import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ServicioRealizado, ServicioRealizadoGuardar,
  ServiciosRealizadosFiltros, ServiciosRealizadosPagina, ServiciosRealizadosLoteGuardar,
} from '../models/servicios-realizados.models';

@Injectable({ providedIn: 'root' })
export class ServiciosRealizadosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/historial-clinico/servicios-realizados`;

  listar(filtros: ServiciosRealizadosFiltros = {}): Observable<ServiciosRealizadosPagina> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<ServiciosRealizadosPagina>(this.url, { params });
  }

  consultar(id: number): Observable<ServicioRealizado> {
    return this.http.get<ServicioRealizado>(`${this.url}/${id}`);
  }

  registrar(datos: ServicioRealizadoGuardar): Observable<ServicioRealizado> {
    return this.http.post<ServicioRealizado>(this.url, this.cuerpo(datos));
  }

  registrarLote(datos: ServiciosRealizadosLoteGuardar): Observable<ServicioRealizado[]> {
    return this.http.post<ServicioRealizado[]>(`${this.url}/lote`, {
      paciente_id: datos.paciente_id,
      consulta_clinica_id: datos.consulta_clinica_id,
      fecha_realizacion: datos.fecha_realizacion,
      servicios: datos.servicios.map(linea => ({
        servicio_id: linea.servicio_id,
        precio_aplicado: linea.precio_aplicado,
        observaciones: linea.observaciones,
      })),
    });
  }

  actualizar(id: number, datos: ServicioRealizadoGuardar): Observable<ServicioRealizado> {
    return this.http.put<ServicioRealizado>(`${this.url}/${id}`, this.cuerpo(datos));
  }

  anular(id: number): Observable<ServicioRealizado> {
    return this.http.delete<ServicioRealizado>(`${this.url}/${id}`);
  }

  private cuerpo(datos: ServicioRealizadoGuardar): ServicioRealizadoGuardar {
    return {
      servicio_id: datos.servicio_id,
      precio_aplicado: datos.precio_aplicado,
      paciente_id: datos.paciente_id,
      consulta_clinica_id: datos.consulta_clinica_id,
      fecha_realizacion: datos.fecha_realizacion,
      observaciones: datos.observaciones,
    };
  }
}
