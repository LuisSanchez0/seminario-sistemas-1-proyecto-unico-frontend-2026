import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { CartItem, StoreFront } from '../../services/store-front';
import { CartItemCardComponent } from './components/cart-item-card/cart-item-card.component';
import { CartSummaryComponent } from './components/cart-summary/cart-summary.component';
import { EmptyCartStateComponent } from './components/empty-cart-state/empty-cart-state.component';
import { ProductService } from '../../../products/services/product.service';
import { Product } from '../../../products/interfaces/product.interface';
import {
  NotificationService,
  apiErrorMessage,
} from '../../../shared/services/notification.service';

/** Outcome of the server check for one product. */
type VerifyState = 'checking' | 'verified' | 'out' | 'removed' | 'failed';

/**
 * What a line means for the customer. `reduced` is derived rather than stored so that
 * adjusting the quantity clears it on its own.
 */
export type CartLineState = 'checking' | 'ok' | 'reduced' | 'out' | 'removed' | 'failed';

@Component({
  selector: 'app-cart-page',
  imports: [CartItemCardComponent, CartSummaryComponent, EmptyCartStateComponent],
  templateUrl: './cart-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  readonly cartStore = inject(StoreFront);
  private readonly products = inject(ProductService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly verifyStates = signal<Record<string, VerifyState>>({});
  private readonly inFlight = signal(0);

  readonly items = this.cartStore.cartItems;
  readonly totalUnits = this.cartStore.cartItemCount;
  readonly lineCount = this.cartStore.cartLineCount;

  /** Sum of every line's `price * quantity`. */
  readonly subtotal = this.cartStore.cartTotal;

  /**
   * Shipping is quoted later from the chosen address, so nothing is added here. Kept as a
   * computed rather than an alias so the extra terms land in one place when they exist.
   */
  readonly total = computed(() => this.subtotal());

  readonly validating = computed(() => this.inFlight() > 0);

  readonly lineStates = computed<Record<string, CartLineState>>(() => {
    const states = this.verifyStates();
    const result: Record<string, CartLineState> = {};
    for (const item of this.items()) {
      const verified = states[item.product.id] ?? 'checking';
      result[item.product.id] =
        verified === 'verified'
          ? item.quantity > item.product.stock
            ? 'reduced'
            : 'ok'
          : verified;
    }
    return result;
  });

  readonly hasStockIssues = computed(() =>
    Object.values(this.lineStates()).some((state) => state !== 'ok' && state !== 'checking'),
  );

  readonly canCheckout = computed(
    () =>
      this.lineCount() > 0 &&
      !this.validating() &&
      this.total() > 0 &&
      Object.values(this.lineStates()).every((state) => state === 'ok'),
  );

  /** Single place that explains a disabled checkout button. */
  readonly checkoutBlockReason = computed(() => {
    if (this.lineCount() === 0) return 'Tu carrito está vacío.';
    if (this.validating()) return 'Estamos verificando la disponibilidad de tus productos.';
    const states = Object.values(this.lineStates());
    if (states.includes('removed'))
      return 'Quita los productos que ya no están disponibles para continuar.';
    if (states.includes('out')) return 'Revisa los productos agotados antes de continuar.';
    if (states.includes('reduced')) return 'Ajusta las cantidades que superan el stock disponible.';
    if (states.includes('failed'))
      return 'No pudimos verificar todo tu carrito. Reintenta la verificación.';
    return '';
  });

  constructor() {
    // Stock in the cart is a snapshot from when the item was added; re-check every line that has
    // not been checked yet. An effect (not a one-shot loop) because after a full page reload the
    // cart is restored from storage only once the session is known: the constructor would see an
    // empty cart and the lines would stay on "Verificando disponibilidad…" forever.
    effect(() => {
      const productIds = new Set(this.items().map((item) => item.product.id));
      untracked(() => {
        const known = this.verifyStates();
        for (const productId of productIds) if (!(productId in known)) this.verify(productId);
      });
    });
  }

  stateOf(item: CartItem): CartLineState {
    return this.lineStates()[item.product.id] ?? 'checking';
  }

  verify(productId: string): void {
    this.setVerifyState(productId, 'checking');
    this.inFlight.update((count) => count + 1);
    this.products
      .refreshProductById(productId)
      .pipe(
        finalize(() => this.inFlight.update((count) => count - 1)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (product) => this.applyRefreshed(productId, product),
        error: (error: unknown) => {
          const removed = error instanceof HttpErrorResponse && error.status === 404;
          this.setVerifyState(productId, removed ? 'removed' : 'failed');
          if (!removed)
            this.notifications.error('No se pudo verificar el inventario', apiErrorMessage(error));
        },
      });
  }

  onRemove(item: CartItem): void {
    this.cartStore.removeFromCart(item.product.id);
    this.clearVerifyState(item.product.id);
    this.notifications.info(
      `${item.product.title} eliminado`,
      'El artículo fue quitado de tu carrito.',
    );
  }

  onQuantityChange(item: CartItem, quantity: number): void {
    if (!this.cartStore.updateCartItem(item.product.id, { quantity })) {
      this.notifications.error(
        'Stock insuficiente',
        `Solo hay ${item.product.stock} ${item.product.stock === 1 ? 'unidad' : 'unidades'} disponibles.`,
      );
    }
  }

  /** Brings an over-reserved line back down to what the server currently has. */
  onAdjustToStock(item: CartItem): void {
    if (this.cartStore.updateCartItem(item.product.id, { quantity: item.product.stock }))
      this.notifications.info(
        'Cantidad ajustada',
        `${item.product.title}: ${item.product.stock} ${item.product.stock === 1 ? 'unidad' : 'unidades'}.`,
      );
  }

  private applyRefreshed(productId: string, product: Product): void {
    const item = this.items().find((line) => line.product.id === productId);
    if (!item) return;
    if (product.state === false) return this.setVerifyState(productId, 'removed');
    if (!Number.isFinite(product.stock) || product.stock <= 0)
      // Not persisted: the store drops snapshots with no stock when reloading from storage.
      return this.setVerifyState(productId, 'out');
    this.cartStore.applyProductSnapshot(productId, {
      stock: product.stock,
      title: product.title,
      slug: product.slug,
      imageUrl: product.images[0]?.url ?? item.product.imageUrl,
    });
    this.setVerifyState(productId, 'verified');
  }

  private setVerifyState(productId: string, state: VerifyState): void {
    this.verifyStates.update((states) => ({ ...states, [productId]: state }));
  }

  private clearVerifyState(productId: string): void {
    this.verifyStates.update(({ [productId]: _removed, ...rest }) => rest);
  }
}
