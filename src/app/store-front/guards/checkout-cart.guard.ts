import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreFront } from '../services/store-front';
import { NotificationService } from '../../shared/services/notification.service';

/**
 * Protects the /checkout route.
 *
 * Behavior:
 *   - Cart has ≥ 1 line  → allow navigation
 *   - Cart is empty       → show info toast and redirect to /cart
 *
 * Uses the existing signal-based StoreFront service as the single
 * source of truth for cart state. Does NOT duplicate cart state.
 */
export const checkoutCartGuard: CanActivateFn = () => {
  const cartStore = inject(StoreFront);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  if (cartStore.cartLineCount() > 0) {
    return true;
  }

  notifications.info(
    'Tu carrito está vacío',
    'Agrega artículos antes de continuar al pago.'
  );

  return router.createUrlTree(['/cart']);
};
