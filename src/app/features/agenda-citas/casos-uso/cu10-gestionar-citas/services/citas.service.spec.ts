import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import { CitasService } from './citas.service';

const URL_CONSTANCIA = `${environment.apiUrl}/agenda-citas/citas/7/constancia`;

describe('CU37 — constancia de cita', () => {
  let servicio: CitasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CitasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el PDF como blob y arma el nombre del archivo', () => {
    let resultado: { blob: Blob; nombre: string } | undefined;
    servicio.descargarConstancia(7).subscribe((r) => (resultado = r));

    const peticion = http.expectOne(URL_CONSTANCIA);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF'], { type: 'application/pdf' }));

    expect(resultado?.nombre).toBe('constancia-cita-7.pdf');
    expect(resultado?.blob.type).toBe('application/pdf');
  });

  it('conserva error.detail cuando el backend responde 409 como blob', async () => {
    const detalle = 'Solo se emite constancia de citas en estado ATENDIDA';
    const error = new Promise<HttpErrorResponse>((resolve) =>
      servicio.descargarConstancia(7).subscribe({ error: resolve }),
    );

    http
      .expectOne(URL_CONSTANCIA)
      .flush(new Blob([JSON.stringify({ detail: detalle })]), {
        status: 409,
        statusText: 'Conflict',
      });

    const recibido = await error;
    expect(recibido.status).toBe(409);
    expect(recibido.error.detail).toBe(detalle);
  });
});
