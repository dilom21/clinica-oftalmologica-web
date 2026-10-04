import { authGuard } from './core/guards/auth.guard';
import { routes } from './app.routes';

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

describe('app.routes — CU21/CU22', () => {
  it('expone ambas pantallas con autenticación y antes del comodín', () => {
    for (const path of ['gestion-servicios', 'registrar-servicios-realizados']) {
      const indice = routes.findIndex(r => r.path === path);
      expect(indice).toBeGreaterThan(-1);
      expect(indice).toBeLessThan(routes.findIndex(r => r.path === '**'));
      expect(routes[indice].canActivate).toContain(authGuard);
    }
  });
});
