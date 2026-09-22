import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CartItem, StoreFront } from '../../services/store-front';
import { CartItemCardComponent } from './components/cart-item-card/cart-item-card.component';
import { CartSummaryComponent } from './components/cart-summary/cart-summary.component';
import { EmptyCartStateComponent } from './components/empty-cart-state/empty-cart-state.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { SpecialInstructionsDialogComponent } from '../../components/special-instructions-dialog/special-instructions-dialog.component';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CartItemCardComponent,
    CartSummaryComponent,
    EmptyCartStateComponent,
    SpecialInstructionsDialogComponent,
  ],
  templateUrl: './cart-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  readonly cartStore = inject(StoreFront);
  private readonly notifications = inject(NotificationService);

  // ── Instructions dialog state ───────────────────────────────────────────────

  /** The cart line currently being edited. Null = dialog closed. */
  readonly editingItem = signal<CartItem | null>(null);

  onInstructionsEdit(item: CartItem): void {
    this.editingItem.set(item);
  }

  onInstructionsSaved(newValue: string): void {
    const item = this.editingItem();
    if (!item) return;

    this.cartStore.updateCartItem(
      item.product._id,
      item.size,
      item.logoLocation,
      { specialInstructions: newValue },
      item.specialInstructions ?? ''
    );

    this.editingItem.set(null);
  }

  onInstructionsDialogClosed(): void {
    this.editingItem.set(null);
  }

  onRemove(item: CartItem): void {
    this.cartStore.removeFromCart(
      item.product._id,
      item.size,
      item.logoLocation,
      item.specialInstructions ?? ''
    );
    this.notifications.info(
      `${item.product.title} eliminado`,
      'El artículo fue quitado de tu carrito.'
    );
  }

  onQuantityChange(item: CartItem, quantity: number): void {
    const updated = this.cartStore.updateCartItem(
      item.product._id,
      item.size,
      item.logoLocation,
      { quantity },
      item.specialInstructions ?? ''
    );

    if (!updated) {
      const stock = item.stockForSize;
      const reserved = this.cartStore.getReservedQuantity(
        item.product._id,
        item.size
      );
      const maxForLine = stock !== null && stock !== undefined
        ? stock - (reserved - item.quantity)
        : null;

      this.notifications.error(
        'Stock insuficiente',
        maxForLine !== null
          ? `El máximo permitido para esta línea es ${maxForLine} unidad${maxForLine === 1 ? '' : 'es'}.`
          : 'No puedes agregar más unidades para este artículo.'
      );
    }
  }

  /**
   * Computes the maximum quantity allowed for a specific cart line,
   * accounting for all OTHER lines that share the same product + size pool.
   *
   *   maxAllowed = stockForSize − quantityReservedByOtherLines
   *
   * This reads cartStore.getReservedQuantity() which internally reads the
   * _cartItems signal — Angular tracks this as a reactive dependency so the
   * value updates automatically when the cart changes.
   *
   * Returns Infinity for no-size products (no stock cap).
   */
  getMaxQuantityForItem(item: CartItem): number {
    const stock = item.stockForSize ?? null;
    if (stock === null) return Infinity;

    const totalReserved = this.cartStore.getReservedQuantity(
      item.product._id,
      item.size
    );
    const reservedByOthers = totalReserved - item.quantity;
    return Math.max(1, stock - reservedByOthers);
  }
}
