import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartItem } from '../../../../services/store-front';
@Component({
  selector: 'app-checkout-order-summary',
  imports: [CurrencyPipe],
  templateUrl: './checkout-order-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutOrderSummaryComponent {
  items = input.required<CartItem[]>();
  subtotal = input.required<number>();
  shippingCost = input.required<number>();
  total = input.required<number>();

  /** Pre-process items for display to avoid repeating logic in the template. */
  readonly displayItems = computed(() =>
    this.items().map((item) => ({
      item,
      lineSubtotal: item.product.price * item.quantity,
    })),
  );

  readonly hasShipping = computed(() => this.shippingCost() > 0);

  readonly totalUnits = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
}
