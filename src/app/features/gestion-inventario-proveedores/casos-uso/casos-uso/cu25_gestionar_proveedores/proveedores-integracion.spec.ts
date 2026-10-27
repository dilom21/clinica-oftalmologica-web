import { routes } from '../../../../../app.routes';
import { authGuard } from '../../../../../core/guards/auth.guard';
import { NavegacionService } from '../../../../../core/services/navegacion.service';

describe('CU28: integración de navegación', () => {
  it('conecta el menú con una ruta autenticada anterior al comodín', () => {
    const navegacion = new NavegacionService();
    expect(navegacion.rutaDeFuncion('Gestionar proveedores')).toBe('/proveedores');
    const indice = routes.findIndex(r => r.path === 'proveedores');
    expect(indice).toBeGreaterThanOrEqual(0);
    expect(indice).toBeLessThan(routes.findIndex(r => r.path === '**'));
    expect(routes[indice].canActivate).toContain(authGuard);
    expect(typeof routes[indice].loadComponent).toBe('function');
    expect(routes.filter(r => r.path === 'proveedores')).toHaveLength(1);
  });
});