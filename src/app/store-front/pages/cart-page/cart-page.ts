import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CartItem, StoreFront } from '../../services/store-front';
import { CartItemCardComponent } from './components/cart-item-card/cart-item-card.component';
import { CartSummaryComponent } from './components/cart-summary/cart-summary.component';
import { EmptyCartStateComponent } from './components/empty-cart-state/empty-cart-state.component';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-cart-page',
  imports: [CartItemCardComponent, CartSummaryComponent, EmptyCartStateComponent],
  templateUrl: './cart-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  readonly cartStore = inject(StoreFront);
  private readonly notifications = inject(NotificationService);

  onRemove(item: CartItem): void {
    this.cartStore.removeFromCart(item.product.id);
    this.notifications.info(
      `${item.product.title} eliminado`,
      'El artículo fue quitado de tu carrito.',
    );
  }

  onQuantityChange(item: CartItem, quantity: number): void {
    if (!this.cartStore.updateCartItem(item.product.id, { quantity })) {
      this.notifications.error(
        'Stock insuficiente',
        `El máximo permitido es ${item.product.stock} unidades.`,
      );
    }
  }
}
