import { Routes } from '@angular/router';
import { StoreFrontLayoutComponent } from './layouts/store-front-layout/store-front-layout.component';
import { CheckoutLayoutComponent } from './layouts/checkout-layout/checkout-layout.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { NotFoundPageComponent } from '../shared/components/not-found-page/not-found-page.component';
import { AboutUsPageComponent } from './pages/about-us-page/about-us-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { OrderPage } from './pages/order-page/order-page';
import { CartPage } from './pages/cart-page/cart-page';
import { CheckOutPageComponent } from './pages/check-out-page/check-out-page.component';
import { checkoutCartGuard } from './guards/checkout-cart.guard';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

export const storeFrontRoutes: Routes = [
  // ── Main store shell (with navbar + container) ───────────────────────────
  {
    path: '',
    component: StoreFrontLayoutComponent,
    children: [
      {
        path: '',
        component: HomePageComponent,
      },
      {
        path: 'about-us',
        component: AboutUsPageComponent,
      },
      {
        path: 'my-orders',
        component: OrdersPageComponent,
        canActivate: [AuthenticatedGuard],
      },
      {
        path: 'my-orders/:sellId',
        component: OrderPage,
        canActivate: [AuthenticatedGuard],
      },
      {
        // Catalog listing. Filtering is driven by the `category` / `subcategory`
        // query params, matching the backend product filter contract.
        path: 'products',
        loadComponent: () =>
          import('./pages/products-page/products-page').then((m) => m.ProductsPage),
      },
      {
        // Legacy clothing URLs (/products/<gender>/<category>) now land on the
        // unfiltered catalog instead of 404-ing.
        path: 'products/:gender/:category',
        redirectTo: 'products',
      },
      {
        path: 'product/:idSlug',
        loadComponent: () =>
          import('./pages/product-page/product-page.component').then((m) => m.ProductPageComponent),
      },
      {
        path: 'cart',
        component: CartPage,
      },
      {
        path: 'checkout',
        component: CheckOutPageComponent,
        canActivate: [checkoutCartGuard, AuthenticatedGuard],
      },
      {
        path: '**',
        component: NotFoundPageComponent,
      },
    ],
  },

  // ── Checkout shell (no navbar, full-width split layout) ──────────────────
  //
  // The checkout has its own layout so it can:
  //   - render a minimal branded header instead of the store navbar
  //   - use full-viewport width for the split-screen design
  //   - keep the ToastContainerComponent for checkout feedback
  //
  // The checkoutCartGuard redirects to /cart if the cart is empty.
  {
    path: 'checkout',
    component: CheckoutLayoutComponent,
    children: [
      {
        path: '',
        component: CheckOutPageComponent,
        canActivate: [checkoutCartGuard],
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];

export default storeFrontRoutes;
