import { authGuard } from './core/guards/auth.guard';
export const routes = [
    {
        path: '',
        loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
    },
    {
        path: 'login',
        loadComponent: () => import('./features/autenticacion-seguridad/Auth/pages/login/login').then((m) => m.Login),
    },
    {
        path: 'password/recuperar',
        loadComponent: () => import('./features/autenticacion-seguridad/Auth/pages/recuperar-password/recuperar-password').then((m) => m.RecuperarPassword),
    },
    {
        path: 'password/restablecer',
        loadComponent: () => import('./features/autenticacion-seguridad/Auth/pages/restablecer-password/restablecer-password').then((m) => m.RestablecerPassword),
    },
    {
        path: 'inicio',
        loadComponent: () => import('./features/autenticacion-seguridad/Auth/pages/inicio/inicio').then((m) => m.Inicio),
        canActivate: [authGuard],
    },
    {
        path: 'roles',
        loadComponent: () => import('./features/autenticacion-seguridad/casos-uso/cu05-gestionar-roles/pages/gestion-roles/gestion-roles').then((m) => m.GestionRoles),
        canActivate: [authGuard],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
