import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',          loadComponent: () => import('./pages/login/login.page').then(m=>m.LoginPage) },
  { path: 'dashboard',      canActivate:[AuthGuard], loadComponent: () => import('./pages/dashboard/dashboard.page').then(m=>m.DashboardPage) },
  { path: 'clientes',       canActivate:[AuthGuard], loadComponent: () => import('./pages/clientes/clientes.page').then(m=>m.ClientesPage) },
  { path: 'nuevo-cliente',  canActivate:[AuthGuard], loadComponent: () => import('./pages/nuevo-cliente/nuevo-cliente.page').then(m=>m.NuevoClientePage) },
  { path: 'nuevo-prestamo', canActivate:[AuthGuard], loadComponent: () => import('./pages/nuevo-prestamo/nuevo-prestamo.page').then(m=>m.NuevoPrestamoPage) },
  { path: 'recibir-pago',   canActivate:[AuthGuard], loadComponent: () => import('./pages/recibir-pago/recibir-pago.page').then(m=>m.RecibirPagoPage) },
  { path: 'reportes',       canActivate:[AuthGuard], loadComponent: () => import('./pages/reportes/reportes.page').then(m=>m.ReportesPage) },
];
