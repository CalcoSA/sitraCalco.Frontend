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
        path: 'configuracion/logs',
        loadComponent: () => import('./pages/configuration-logs/configuration-logs').then(module => module.ConfigurationLogs),
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
      {
        path: 'inventarios/configuracion-bodega/editar/:solutionCenterId',
        loadComponent: () => import('./pages/warehouse-configuration/update-warehouse/update-warehouse').then(module => module.UpdateWarehouse),
      },
      {
        path: 'inventarios/configuracion-inventarios',
        loadComponent: () => import('./pages/inventory-configuration/inventory-configuration').then(module => module.InventoryConfiguration),
      },
      {
        path: 'inventarios/inventarios',
        loadComponent: () => import('./pages/inventories/inventories').then(module => module.Inventories),
      },
      {
        path: 'inventarios/conciliacion-inventarios',
        loadComponent: () => import('./pages/inventory-reconciliation/inventory-reconciliation').then(module => module.InventoryReconciliation),
      },
      {
        path: 'inventarios/planos-erp',
        loadComponent: () => import('./pages/erp-files/erp-files').then(module => module.ErpFiles),
      },
      {
        path: 'inventarios/parametros',
        loadComponent: () => import('./pages/parameters/parameters').then(module => module.Parameters),
      },
      {
        path: 'inventarios/logs',
        loadComponent: () => import('./pages/logs/logs').then(module => module.Logs),
      },
      {
        path: 'trazabilidad-cocina/maestros/proveedores',
        loadComponent: () => import('./pages/kitchen-traceability/suppliers/suppliers').then(module => module.Suppliers),
      },
      {
        path: 'trazabilidad-cocina/maestros/productos',
        loadComponent: () => import('./pages/kitchen-traceability/products/products').then(module => module.Products),
      },
      {
        path: 'trazabilidad-cocina/maestros/formatos',
        loadComponent: () => import('./pages/kitchen-traceability/formats/formats').then(module => module.Formats),
      },
      {
        path: 'trazabilidad-cocina/materias-primas/recepciones',
        loadComponent: () => import('./pages/receptions/receptions').then(module => module.Receptions),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];