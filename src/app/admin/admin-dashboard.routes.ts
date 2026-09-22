import { Routes } from '@angular/router';
import { AdminDashboardLayoutComponent } from './layouts/admin-dashboard-layout/admin-dashboard-layout.component';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { IsAdminGuard } from '../auth/guards/is-admin.guard';
import { SellsAdminPageComponent } from './pages/sells-admin-page/sells-admin-page.component';
import { SellAdminPageComponent } from './pages/sell-admin-page/sell-admin-page.component';

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
        path: 'sells',
        component: SellsAdminPageComponent,
      },
      {
        path: 'sells/:id',
        component: SellAdminPageComponent,
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default adminDashboardRoutes;
