import { authGuard } from './guards/auth.guard';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((component) => component.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./common/layout/app-layout/app-layout').then(module => module.AppLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then(module => module.Home),
      },
      {
        path: 'configuracion/roles',
        loadComponent: () => import('./pages/roles/roles').then(module => module.Roles),
      },
      {
        path: 'configuracion/usuarios',
        loadComponent: () => import('./pages/users/users').then(module => module.Users),
      },
      {
        path: 'inventarios/productos',
        loadComponent: () => import('./pages/products/products').then(module => module.Products),
      },
      {
        path: 'inventarios/configuracion-bodega',
        loadComponent: () => import('./pages/warehouse-configuration/warehouse-configuration').then(module => module.WarehouseConfiguration),
      },
      {
        path: 'inventarios/configuracion-bodega/crear',
        loadComponent: () => import('./pages/warehouse-configuration/create-warehouse/create-warehouse').then(module => module.CreateWarehouse),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];