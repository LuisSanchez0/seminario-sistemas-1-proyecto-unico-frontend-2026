import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartItem } from '../../../../services/store-front';
import {
  getPlacementLabel,
  NO_LOGO_VALUE,
} from '../../../../components/logo-placement-selector/logo-placement-selector.component';

@Component({
  selector: 'app-cart-item-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-item-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemCardComponent {
  item = input.required<CartItem>();

  /**
   * Maximum quantity allowed for this specific cart line.
   *
   * Computed by CartPage as:
   *   stockForSize − quantityReservedByOtherLinesWithSameProductAndSize
   *
   * Defaults to Infinity for products without size variants (no stock cap).
   */
  maxQuantity = input<number>(Infinity);

  remove = output<void>();
  quantityChange = output<number>();
  /** Emits when the user clicks the instructions badge or the "add note" button. */
  instructionsEdit = output<void>();

  readonly placementLabel = computed(() =>
    getPlacementLabel(this.item().logoLocation)
  );

  readonly isNoLogo = computed(
    () => this.item().logoLocation === NO_LOGO_VALUE
  );

  readonly subtotal = computed(
    () => this.item().product.price * this.item().quantity
  );

  readonly displaySize = computed(() =>
    this.item().size === 'no-size' ? 'Única' : this.item().size
  );

  /** True when the current quantity equals the computed maximum for this line. */
  readonly isAtMax = computed(
    () => this.item().quantity >= this.maxQuantity()
  );

  onDecrement(): void {
    const current = this.item().quantity;
    if (current > 1) {
      this.quantityChange.emit(current - 1);
    }
  }

  onIncrement(): void {
    if (this.isAtMax()) return;
    this.quantityChange.emit(this.item().quantity + 1);
  }
}
