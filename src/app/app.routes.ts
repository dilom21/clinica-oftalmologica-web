import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { saasAuthGuard } from './core/guards/saas-auth.guard';

export const routes: Routes = [
  {
    path: 'saas/login',
    loadComponent: () => import('./features/saas/pages/saas-login.component').then((m) => m.SaasLoginComponent),
  },
  {
    path: 'saas',
    canActivate: [saasAuthGuard],
    loadComponent: () => import('./features/saas/layouts/saas-shell.component').then((m) => m.SaasShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/saas/pages/saas-dashboard.component').then((m) => m.SaasDashboardComponent) },
      { path: 'empresas', data: { kind: 'empresas' }, loadComponent: () => import('./features/saas/pages/saas-companies.component').then((m) => m.SaasCompaniesComponent) },
      { path: 'planes', data: { kind: 'planes' }, loadComponent: () => import('./features/saas/pages/saas-collection.component').then((m) => m.SaasCollectionComponent) },
      { path: 'suscripciones', data: { kind: 'suscripciones' }, loadComponent: () => import('./features/saas/pages/saas-collection.component').then((m) => m.SaasCollectionComponent) },
      { path: 'tenants', data: { kind: 'tenants' }, loadComponent: () => import('./features/saas/pages/saas-collection.component').then((m) => m.SaasCollectionComponent) },
      { path: 'provisionamientos', data: { kind: 'provisionamientos' }, loadComponent: () => import('./features/saas/pages/saas-collection.component').then((m) => m.SaasCollectionComponent) },
      { path: 'bitacora', data: { kind: 'bitacora' }, loadComponent: () => import('./features/saas/pages/saas-collection.component').then((m) => m.SaasCollectionComponent) },
      { path: 'backups', loadComponent: () => import('./features/saas/pages/saas-backups.component').then((m) => m.SaasBackupsComponent) },
      { path: 'backup-policies', loadComponent: () => import('./features/saas/pages/saas-backup-policies.component').then((m) => m.SaasBackupPoliciesComponent) },
      { path: 'restores', loadComponent: () => import('./features/saas/pages/saas-restores.component').then((m) => m.SaasRestoresComponent) },
    ],
  },
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
    path: 'historial-clinico',
    loadComponent: () =>
      import(
        './features/gestion-historial-clinico/casos-uso/cu13-consultar-historial-clinico/pages/consultar-historial-clinico/consultar-historial-clinico'
      ).then((m) => m.ConsultarHistorialClinico),
    canActivate: [authGuard],
  },
  {
    path: 'registrar-consulta-clinica',
    loadComponent: () =>
      import(
        './features/gestion-historial-clinico/casos-uso/cu15-registrar-consulta-clinica/pages/registrar-consulta/registrar-consulta'
      ).then((m) => m.RegistrarConsulta),
    canActivate: [authGuard],
  },
  {
    path: 'registrar-diagnostico',
    loadComponent: () =>
      import(
        './features/gestion-historial-clinico/casos-uso/cu16-registrar-diagnostico/pages/registrar-diagnostico/registrar-diagnostico'
      ).then((m) => m.RegistrarDiagnostico),
    canActivate: [authGuard],
  },
  {
    path: 'tratamientos-recetas',
    loadComponent: () =>
      import(
        './features/gestion-historial-clinico/casos-uso/cu17-registrar-tratamientos-recetas/pages/registrar-tratamientos-recetas/registrar-tratamientos-recetas'
      ).then((m) => m.RegistrarTratamientosRecetas),
    canActivate: [authGuard],
  },
  {
    path: 'examenes-oftalmologicos',
    loadComponent: () =>
      import(
        './features/gestion-historial-clinico/casos-uso/cu18-registrar-examenes/pages/registrar-examenes/registrar-examenes'
      ).then((m) => m.RegistrarExamenes),
    canActivate: [authGuard],
  },
  {
    path: 'programar-controles-medicos',
    loadComponent: () =>
      import(
        './features/gestion-historial-clinico/casos-uso/cu19-programar-controles-medicos/pages/programar-controles/programar-controles'
      ).then((m) => m.ProgramarControles),
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
    path: 'gestion-servicios',
    loadComponent: () =>
      import(
        './features/gestion-servicios/casos-uso/cu21-gestionar-servicios/pages/gestion-servicios/gestion-servicios'
      ).then((m) => m.GestionServicios),
    canActivate: [authGuard],
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./features/reportes/pages/reportes/reportes').then((m) => m.Reportes),
    canActivate: [authGuard],
  },
  {
    path: 'registrar-servicios-realizados',
    loadComponent: () =>
      import('./features/gestion-historial-clinico/casos-uso/cu22-registrar-servicios-realizados/pages/registrar-servicios-realizados/registrar-servicios-realizados')
        .then((m) => m.RegistrarServiciosRealizados),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
