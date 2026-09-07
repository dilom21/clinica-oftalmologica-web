import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
    path: 'password/recuperar',
    loadComponent: () =>
      import(
        './features/autenticacion-seguridad/Auth/pages/recuperar-password/recuperar-password'
      ).then((m) => m.RecuperarPassword),
  },
  {
    path: 'password/restablecer',
    loadComponent: () =>
      import(
        './features/autenticacion-seguridad/Auth/pages/restablecer-password/restablecer-password'
      ).then((m) => m.RestablecerPassword),
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
    path: 'roles',
    loadComponent: () =>
      import(
        './features/autenticacion-seguridad/casos-uso/cu05-gestionar-roles/pages/gestion-roles/gestion-roles'
      ).then((m) => m.GestionRoles),
    canActivate: [authGuard],
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import(
        './features/autenticacion-seguridad/casos-uso/cu04-gestionar-usuarios/pages/gestion-usuarios/gestion-usuarios'
      ).then((m) => m.GestionUsuarios),
    canActivate: [authGuard],
  },
 {
  path: 'pacientes',
  loadComponent: () =>
    import(
  './features/gestion-pacientes/casos-uso/cu07-gestionar-pacientes/pages/gestion-pacientes/gestion-pacientes'
    ).then((m) => m.GestionPacientes),
  canActivate: [authGuard],
},
  {
    path: 'bitacora',
    loadComponent: () =>
      import(
        './features/autenticacion-seguridad/casos-uso/cu06-consultar-bitacora/pages/consultar-bitacora/consultar-bitacora'
      ).then((m) => m.ConsultarBitacora),
    canActivate: [authGuard],
  },
  {
    path: 'agenda-disponibilidad',
    loadComponent: () =>
      import(
        './features/agenda-citas/casos-uso/cu09-consultar-agenda-disponibilidad/pages/consultar-agenda-disponibilidad/consultar-agenda-disponibilidad'
      ).then((m) => m.ConsultarAgendaDisponibilidad),
    canActivate: [authGuard],
  },
  {
    path: 'configurar-disponibilidad',
    loadComponent: () =>
      import(
        './features/agenda-citas/casos-uso/cu11-configurar-disponibilidad/pages/configurar-disponibilidad/configurar-disponibilidad'
      ).then((m) => m.ConfigurarDisponibilidad),
    canActivate: [authGuard],
  },
  {
    path: 'gestionar-citas',
    loadComponent: () =>
      import(
        './features/agenda-citas/casos-uso/cu10-gestionar-citas/pages/gestionar-citas/gestionar-citas'
      ).then((m) => m.GestionarCitas),
    canActivate: [authGuard],
  },
  {
  path: 'historial-citas',
  loadComponent: () =>
    import(
      './features/gestion-agenda-citas/casos-uso/cu12-consultar-historial-citas/pages/consultar-historial-citas/consultar-historial-citas'
    ).then((m) => m.ConsultarHistorialCitas),
  canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];