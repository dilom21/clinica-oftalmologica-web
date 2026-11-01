import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import { PagoCuotaCrear, PlanPagoCrear } from '../models/planes-cuotas.models';
import { PlanesPagoService } from './planes-pago.service';

const PLANES = `${environment.apiUrl}/pagos/planes`;
const CUOTAS = `${environment.apiUrl}/pagos/cuotas`;
const CONSULTAS = `${environment.apiUrl}/historial-clinico/consultas`;

describe('CU32/CU33 — contratos HTTP de planes y cuotas', () => {
  let servicio: PlanesPagoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PlanesPagoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta los servicios financiables de una consulta', () => {
    servicio.listarServiciosDisponibles(7, 142).subscribe();

    const peticion = http.expectOne(
      `${PLANES}/servicios-disponibles?paciente_id=7&consulta_clinica_id=142`,
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush({
      paciente_id: 7,
      consulta_clinica_id: 142,
      servicios: [],
      total_disponible: '0.00',
    });
  });

  it('crea el plan con la clave de idempotencia exigida por el backend', () => {
    const datos: PlanPagoCrear = {
      paciente_id: 7,
      consulta_clinica_id: 142,
      servicio_realizado_ids: [11, 12],
      cuotas: [
        { numero_cuota: 1, monto_programado: '50.00', fecha_vencimiento: '2026-11-15' },
        { numero_cuota: 2, monto_programado: '50.00', fecha_vencimiento: '2026-12-15' },
      ],
      observaciones: null,
    };

    servicio.crearPlan(datos, 'plan-abcdef12').subscribe();

    const peticion = http.expectOne(PLANES);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.get('Idempotency-Key')).toBe('plan-abcdef12');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ id: 9 });
  });

  it('envía la paginación del listado y omite los filtros vacíos', () => {
    servicio.listarPlanes({ page: 2, page_size: 10 }).subscribe();

    const peticion = http.expectOne((req) => req.url === PLANES);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('page')).toBe('2');
    expect(peticion.request.params.get('page_size')).toBe('10');
    expect(peticion.request.params.has('paciente_id')).toBe(false);
    expect(peticion.request.params.has('estado')).toBe(false);
    peticion.flush({ items: [], total: 0, page: 2, page_size: 10, total_pages: 0 });
  });

  it('usa la paginación por defecto y aplica los filtros del listado', () => {
    servicio.listarPlanes({ paciente_id: 7, estado: 'ACTIVO' }).subscribe();

    const peticion = http.expectOne((req) => req.url === PLANES);
    expect(peticion.request.params.get('page')).toBe('1');
    expect(peticion.request.params.get('page_size')).toBe('20');
    expect(peticion.request.params.get('paciente_id')).toBe('7');
    expect(peticion.request.params.get('estado')).toBe('ACTIVO');
    peticion.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
  });

  it('abre el plan y cancela con el motivo recortado', () => {
    servicio.obtenerPlan(9).subscribe();
    const detalle = http.expectOne(`${PLANES}/9`);
    expect(detalle.request.method).toBe('GET');
    detalle.flush({ id: 9, cuotas: [], servicios: [] });

    servicio.cancelarPlan(9, '  Paciente desistió  ').subscribe();
    const cancelacion = http.expectOne(`${PLANES}/9/cancelar`);
    expect(cancelacion.request.method).toBe('POST');
    expect(cancelacion.request.body).toEqual({ motivo: 'Paciente desistió' });
    cancelacion.flush({ id: 9, estado: 'CANCELADO' });
  });

  it('registra el cobro de una cuota con su propia clave de idempotencia', () => {
    const datos: PagoCuotaCrear = {
      metodo_pago: 'TRANSFERENCIA',
      referencia_bancaria: 'TRX-9901',
      observaciones: null,
    };

    servicio.registrarPagoCuota(31, datos, 'cuota-abcdef12').subscribe();

    const peticion = http.expectOne(`${CUOTAS}/31/pagos`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.get('Idempotency-Key')).toBe('cuota-abcdef12');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({ pago_id: 88, cuota_id: 31 });
  });

  it('confirma y rechaza intentos por el endpoint de la cuota', () => {
    servicio.confirmarPagoCuota(31, 88).subscribe();
    const confirmacion = http.expectOne(`${CUOTAS}/31/pagos/88/confirmar`);
    expect(confirmacion.request.method).toBe('POST');
    expect(confirmacion.request.body).toBeNull();
    confirmacion.flush({ pago_id: 88, cuota_id: 31, estado_cuota: 'PAGADA' });

    servicio.rechazarPagoCuota(31, 89, '  Comprobante ilegible ').subscribe();
    const rechazo = http.expectOne(`${CUOTAS}/31/pagos/89/rechazar`);
    expect(rechazo.request.method).toBe('POST');
    expect(rechazo.request.body).toEqual({ motivo: 'Comprobante ilegible' });
    rechazo.flush({ pago_id: 89, cuota_id: 31, estado_cuota: 'PENDIENTE' });
  });

  it('consulta los intentos registrados de una cuota', () => {
    servicio.listarIntentosCuota(31).subscribe();

    const peticion = http.expectOne(`${CUOTAS}/31/intentos`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ cuota_id: 31, estado_cuota: 'PENDIENTE', intentos: [] });
  });

  it('encuentra la cuota dentro del plan ya cargado', () => {
    const plan = {
      id: 9,
      paciente_id: 7,
      consulta_clinica_id: 142,
      monto_total: '100.00',
      moneda: 'BOB',
      cantidad_cuotas: 2,
      fecha_creacion: '2026-10-01T12:00:00.000Z',
      estado: 'ACTIVO' as const,
      observaciones: null,
      creado_por: 4,
      saldo_pendiente: '100.00',
      monto_pagado: '0.00',
      servicios: [],
      cuotas: [
        {
          id: 31,
          numero_cuota: 1,
          monto_programado: '50.00',
          fecha_vencimiento: '2026-11-15',
          estado: 'PENDIENTE' as const,
          pagos: [],
        },
      ],
    };

    expect(servicio.buscarCuota(plan, 31)?.id).toBe(31);
    expect(servicio.buscarCuota(plan, 99)).toBeNull();
  });

  it('lista las consultas del paciente desde el historial clínico', () => {
    let resultado: { origen: string; consultas: unknown[] } | null = null;
    servicio.listarConsultasPaciente(7).subscribe((respuesta) => (resultado = respuesta));

    const peticion = http.expectOne(`${CONSULTAS}?paciente_id=7`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([
      { id: 142, fecha_consulta: '2026-10-01', motivo_consulta: 'Control', estado: true },
      { id: 143, fecha_consulta: null, motivo_consulta: null, estado: null },
    ]);

    expect(resultado!.origen).toBe('historial');
    expect(resultado!.consultas).toEqual([
      { id: 142, fecha: '2026-10-01', motivo: 'Control', activa: true },
      { id: 143, fecha: null, motivo: null, activa: true },
    ]);
  });

  it('cae a servicios pendientes cuando el historial responde 403', () => {
    let resultado: { origen: string; consultas: Array<{ id: number }> } | null = null;
    servicio.listarConsultasPaciente(7).subscribe((respuesta) => (resultado = respuesta));

    const historial = http.expectOne(`${CONSULTAS}?paciente_id=7`);
    historial.flush(
      { detail: 'Sin permiso de lectura clínica' },
      { status: 403, statusText: 'Forbidden' },
    );

    const respaldo = http.expectOne(
      `${environment.apiUrl}/pagos/administrativos/servicios-pendientes?paciente_id=7`,
    );
    expect(respaldo.request.method).toBe('GET');
    respaldo.flush({
      paciente_id: 7,
      servicios: [
        { servicio_realizado_id: 11, consulta_clinica_id: 142 },
        { servicio_realizado_id: 12, consulta_clinica_id: 142 },
        { servicio_realizado_id: 13, consulta_clinica_id: 144 },
      ],
      total: '300.00',
    });

    expect(resultado!.origen).toBe('pagos');
    expect(resultado!.consultas.map((consulta) => consulta.id)).toEqual([142, 144]);
  });

  it('propaga los errores distintos de 403/404 al listar consultas', () => {
    let estado: number | null = null;
    servicio.listarConsultasPaciente(7).subscribe({
      error: (error: { status?: number }) => (estado = error.status ?? null),
    });

    const historial = http.expectOne(`${CONSULTAS}?paciente_id=7`);
    historial.flush(
      { detail: 'Servicio no disponible' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(estado).toBe(500);
  });
});

