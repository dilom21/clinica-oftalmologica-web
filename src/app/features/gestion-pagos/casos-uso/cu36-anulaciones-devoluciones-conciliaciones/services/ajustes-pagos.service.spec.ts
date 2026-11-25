import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import {
  AnularPagoSolicitud,
  AtribuirReembolsoHuerfanoSolicitud,
  ConciliarAjusteSolicitud,
  CorregirPagoSolicitud,
  ReembolsarPagoSolicitud,
} from '../models/ajustes-pagos.models';
import { AjustesPagosService } from './ajustes-pagos.service';

const BASE = `${environment.apiUrl}/pagos/administrativos`;

describe('CU36 — contratos HTTP de ajustes de pagos', () => {
  let servicio: AjustesPagosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AjustesPagosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el libro de ajustes de un pago', () => {
    servicio.consultarHistorialAjustes(1024).subscribe();

    const peticion = http.expectOne(`${BASE}/1024/ajustes`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.headers.has('Idempotency-Key')).toBe(false);
    peticion.flush({
      pago_id: 1024,
      importe_base: '380.00',
      importe_vigente: '380.00',
      importe_reembolsado: '0.00',
      ajuste_abierto: false,
      ajustes: [],
    });
  });

  it('consulta un ajuste por su identificador', () => {
    servicio.consultarAjuste(55).subscribe();

    const peticion = http.expectOne(`${BASE}/ajustes/55`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ id: 55, pago_id: 1024 });
  });

  it('concilia un ajuste sin cabecera de idempotencia', () => {
    const datos: ConciliarAjusteSolicitud = {
      resultado: 'CONFIRMADO',
      evidencia: 'Comprobante del proveedor',
      observaciones: null,
      refund_id: 're_123',
    };
    servicio.conciliarAjuste(55, datos).subscribe();

    const peticion = http.expectOne(`${BASE}/ajustes/55/conciliar`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.headers.has('Idempotency-Key')).toBe(false);
    peticion.flush({ id: 55, pago_id: 1024, estado: 'CONFIRMADO' });
  });

  it('lista los reembolsos huérfanos pendientes de atribución', () => {
    servicio.listarReembolsosHuerfanos().subscribe((reembolsos) => {
      expect(reembolsos[0].amount).toBe(1010);
      expect(reembolsos[0].currency).toBe('BOB');
    });

    const peticion = http.expectOne(`${BASE}/reembolsos-huerfanos`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush([
      {
        id: 9,
        stripe_event_id: 'evt_123',
        event_type: 'charge.refunded',
        refund_id: 're_123',
        payment_intent_id: 'pi_123',
        amount: 1010,
        currency: 'BOB',
        status: 'succeeded',
        estado: 'PENDIENTE',
        ajuste_id: null,
        motivo: null,
        creado_en: '2026-10-19T16:10:00Z',
      },
    ]);
  });

  it('atribuye un reembolso huérfano sin cabecera de idempotencia', () => {
    const datos: AtribuirReembolsoHuerfanoSolicitud = {
      motivo: 'Reembolso sin metadata del pago original',
      naturaleza: 'SOBREPAGO',
      evidencia: 'Captura del panel de Stripe',
      servicios: [{ servicio_realizado_id: 11, monto: '-10.10' }],
    };
    servicio.atribuirReembolsoHuerfano(9, datos).subscribe();

    const peticion = http.expectOne(`${BASE}/reembolsos-huerfanos/9/atribuir`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.headers.has('Idempotency-Key')).toBe(false);
    peticion.flush({ id: 56, pago_id: 1024, estado: 'PENDIENTE_PROVEEDOR' });
  });

  it('anula un pago con la clave de idempotencia exigida', () => {
    const datos: AnularPagoSolicitud = {
      motivo: 'Registro duplicado del mismo cobro',
      naturaleza: 'PAGO_DUPLICADO',
      evidencia: null,
    };
    servicio.anularPago(1024, datos, 'ajuste-anulacion-12345678').subscribe();

    const peticion = http.expectOne(`${BASE}/1024/anular`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.headers.get('Idempotency-Key')).toBe(
      'ajuste-anulacion-12345678',
    );
    peticion.flush({ id: 57, pago_id: 1024, estado: 'PENDIENTE_PROVEEDOR' });
  });

  it('corrige el importe de un pago con la clave de idempotencia exigida', () => {
    const datos: CorregirPagoSolicitud = {
      motivo: 'El importe registrado no coincide con el arancel',
      naturaleza: 'ERROR_DE_REGISTRO',
      importe: '120.00',
      moneda: 'BOB',
      evidencia: 'Nota de crédito 001',
      servicios: [{ servicio_realizado_id: 11, monto: '120.00' }],
    };
    servicio.corregirPago(1024, datos, 'ajuste-correccion-12345678').subscribe();

    const peticion = http.expectOne(`${BASE}/1024/corregir`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.headers.get('Idempotency-Key')).toBe(
      'ajuste-correccion-12345678',
    );
    peticion.flush({ id: 58, pago_id: 1024, estado: 'PENDIENTE_PROVEEDOR' });
  });

  it('registra un reembolso con la clave de idempotencia exigida', () => {
    const datos: ReembolsarPagoSolicitud = {
      motivo: 'El paciente canceló el servicio antes de la atención',
      naturaleza: 'SERVICIO_CANCELADO',
      importe: '-380.00',
      moneda: 'BOB',
      evidencia: 'Solicitud firmada por el paciente',
      referencia_devolucion: 'DEV-2026-001',
      servicios: [{ servicio_realizado_id: 11, monto: '-380.00' }],
    };
    servicio.reembolsarPago(1024, datos, 'ajuste-devolucion-12345678').subscribe();

    const peticion = http.expectOne(`${BASE}/1024/reembolsos`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(datos);
    expect(peticion.request.headers.get('Idempotency-Key')).toBe(
      'ajuste-devolucion-12345678',
    );
    peticion.flush({ id: 59, pago_id: 1024, estado: 'PENDIENTE_PROVEEDOR' });
  });

  it('no envía la clave de idempotencia en las operaciones idempotentes por estado', () => {
    servicio
      .conciliarAjuste(55, { resultado: 'FALLIDO' })
      .subscribe();
    const conciliacion = http.expectOne(`${BASE}/ajustes/55/conciliar`);
    expect(conciliacion.request.headers.has('Idempotency-Key')).toBe(false);
    conciliacion.flush({ id: 55, pago_id: 1024, estado: 'FALLIDO' });

    servicio
      .atribuirReembolsoHuerfano(9, {
        motivo: 'Reembolso sin metadata del pago original',
        naturaleza: 'OTRO',
        evidencia: 'Captura del panel de Stripe',
        servicios: [{ servicio_realizado_id: 11, monto: '-10.10' }],
      })
      .subscribe();
    const atribucion = http.expectOne(`${BASE}/reembolsos-huerfanos/9/atribuir`);
    expect(atribucion.request.headers.has('Idempotency-Key')).toBe(false);
    atribucion.flush({ id: 56, pago_id: 1024, estado: 'DESCONOCIDO' });
  });
});
