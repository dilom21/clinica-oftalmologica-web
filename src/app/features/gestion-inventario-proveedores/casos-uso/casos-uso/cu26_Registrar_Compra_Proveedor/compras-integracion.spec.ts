import { routes } from '../../../../../app.routes';
import { authGuard } from '../../../../../core/guards/auth.guard';
import { NavegacionService } from '../../../../../core/services/navegacion.service';
import { RegistrarCompras } from './registrar-compras';
import { GestionProveedores } from '../cu25_gestionar_proveedores/cu25_gestionar_Proveedores/gestion-proveedores';

describe('Inventario: navegación de compras y proveedores', () => {
  it('vincula el menú de compras con la ruta autenticada', async () => {
    const nav = new NavegacionService();
    expect(nav.rutaDeFuncion('Registrar compras a proveedor')).toBe('/compras');
    const indice = routes.findIndex(r => r.path === 'compras');
    expect(indice).toBeGreaterThanOrEqual(0);
    expect(indice).toBeLessThan(routes.findIndex(r => r.path === '**'));
    expect(routes[indice].canActivate).toContain(authGuard);
    expect(await routes[indice].loadComponent!()).toBe(RegistrarCompras);
  });
  it('carga proveedores desde su nueva carpeta y mantiene el enlace del menú', async () => {
    const nav = new NavegacionService();
    expect(nav.rutaDeFuncion('Gestionar proveedores')).toBe('/proveedores');
    const ruta = routes.find(r => r.path === 'proveedores')!;
    expect(ruta.canActivate).toContain(authGuard);
    expect(await ruta.loadComponent!()).toBe(GestionProveedores);
  });
});
