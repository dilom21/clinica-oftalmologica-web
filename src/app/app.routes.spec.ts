import { authGuard } from './core/guards/auth.guard';
import { routes } from './app.routes';

describe('J2 navigation', () => {
  it('keeps public clinical login separate from guarded SaaS companies', () => {
    const login = routes.find((route) => route.path === 'login');
    const saas = routes.find((route) => route.path === 'saas');
    const companies = saas?.children?.find((route) => route.path === 'empresas');
    expect(login?.canActivate).toBeUndefined();
    expect(saas?.canActivate).toHaveLength(1);
    expect(companies?.data?.['kind']).toBe('empresas');
    expect(typeof companies?.loadComponent).toBe('function');
  });
});

describe('app.routes — CU15', () => {
  it('expone /registrar-consulta-clinica protegida por authGuard', () => {
    const ruta = routes.find((r) => r.path === 'registrar-consulta-clinica');

    expect(ruta).toBeTruthy();
    expect(ruta?.canActivate).toContain(authGuard);
    expect(typeof ruta?.loadComponent).toBe('function');
  });
});

describe('app.routes — CU16', () => {
  it('expone /registrar-diagnostico protegida por authGuard', () => {
    const ruta = routes.find((r) => r.path === 'registrar-diagnostico');

    expect(ruta).toBeTruthy();
    expect(ruta?.canActivate).toContain(authGuard);
    expect(typeof ruta?.loadComponent).toBe('function');
  });
});

describe('app.routes — CU17', () => {
  it('expone /tratamientos-recetas protegida por authGuard', () => {
    const ruta = routes.find((r) => r.path === 'tratamientos-recetas');

    expect(ruta).toBeTruthy();
    expect(ruta?.canActivate).toContain(authGuard);
    expect(typeof ruta?.loadComponent).toBe('function');
  });
});

describe('app.routes — CU21', () => {
  it('expone CU21 y CU22 antes del comodín y protegidas por authGuard', () => {
    const indiceComodin = routes.findIndex((route) => route.path === '**');

    for (const path of ['gestion-servicios', 'registrar-servicios-realizados']) {
      const indice = routes.findIndex((route) => route.path === path);
      const ruta = routes[indice];

      expect(indice).toBeGreaterThanOrEqual(0);
      expect(indice).toBeLessThan(indiceComodin);
      expect(ruta.canActivate).toContain(authGuard);
      expect(typeof ruta.loadComponent).toBe('function');
    }
  });
});

describe('app.routes — SaaS backups', () => {
  it('expone /saas/backups, /saas/backup-policies y /saas/restores sin romper rutas previas', () => {
    const saas = routes.find((route) => route.path === 'saas');
    const paths = (saas?.children ?? []).map((route) => route.path);
    expect(paths).toContain('backups');
    expect(paths).toContain('backup-policies');
    expect(paths).toContain('restores');
    for (const path of ['backups', 'backup-policies', 'restores']) {
      const child = saas?.children?.find((route) => route.path === path);
      expect(typeof child?.loadComponent).toBe('function');
      expect(child?.canActivate).toBeUndefined();
    }
    expect(saas?.canActivate).toHaveLength(1);
  });
});
