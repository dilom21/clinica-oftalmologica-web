import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ServicioOftalmologicoService } from './servicio-oftalmologico.service';

describe('Catálogo CU21 utilizado por CU22', () => {
  it('usa las rutas canónicas para listar, crear, actualizar parcialmente y desactivar', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ServicioOftalmologicoService);
    const http = TestBed.inject(HttpTestingController);
    const url = environment.apiUrl + '/servicios-oftalmologicos/';
    service.listarServicios().subscribe();
    const listado = http.expectOne(url);
    expect(listado.request.method).toBe('GET'); listado.flush([]);

    const nuevo = {
      nombre: 'Fondo de ojo',
      descripcion: 'Evaluación de retina',
      precio_base: 150,
      duracion_estimada: 30,
      estado: true,
    };
    service.crearServicio(nuevo).subscribe();
    const creacion = http.expectOne(url);
    expect(creacion.request.method).toBe('POST');
    expect(creacion.request.body).toEqual(nuevo);
    creacion.flush({ id: 3, ...nuevo });

    service.actualizarServicio(3, { precio_base: 175 }).subscribe();
    const actualizacion = http.expectOne(url + '3');
    expect(actualizacion.request.method).toBe('PUT');
    expect(actualizacion.request.body).toEqual({ precio_base: 175 });
    actualizacion.flush({ id: 3, ...nuevo, precio_base: 175 });

    service.eliminarServicio(3).subscribe();
    const baja = http.expectOne(url + '3');
    expect(baja.request.method).toBe('PUT');
    expect(baja.request.body).toEqual({ estado: false });
    baja.flush({}); http.verify();
  });
});
