import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { Proveedor } from '../../models/proveedores.models';
import { ProveedoresService } from '../../services/proveedores.service';
import { GestionProveedores } from './gestion-proveedores';

interface VistaGestionProveedores {
  puedeEscribir(): boolean;
  estadoPermiso(): string;
  errorModal(): string | null;
  hayMas(): boolean;
  abrirModalNuevo(): void;
  guardarProveedor(): void;
  cambiarVista(inactivos: boolean): void;
  buscar(texto: string): void;
  desactivarProveedor(proveedor: Proveedor): void;
  form: { setValue(value: Record<string, string>): void };
}

const PROVEEDOR: Proveedor = {
  id: 3,
  razon_social: 'Lentes del Sur',
  nit: '111',
  telefono: null,
  correo: null,
  direccion: null,
  contacto: null,
  estado: true,
};

function moduloInventario(accion: string): MenuModulo[] {
  return [
    {
      id: 4,
      nombre: 'Inventario y Proveedores',
      funciones: [{ id: 32, nombre: 'Gestionar proveedores', accion_id: 3, accion_nombre: accion }],
    },
  ];
}

describe('GestionProveedores — CU28', () => {
  let fixture: ComponentFixture<GestionProveedores>;
  let vista: VistaGestionProveedores;
  let servicio: {
    listar: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    desactivar: ReturnType<typeof vi.fn>;
    reactivar: ReturnType<typeof vi.fn>;
  };

  async function configurar(modulos: MenuModulo[]): Promise<void> {
    servicio = {
      listar: vi.fn(() => of([PROVEEDOR])),
      crear: vi.fn((datos) => of({ id: 10, estado: true, ...datos })),
      actualizar: vi.fn(),
      desactivar: vi.fn(() => of(undefined)),
      reactivar: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [GestionProveedores],
      providers: [
        {
          provide: MenuService,
          useValue: {
            estado: signal<'listo'>('listo').asReadonly(),
            modulos: signal(modulos).asReadonly(),
            cargar: vi.fn(),
            reintentar: vi.fn(),
          },
        },
        { provide: ProveedoresService, useValue: servicio },
      ],
    });
    TestBed.overrideComponent(GestionProveedores, {
      set: { imports: [ReactiveFormsModule], template: '' },
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(GestionProveedores);
    vista = fixture.componentInstance as unknown as VistaGestionProveedores;
    fixture.detectChanges();
  }

  it('falla cerrado y no consulta proveedores sin la función en el menú', async () => {
    await configurar([]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.puedeEscribir()).toBe(false);
    expect(servicio.listar).not.toHaveBeenCalled();
  });

  it('con LECTURA carga solo activos y no permite escribir', async () => {
    await configurar(moduloInventario('LECTURA'));

    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(vista.puedeEscribir()).toBe(false);
    expect(servicio.listar).toHaveBeenCalledWith({ estado: true, busqueda: '', skip: 0, limit: 20 });
  });

  it('cambia a inactivos y busca reiniciando la página', async () => {
    await configurar(moduloInventario('AMBAS'));

    vista.cambiarVista(true);
    expect(servicio.listar).toHaveBeenLastCalledWith({ estado: false, busqueda: '', skip: 0, limit: 20 });
    vista.buscar('  Sur ');
    expect(servicio.listar).toHaveBeenLastCalledWith({ estado: false, busqueda: 'Sur', skip: 0, limit: 20 });
  });

  it('crea enviando opcionales vacíos como null', async () => {
    await configurar(moduloInventario('AMBAS'));

    vista.abrirModalNuevo();
    vista.form.setValue({
      razon_social: '  Optica Andina ',
      nit: '',
      telefono: ' 70000000 ',
      correo: '',
      direccion: '',
      contacto: '',
    });
    vista.guardarProveedor();

    expect(servicio.crear).toHaveBeenCalledWith({
      razon_social: 'Optica Andina',
      nit: null,
      telefono: '70000000',
      correo: null,
      direccion: null,
      contacto: null,
    });
  });

  it('muestra el detalle del backend cuando el NIT está duplicado', async () => {
    await configurar(moduloInventario('ESCRITURA'));
    servicio.crear.mockReturnValue(
      throwError(() => ({ status: 409, error: { detail: 'El NIT ya esta registrado en otro proveedor' } })),
    );

    vista.abrirModalNuevo();
    vista.form.setValue({
      razon_social: 'Duplicado',
      nit: '111',
      telefono: '',
      correo: '',
      direccion: '',
      contacto: '',
    });
    vista.guardarProveedor();

    expect(vista.errorModal()).toBe('El NIT ya esta registrado en otro proveedor');
  });

  it('no envía el formulario con correo inválido', async () => {
    await configurar(moduloInventario('AMBAS'));

    vista.abrirModalNuevo();
    vista.form.setValue({
      razon_social: 'Proveedor',
      nit: '',
      telefono: '',
      correo: 'no-es-correo',
      direccion: '',
      contacto: '',
    });
    vista.guardarProveedor();

    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it('da de baja solo tras confirmar', async () => {
    await configurar(moduloInventario('AMBAS'));
    const confirmar = vi.spyOn(window, 'confirm');

    confirmar.mockReturnValueOnce(false);
    vista.desactivarProveedor(PROVEEDOR);
    expect(servicio.desactivar).not.toHaveBeenCalled();

    confirmar.mockReturnValueOnce(true);
    vista.desactivarProveedor(PROVEEDOR);
    expect(servicio.desactivar).toHaveBeenCalledWith(3);
    confirmar.mockRestore();
  });
});
