import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartItem } from '../../../../services/store-front';
import type { CartLineState } from '../../cart-page';

@Component({
  selector: 'app-cart-item-card',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-item-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemCardComponent {
  item = input.required<CartItem>();
  state = input<CartLineState>('checking');

  remove = output<void>();
  quantityChange = output<number>();
  adjustToStock = output<void>();
  retry = output<void>();

  readonly subtotal = computed(() => this.item().product.price * this.item().quantity);
  readonly stock = computed(() => this.item().product.stock);

  /** Quantity may never exceed the stock last confirmed by the server. */
  readonly isAtMax = computed(() => this.item().quantity >= this.stock());
  readonly isAtMin = computed(() => this.item().quantity <= 1);

  /** Controls are pointless while the line is unusable or still being checked. */
  readonly controlsDisabled = computed(() =>
    ['checking', 'out', 'removed', 'failed'].includes(this.state()),
  );

  readonly availability = computed<'ok' | 'low' | 'out'>(() => {
    if (this.state() === 'out') return 'out';
    return this.stock() > 5 ? 'ok' : 'low';
  });

  readonly availabilityLabel = computed(() => {
    if (this.availability() === 'out') return 'Agotado';
    const stock = this.stock();
    if (this.availability() === 'low')
      return `Solo ${stock === 1 ? 'queda 1 unidad' : `quedan ${stock} unidades`}`;
    return `${stock} disponibles`;
  });

  onDecrement(): void {
    if (this.isAtMin() || this.controlsDisabled()) return;
    this.quantityChange.emit(this.item().quantity - 1);
  }

  onIncrement(): void {
    if (this.isAtMax() || this.controlsDisabled()) return;
    this.quantityChange.emit(this.item().quantity + 1);
  }
}
