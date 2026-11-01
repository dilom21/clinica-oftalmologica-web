import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { MenuModulo } from '../../../../../../core/models/menu.models';
import { MenuService } from '../../../../../../core/services/menu.service';
import { AuthService } from '../../../../../autenticacion-seguridad/Auth/services/auth.service';
import {
  Paciente,
} from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/models/pacientes.models';
import { PacientesService } from '../../../../../gestion-pacientes/casos-uso/cu07-gestionar-pacientes/services/pacientes.service';
import {
  CuotaPlanCrear,
  PermisosPlanesCuotas,
  ServicioDisponiblePlan,
} from '../../models/planes-cuotas.models';
import { PlanesPagoService } from '../../services/planes-pago.service';
import { CrearPlanPago } from './crear-plan-pago';

interface VistaPagina {
  estadoPermiso(): string;
  motivoSinAcceso(): string | null;
  tituloSinAcceso(): string;
  detalleSinAcceso(): string;
  permisos(): PermisosPlanesCuotas;
  consultas(): Array<{ id: number }>;
  servicios(): ServicioDisponiblePlan[];
  cuotas(): CuotaPlanCrear[];
  totalFinanciado(): string;
  validacion(): { valido: boolean; mensaje: string | null };
  puedeGuardar(): boolean;
  elegirPaciente(paciente: Paciente): void;
  elegirConsulta(valor: string): void;
  alternarServicio(servicio: ServicioDisponiblePlan): void;
  restablecerCronograma(): void;
  guardar(): void;
}

const MODULO_LECTURA: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 1, accion_nombre: 'LECTURA' },
  ],
};

const MODULO_ESCRITURA: MenuModulo = {
  id: 8,
  nombre: 'Pagos',
  funciones: [
    { id: 40, nombre: 'Gestionar planes de pago', accion_id: 3, accion_nombre: 'AMBAS' },
    { id: 41, nombre: 'Gestionar cuotas', accion_id: 1, accion_nombre: 'LECTURA' },
  ],
};

const PACIENTE: Paciente = {
  id: 7,
  usuario_id: null,
  nombres: 'María',
  apellidos: 'López',
  ci: '9876543',
  fecha_nacimiento: '1990-04-12',
  sexo: 'F',
  telefono: '77712345',
  contacto_emergencia: '70000000',
  fecha_registro: '2026-01-10',
  direccion: 'Av. Blanco Galindo 123',
  estado: true,
};

function servicio(
  id: number,
  saldo: string,
  disponible = true,
): ServicioDisponiblePlan {
  return {
    servicio_realizado_id: id,
    nombre_servicio: `Servicio ${id}`,
    precio_aplicado: saldo,
    saldo_cobrado: '0.00',
    saldo_disponible: saldo,
    disponible,
    conflicto: disponible ? null : 'Ya financiado en otro plan',
  };
}

describe('CU32 — creación de planes de pago', () => {
  let fixture: ComponentFixture<CrearPlanPago>;
  let vista: VistaPagina;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let crearPlan: ReturnType<typeof vi.fn>;
  let listarServiciosDisponibles: ReturnType<typeof vi.fn>;
  let listarPacientes: ReturnType<typeof vi.fn>;
  let serviciosMock: ServicioDisponiblePlan[];

  async function configurar(
    modulos: MenuModulo[] = [MODULO_ESCRITURA],
  ): Promise<void> {
    const estado = signal('listo');
    const menu = signal(modulos);
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    crearPlan = vi.fn(() => of({ id: 21 }));
    listarPacientes = vi.fn(() => of([PACIENTE]));
    serviciosMock = [servicio(11, '150.00'), servicio(12, '50.00'), servicio(13, '80.00', false)];
    listarServiciosDisponibles = vi.fn(() =>
      of({
        paciente_id: 7,
        consulta_clinica_id: 142,
        servicios: serviciosMock,
        total_disponible: '280.00',
      }),
    );

    TestBed.configureTestingModule({
      imports: [CrearPlanPago],
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
        { provide: PacientesService, useValue: { listarPacientes } },
        {
          provide: PlanesPagoService,
          useValue: {
            crearPlan,
            listarServiciosDisponibles,
            listarConsultasPaciente: vi.fn(() =>
              of({ consultas: [{ id: 142, fecha: '2026-10-01', motivo: null, activa: true }], origen: 'historial' }),
            ),
          },
        },
        { provide: AuthService, useValue: { tenantCode: () => 'clinica_demo' } },
        { provide: Router, useValue: router },
      ],
    });
    TestBed.overrideComponent(CrearPlanPago, {
      set: { imports: [], template: '' },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(CrearPlanPago);
    vista = fixture.componentInstance as unknown as VistaPagina;
    fixture.detectChanges();
  }

  it('deniega la creación sin permiso de escritura sobre planes', async () => {
    await configurar([MODULO_LECTURA]);

    expect(vista.estadoPermiso()).toBe('denegado');
    expect(vista.motivoSinAcceso()).toBe('sin-acciones');
    expect(vista.permisos().escribirPlanes).toBe(false);
    expect(vista.tituloSinAcceso()).toContain('no puede crear planes de pago');
    expect(listarPacientes).not.toHaveBeenCalled();
  });

  it('habilita el formulario con permiso de escritura y carga los pacientes', async () => {
    await configurar();

    expect(vista.estadoPermiso()).toBe('autorizado');
    expect(vista.permisos()).toEqual({
      verPlanes: true,
      escribirPlanes: true,
      verCuotas: true,
      escribirCuotas: false,
    });
    expect(listarPacientes).toHaveBeenCalledTimes(1);
    expect(vista.puedeGuardar()).toBe(false);
  });

  it('carga consultas y servicios del paciente elegido', async () => {
    await configurar();

    vista.elegirPaciente(PACIENTE);
    expect(vista.consultas().map((consulta) => consulta.id)).toEqual([142]);

    vista.elegirConsulta('142');
    expect(listarServiciosDisponibles).toHaveBeenCalledWith(7, 142);
    expect(vista.servicios().map((item) => item.servicio_realizado_id)).toEqual([11, 12, 13]);
  });

  it('propone cuotas en centavos y asigna el residuo a la última', async () => {
    await configurar();
    vista.elegirPaciente(PACIENTE);
    vista.elegirConsulta('142');

    vista.alternarServicio(serviciosMock[0]);
    vista.alternarServicio(serviciosMock[1]);
    fixture.detectChanges();

    expect(vista.totalFinanciado()).toBe('200.00');
    expect(vista.cuotas().map((cuota) => cuota.monto_programado)).toEqual([
      '66.66',
      '66.66',
      '66.68',
    ]);
    expect(vista.cuotas().map((cuota) => cuota.numero_cuota)).toEqual([1, 2, 3]);
    expect(vista.validacion().valido).toBe(true);
    expect(vista.puedeGuardar()).toBe(true);
  });

  it('ignora los servicios ya financiados en otro plan', async () => {
    await configurar();
    vista.elegirPaciente(PACIENTE);
    vista.elegirConsulta('142');

    vista.alternarServicio(serviciosMock[2]);
    fixture.detectChanges();

    expect(vista.totalFinanciado()).toBe('0.00');
    expect(vista.cuotas()).toEqual([]);
    expect(vista.puedeGuardar()).toBe(false);
  });

  it('crea el plan con Idempotency-Key y abre el detalle', async () => {
    await configurar();
    vista.elegirPaciente(PACIENTE);
    vista.elegirConsulta('142');
    vista.alternarServicio(serviciosMock[1]);
    vista.alternarServicio(serviciosMock[0]);
    fixture.detectChanges();

    vista.guardar();

    expect(crearPlan).toHaveBeenCalledTimes(1);
    const [datos, clave] = crearPlan.mock.calls[0] as [
      {
        paciente_id: number;
        consulta_clinica_id: number;
        servicio_realizado_ids: number[];
        cuotas: CuotaPlanCrear[];
        observaciones: string | null;
      },
      string,
    ];
    expect(datos.paciente_id).toBe(7);
    expect(datos.consulta_clinica_id).toBe(142);
    expect(datos.servicio_realizado_ids).toEqual([11, 12]);
    expect(datos.cuotas).toHaveLength(3);
    expect(datos.observaciones).toBeNull();
    expect(clave).toMatch(/^plan-/);
    expect(router.navigate).toHaveBeenCalledWith(['/pagos/planes', 21]);
  });

  it('no envía el plan mientras falten datos obligatorios', async () => {
    await configurar();
    vista.elegirPaciente(PACIENTE);

    vista.guardar();

    expect(crearPlan).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

