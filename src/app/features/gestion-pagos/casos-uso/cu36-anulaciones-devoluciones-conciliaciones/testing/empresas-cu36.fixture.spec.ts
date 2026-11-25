import { permisosPagos } from '../../cu31-registrar-pago-comprobante/models/pagos-administrativos.models';
import {
  EMPRESAS_CU36_FIXTURE,
  EMPRESA_CU36_06_NO_TENANT,
} from './empresas-cu36.fixture';

describe('CU36 — seven-company frontend fixture matrix', () => {
  it('contains exactly seven unique profiles in stable order', () => {
    const codigos = EMPRESAS_CU36_FIXTURE.map((empresa) => empresa.codigo);

    expect(codigos).toEqual([
      'empresa-01',
      'empresa-02',
      'empresa-03',
      'empresa-04',
      'empresa-05',
      'empresa-06',
      'empresa-07',
    ]);
    expect(new Set(codigos).size).toBe(7);
  });

  it('projects real menu permissions into the expected effective CU36 capabilities', () => {
    for (const empresa of EMPRESAS_CU36_FIXTURE) {
      const funciones = empresa.modulos.flatMap((modulo) => modulo.funciones);
      const permisos = permisosPagos(funciones);
      const conTenant = empresa.tenantCode !== null;

      expect(permisos.ver && conTenant, empresa.codigo).toBe(empresa.esperado.puedeVerLibro);
      expect(permisos.registrar && conTenant, empresa.codigo).toBe(empresa.esperado.puedeOperarAjustes);
      expect(permisos.registrar && conTenant, empresa.codigo).toBe(empresa.esperado.puedeAbrirConciliaciones);
    }
  });

  it('handles the no-tenant profile separately from permission projection', () => {
    const funciones = EMPRESA_CU36_06_NO_TENANT.modulos.flatMap((modulo) => modulo.funciones);

    expect(EMPRESA_CU36_06_NO_TENANT.tenantCode).toBeNull();
    expect(permisosPagos(funciones)).toEqual({ ver: true, registrar: true, confirmar: false });
    expect(EMPRESA_CU36_06_NO_TENANT.esperado).toEqual({
      puedeVerLibro: false,
      puedeOperarAjustes: false,
      puedeAbrirConciliaciones: false,
    });
  });

  it('uses only permission names returned by the existing payments menu contract', () => {
    const nombres = EMPRESAS_CU36_FIXTURE.flatMap((empresa) =>
      empresa.modulos.flatMap((modulo) => modulo.funciones.map((funcion) => funcion.nombre)),
    );

    expect(nombres.every((nombre) =>
      nombre === 'Gestionar pagos' || nombre === 'Confirmar pagos bancarios',
    )).toBe(true);
  });

  it('documents the required authorization, data-limit and tenant scenarios', () => {
    const escenarios = EMPRESAS_CU36_FIXTURE.map((empresa) => empresa.escenario).join(' ');

    for (const termino of ['403', 'D4', 'precio', 'ajuste abierto', 'DESCONOCIDO', 'sin tenant']) {
      expect(escenarios.toLowerCase()).toContain(termino.toLowerCase());
    }
  });
});
