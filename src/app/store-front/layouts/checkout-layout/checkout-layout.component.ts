import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '../../../shared/components/toast-container/toast-container.component';

/**
 * Minimal layout shell for the checkout flow.
 *
 * Unlike StoreFrontLayoutComponent, this layout:
 *   - Does NOT include the store navbar (reduces checkout distractions)
 *   - Does NOT apply the `container mx-auto` constraint (checkout needs
 *     full-width split layout)
 *   - DOES include the ToastContainerComponent for checkout feedback
 *
 * The checkout page owns its own visual chrome (header, split background).
 */
@Component({
  selector: 'app-checkout-layout',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <router-outlet />
    <app-toast-container />
  `,
})
export class CheckoutLayoutComponent {}
