import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartItem } from '../../../../services/store-front';
@Component({
  selector: 'app-cart-item-card',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-item-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemCardComponent {
  item = input.required<CartItem>();

  maxQuantity = input.required<number>();
  remove = output<void>();
  quantityChange = output<number>();

  readonly subtotal = computed(() => this.item().product.price * this.item().quantity);

  /** True when the current quantity equals the computed maximum for this line. */
  readonly isAtMax = computed(() => this.item().quantity >= this.maxQuantity());

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
