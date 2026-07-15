import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ReportesPage } from './pages/reportes/reportes.page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Autenticación
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },

  // Navegación principal
  {
    path: 'tabs',
    canActivate: [AuthGuard],
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'tareas', loadComponent: () => import('./pages/tareas/tareas.page').then(m => m.TareasPage) },
      { path: 'novedades', loadComponent: () => import('./pages/novedades/novedades.page').then(m => m.NovedadesPage) },
      { path: 'mapa', loadComponent: () => import('./pages/mapa/mapa.page').then(m => m.MapaPage) },
      { path: 'podcasts', loadComponent: () => import('./pages/podcasts/podcasts.page').then(m => m.PodcastsPage) },
      { path: 'perfil', loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage) },
    ],
  },

  // Gestión de préstamos
  { path: 'dashboard', redirectTo: 'tabs/inicio', pathMatch: 'full' },
  { path: 'clientes', canActivate: [AuthGuard], loadComponent: () => import('./pages/clientes/clientes.page').then(m => m.ClientesPage) },
  { path: 'nuevo-cliente', canActivate: [AuthGuard], loadComponent: () => import('./pages/nuevo-cliente/nuevo-cliente.page').then(m => m.NuevoClientePage) },
  { path: 'nuevo-prestamo', canActivate: [AuthGuard], loadComponent: () => import('./pages/nuevo-prestamo/nuevo-prestamo.page').then(m => m.NuevoPrestamoPage) },
  { path: 'recibir-pago', canActivate: [AuthGuard], loadComponent: () => import('./pages/recibir-pago/recibir-pago.page').then(m => m.RecibirPagoPage) },
  { path: 'historial-pagos', canActivate: [AuthGuard], loadComponent: () => import('./pages/historial-pagos/historial-pagos.page').then(m => m.HistorialPagosPage) },
  { path: 'reportes', canActivate: [AuthGuard], component: ReportesPage },

  // Accesos compatibles con rutas anteriores
  { path: 'novedades', redirectTo: 'tabs/novedades', pathMatch: 'full' },
  { path: 'tareas', redirectTo: 'tabs/tareas', pathMatch: 'full' },
  { path: 'mapa', redirectTo: 'tabs/mapa', pathMatch: 'full' },
  { path: 'podcasts', redirectTo: 'tabs/podcasts', pathMatch: 'full' },
  { path: 'perfil', redirectTo: 'tabs/perfil', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
