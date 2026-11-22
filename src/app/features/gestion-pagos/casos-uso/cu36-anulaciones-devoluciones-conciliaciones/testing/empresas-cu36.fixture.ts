import { MenuModulo } from '../../../../../core/models/menu.models';

export interface EmpresaCu36Fixture {
  codigo: string;
  nombre: string;
  tenantCode: string | null;
  modulos: MenuModulo[];
  esperado: {
    puedeVerLibro: boolean;
    puedeOperarAjustes: boolean;
    puedeAbrirConciliaciones: boolean;
  };
  escenario: string;
}

const pagos = (funciones: MenuModulo['funciones']): MenuModulo => ({
  id: 8,
  nombre: 'Pagos',
  funciones,
});

export const EMPRESA_CU36_01_ADMIN_MENU_EQUIVALENT: EmpresaCu36Fixture = {
  codigo: 'empresa-01',
  nombre: 'Administrative menu equivalent',
  tenantCode: 'empresa-01',
  modulos: [pagos([
    { id: 31, nombre: 'Gestionar pagos', accion_id: 3, accion_nombre: 'AMBAS' },
    { id: 32, nombre: 'Confirmar pagos bancarios', accion_id: 2, accion_nombre: 'ESCRITURA' },
  ])],
  esperado: { puedeVerLibro: true, puedeOperarAjustes: true, puedeAbrirConciliaciones: true },
  escenario: 'Menu-equivalent administrative access only; no role is encoded or inferred.',
};

export const EMPRESA_CU36_02_RECEPTION_MENU_EQUIVALENT: EmpresaCu36Fixture = {
  codigo: 'empresa-02',
  nombre: 'Reception menu equivalent',
  tenantCode: 'empresa-02',
  modulos: [pagos([
    { id: 31, nombre: 'Gestionar pagos', accion_id: 3, accion_nombre: 'AMBAS' },
  ])],
  esperado: { puedeVerLibro: true, puedeOperarAjustes: true, puedeAbrirConciliaciones: true },
  escenario: 'Frontend permissions allow all CU36 capabilities; the backend may still return 403 for admin-only writes and the UI surfaces it.',
};

export const EMPRESA_CU36_03_READ_ONLY: EmpresaCu36Fixture = {
  codigo: 'empresa-03',
  nombre: 'Read-only payments profile',
  tenantCode: 'empresa-03',
  modulos: [pagos([
    { id: 31, nombre: 'Gestionar pagos', accion_id: 1, accion_nombre: 'LECTURA' },
  ])],
  esperado: { puedeVerLibro: true, puedeOperarAjustes: false, puedeAbrirConciliaciones: false },
  escenario: 'Read-only access can inspect the adjustment ledger but cannot write or open reconciliation.',
};

export const EMPRESA_CU36_04_CONFIRM_ONLY: EmpresaCu36Fixture = {
  codigo: 'empresa-04',
  nombre: 'Bank-confirmation-only profile',
  tenantCode: 'empresa-04',
  modulos: [pagos([
    { id: 32, nombre: 'Confirmar pagos bancarios', accion_id: 2, accion_nombre: 'ESCRITURA' },
  ])],
  esperado: { puedeVerLibro: false, puedeOperarAjustes: false, puedeAbrirConciliaciones: false },
  escenario: 'Bank confirmation is independent and grants no CU36 capability.',
};

export const EMPRESA_CU36_05_EMPTY_PAYMENTS_MENU: EmpresaCu36Fixture = {
  codigo: 'empresa-05',
  nombre: 'Empty payments menu profile',
  tenantCode: 'empresa-05',
  modulos: [pagos([])],
  esperado: { puedeVerLibro: false, puedeOperarAjustes: false, puedeAbrirConciliaciones: false },
  escenario: 'An empty or malformed Pagos function list fails closed.',
};

export const EMPRESA_CU36_06_NO_TENANT: EmpresaCu36Fixture = {
  codigo: 'empresa-06',
  nombre: 'Session without tenant context',
  tenantCode: null,
  modulos: [pagos([
    { id: 31, nombre: 'Gestionar pagos', accion_id: 3, accion_nombre: 'AMBAS' },
  ])],
  esperado: { puedeVerLibro: false, puedeOperarAjustes: false, puedeAbrirConciliaciones: false },
  escenario: 'Sin tenant context, the valid cached menu is not enough: payment and orphan-refund HTTP calls remain blocked.',
};

export const EMPRESA_CU36_07_DATA_LIMITS: EmpresaCu36Fixture = {
  codigo: 'empresa-07',
  nombre: 'Backend data-limit profile',
  tenantCode: 'empresa-07',
  modulos: [pagos([
    { id: 31, nombre: 'Gestionar pagos', accion_id: 3, accion_nombre: 'AMBAS' },
  ])],
  esperado: { puedeVerLibro: true, puedeOperarAjustes: true, puedeAbrirConciliaciones: true },
  escenario: 'Backend outcomes are mocked, never UI-inferred: precio NULL/<=0, installment D4, ajuste abierto and Stripe DESCONOCIDO produce 409 or a non-final state.',
};

export const EMPRESAS_CU36_FIXTURE: readonly EmpresaCu36Fixture[] = [
  EMPRESA_CU36_01_ADMIN_MENU_EQUIVALENT,
  EMPRESA_CU36_02_RECEPTION_MENU_EQUIVALENT,
  EMPRESA_CU36_03_READ_ONLY,
  EMPRESA_CU36_04_CONFIRM_ONLY,
  EMPRESA_CU36_05_EMPTY_PAYMENTS_MENU,
  EMPRESA_CU36_06_NO_TENANT,
  EMPRESA_CU36_07_DATA_LIMITS,
];
