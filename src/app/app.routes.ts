import { Routes } from '@angular/router';
import { authGuard } from './Core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/autenticacion-seguridad/Auth/pages/login/login').then(
        (m) => m.Login,
      ),
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/autenticacion-seguridad/Auth/pages/inicio/inicio').then(
        (m) => m.Inicio,
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];