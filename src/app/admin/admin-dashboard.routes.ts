import { Routes } from '@angular/router';
import { AdminDashboardLayoutComponent } from './layouts/admin-dashboard-layout/admin-dashboard-layout.component';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { IsAdminGuard } from '../auth/guards/is-admin.guard';

export const adminDashboardRoutes: Routes = [
  {
    path: '',
    component: AdminDashboardLayoutComponent,
    canMatch: [IsAdminGuard],
    children: [
      {
        path: 'dashboard',
        component: AdminDashboard,
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products-admin-page/products-admin-page.component').then(
            (m) => m.ProductsAdminPageComponent,
          ),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./pages/product-admin-page/product-admin-page.component').then(
            (m) => m.ProductAdminPageComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders-admin-page/orders-admin-page.component').then(
            (m) => m.OrdersAdminPageComponent,
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./pages/order-admin-page/order-admin-page.component').then(
            (m) => m.OrderAdminPageComponent,
          ),
      },
      {
        path: 'reports',
        pathMatch: 'full',
        redirectTo: 'reports/sales',
      },
      {
        path: 'reports/:type',
        loadComponent: () =>
          import('./pages/reports-admin-page/reports-admin-page.component').then(
            (m) => m.ReportsAdminPageComponent,
          ),
      },
      {
        // Ruta anterior de "ventas": se conserva como redirección para enlaces guardados.
        path: 'sells',
        redirectTo: 'orders',
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default adminDashboardRoutes;
