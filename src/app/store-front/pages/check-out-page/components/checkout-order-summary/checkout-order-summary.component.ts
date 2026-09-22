import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartItem } from '../../../../services/store-front';
import {
  getPlacementLabel,
  NO_LOGO_VALUE,
} from '../../../../components/logo-placement-selector/logo-placement-selector.component';

@Component({
  selector: 'app-checkout-order-summary',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './checkout-order-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutOrderSummaryComponent {
  items = input.required<CartItem[]>();
  subtotal = input.required<number>();
  shippingCost = input.required<number>();
  total = input.required<number>();

  /** Emits the CartItem whose instructions the user wants to edit. */
  instructionsEdit = output<CartItem>();

  /** Pre-process items for display to avoid repeating logic in the template. */
  readonly displayItems = computed(() =>
    this.items().map((item) => ({
      item,
      isNoLogo: item.logoLocation === NO_LOGO_VALUE,
      placementLabel: getPlacementLabel(item.logoLocation),
      displaySize: item.size === 'no-size' ? 'Única' : item.size,
      lineSubtotal: item.product.price * item.quantity,
      specialInstructions: item.specialInstructions ?? '',
    }))
  );

  readonly hasShipping = computed(() => this.shippingCost() > 0);

  readonly totalUnits = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );
}
