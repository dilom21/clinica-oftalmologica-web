import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ServicioOftalmologicoService } from './servicio-oftalmologico.service';

describe('Catálogo CU21 utilizado por CU22', () => {
  it('consulta la ruta canónica y desactiva por PUT, sin DELETE inexistente', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ServicioOftalmologicoService);
    const http = TestBed.inject(HttpTestingController);
    const url = environment.apiUrl + '/servicios-oftalmologicos/';
    service.listarServicios().subscribe();
    const listado = http.expectOne(url);
    expect(listado.request.method).toBe('GET'); listado.flush([]);
    service.eliminarServicio(3).subscribe();
    const baja = http.expectOne(url + '3');
    expect(baja.request.method).toBe('PUT');
    expect(baja.request.body).toEqual({ estado: false });
    baja.flush({}); http.verify();
  });
});
