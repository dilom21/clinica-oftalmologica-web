import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import { PagoAdministrativoCrear } from '../models/pagos-administrativos.models';
import { PagosAdministrativosService } from './pagos-administrativos.service';

const BASE = `${environment.apiUrl}/pagos/administrativos`;

describe('CU31 — contratos HTTP de pagos administrativos', () => {
  let servicio: PagosAdministrativosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(PagosAdministrativosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta los servicios pendientes por paciente y consulta', () => {
    servicio.listarServiciosPendientes(7, 142).subscribe();

    const peticion = http.expectOne(
      `${BASE}/servicios-pendientes?paciente_id=7&consulta_clinica_id=142`,
    );
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ paciente_id: 7, consulta_clinica_id: 142, servicios: [], total: '0.00' });
  });

  it('registra el pago con la clave de idempotencia exigida por el backend', () => {
    const datos: PagoAdministrativoCrear = {
      paciente_id: 7,
      servicio_realizado_ids: [11, 12],
      metodo_pago: 'EFECTIVO',
      referencia_bancaria: null,
      observaciones: null,
    };
    servicio.registrarPago(datos, 'pago-12345678').subscribe();

    const peticion = http.expectOne(BASE);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.headers.get('Idempotency-Key')).toBe('pago-12345678');
    expect(peticion.request.body).toEqual(datos);
    peticion.flush({});
  });

  it('envía los filtros y la paginación del listado', () => {
    servicio
      .listarPagos({
        paciente_id: 7,
        metodo_pago: 'QR',
        estado: 'PENDIENTE',
        desde: '2026-10-19T04:00:00.000Z',
        hasta: '2026-10-20T03:59:59.999Z',
        page: 2,
        page_size: 10,
      })
      .subscribe();

    const peticion = http.expectOne((req) => req.url === BASE);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('paciente_id')).toBe('7');
    expect(peticion.request.params.get('metodo_pago')).toBe('QR');
    expect(peticion.request.params.get('estado')).toBe('PENDIENTE');
    expect(peticion.request.params.get('desde')).toBe('2026-10-19T04:00:00.000Z');
    expect(peticion.request.params.get('hasta')).toBe('2026-10-20T03:59:59.999Z');
    expect(peticion.request.params.get('page')).toBe('2');
    expect(peticion.request.params.get('page_size')).toBe('10');
    peticion.flush({ items: [], total: 0, page: 2, page_size: 10, total_pages: 0 });
  });

  it('confirma por el endpoint del pago y no envía cuerpo adicional', () => {
    servicio.confirmarPago(5).subscribe();

    const peticion = http.expectOne(`${BASE}/5/confirmar`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ id: 5, estado: 'APROBADO' });
  });

  it('descarga el comprobante como binario con la respuesta completa', () => {
    servicio.descargarComprobante(5).subscribe((respuesta) => {
      expect(respuesta.body).toBeInstanceOf(Blob);
      expect(respuesta.headers.get('Content-Disposition')).toContain('comprobante_pago_5.pdf');
    });

    const peticion = http.expectOne(`${BASE}/5/comprobante`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="comprobante_pago_5.pdf"',
      },
    });
  });

  it('consulta y reintenta la notificación por correo', () => {
    servicio.consultarNotificacion(5).subscribe();
    const consulta = http.expectOne(`${BASE}/5/notificacion`);
    expect(consulta.request.method).toBe('GET');
    consulta.flush({ estado: 'PENDIENTE', intentos: 0 });

    servicio.reintentarNotificacion(5).subscribe();
    const reintento = http.expectOne(`${BASE}/5/notificacion/reintentar`);
    expect(reintento.request.method).toBe('POST');
    reintento.flush({ estado: 'PENDIENTE', intentos: 0 });
  });
});
