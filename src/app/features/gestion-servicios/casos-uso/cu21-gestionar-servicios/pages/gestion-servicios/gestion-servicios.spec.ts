import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { ServicioOftalmologicoService } from '../../../../../../services/servicio-oftalmologico.service';
import { GestionServicios } from './gestion-servicios';

interface VistaGestionServicios {
  puedeEscribir(): boolean;
  estadoPermiso(): string;
  abrirModalNuevo(): void;
  guardarServicio(): void;
  form: {
    setValue(value: {
      nombre: string;
      descripcion: string;
      precio_base: number;
      duracion_estimada: number;
      estado: boolean;
    }): void;
  };
}

describe('GestionServicios — permisos de menú CU21', () => {
  let fixture: ComponentFixture<GestionServicios>;
  let component: GestionServicios;
  let vista: VistaGestionServicios;
  let listarServicios: ReturnType<typeof vi.fn>;
  let crearServicio: ReturnType<typeof vi.fn>;

  async function configurar(modulos: MenuModulo[]): Promise<void> {
    const estado = signal<'listo'>('listo');
    const menu = signal(modulos);
    listarServicios = vi.fn(() => of([]));
    crearServicio = vi.fn((datos) => of({ id: 10, ...datos }));

    TestBed.configureTestingModule({
      imports: [GestionServicios],
      providers: [
        {
          provide: MenuService,
          useValue: {
            estado: estado.asReadonly(),
            modulos: menu.asReadonly(),
            cargar: vi.fn(),
            reintentar: vi.fn(),
          },
        },
        {
          provide: ServicioOftalmologicoService,
          useValue: {
            listarServicios,
            crearServicio,
            actualizarServicio: vi.fn(),
          },
        },
      ],
    });
    TestBed.overrideComponent(GestionServicios, {
      set: { imports: [ReactiveFormsModule], template: '' },
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(GestionServicios);
    component = fixture.componentInstance;
    vista = component as unknown as VistaGestionServicios;
    fixture.detectChanges();
  }

  it('falla cerrado y no consulta el CRUD si CU21 no está en /seguridad/menu', async () => {
    await configurar([]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.puedeEscribir()).toBe(false);
    expect(listarServicios).not.toHaveBeenCalled();
  });

  it('permite lectura, pero no escritura, con la función y acción LECTURA', async () => {
    await configurar([
      {
        id: 4,
        nombre: 'Configuración clínica',
        funciones: [
          {
            id: 21,
            nombre: 'Gestionar servicios oftalmológicos',
            accion_id: 1,
            accion_nombre: 'LECTURA',
          },
        ],
      },
    ]);

    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(vista.puedeEscribir()).toBe(false);
    expect(listarServicios).toHaveBeenCalledOnce();
  });

  it('habilita creación únicamente con acción ESCRITURA o AMBAS', async () => {
    await configurar([
      {
        id: 4,
        nombre: 'Configuración clínica',
        funciones: [
          {
            id: 21,
            nombre: 'Gestionar servicios oftalmológicos',
            accion_id: 2,
            accion_nombre: 'ESCRITURA',
          },
        ],
      },
    ]);

    expect(vista.puedeEscribir()).toBe(true);
    vista.abrirModalNuevo();
    vista.form.setValue({
      nombre: 'Consulta general',
      descripcion: 'Evaluación oftalmológica',
      precio_base: 150,
      duracion_estimada: 30,
      estado: true,
    });
    vista.guardarServicio();

    expect(crearServicio).toHaveBeenCalledWith({
      nombre: 'Consulta general',
      descripcion: 'Evaluación oftalmológica',
      precio_base: 150,
      duracion_estimada: 30,
      estado: true,
    });
  });
});
