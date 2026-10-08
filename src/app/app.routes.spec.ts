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

describe('app.routes — CU17', () => {
  it('expone /tratamientos-recetas protegida por authGuard', () => {
    const ruta = routes.find((r) => r.path === 'tratamientos-recetas');

    expect(ruta).toBeTruthy();
    expect(ruta?.canActivate).toContain(authGuard);
    expect(typeof ruta?.loadComponent).toBe('function');
  });
});
