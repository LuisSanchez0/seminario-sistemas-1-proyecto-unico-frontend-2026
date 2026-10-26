import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

const GUEST_ID_KEY = 'lumina_guest_id';
/** Llave anterior del identificador de invitado; se adopta una vez para no perder carritos existentes. */
const LEGACY_GUEST_ID_KEY = 'prowear_guest_id';
const CART_USER_PREFIX = 'cart_cosmetics_v1_user_';
const CART_GUEST_PREFIX = 'cart_cosmetics_v1_guest_';

// Product snapshot retained by the existing local signal store.
export interface CartProductRef {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string;
  stock: number;
  /** Brand name, shown above the title on the cart line. Optional: older carts lack it. */
  brand?: string;
}

export interface CartItem {
  product: CartProductRef;
  quantity: number;
}

export type AddToCartInput = CartItem;
export type AddToCartResult =
  { success: true } | { success: false; reserved: number; available: number };
export type CartItemUpdate = Pick<CartItem, 'quantity'>;
export interface CartSummary {
  total: number;
  itemCount: number;
  lineCount: number;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function generateGuestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadFromStorage(key: string): CartItem[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const items: CartItem[] = [];
    for (const value of parsed) {
      if (typeof value !== 'object' || value === null) continue;
      const product: unknown = value.product;
      if (typeof product !== 'object' || product === null) continue;
      const p = product as Record<string, unknown>;
      if (
        typeof p['id'] !== 'string' ||
        !p['id'] ||
        typeof p['title'] !== 'string' ||
        typeof p['slug'] !== 'string' ||
        typeof p['imageUrl'] !== 'string' ||
        typeof p['price'] !== 'number' ||
        !Number.isFinite(p['price']) ||
        p['price'] < 0 ||
        typeof p['stock'] !== 'number' ||
        !Number.isInteger(p['stock']) ||
        p['stock'] <= 0 ||
        !Number.isInteger(value.quantity) ||
        value.quantity < 1
      )
        continue;
      const existing = items.find((item) => item.product.id === p['id']);
      const quantity = Math.min(value.quantity + (existing?.quantity ?? 0), p['stock']);
      if (existing) {
        existing.quantity = quantity;
        continue;
      }
      items.push({
        product: {
          id: p['id'],
          title: p['title'],
          slug: p['slug'],
          imageUrl: p['imageUrl'],
          price: p['price'],
          stock: p['stock'],
          ...(typeof p['brand'] === 'string' && p['brand'] ? { brand: p['brand'] } : {}),
        },
        quantity,
      });
    }
    return items;
  } catch {
    return [];
  }
}

function saveToStorage(key: string, items: CartItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.warn('[CartStore] Could not persist cart to localStorage:', e);
  }
}

@Injectable({ providedIn: 'root' })
export class StoreFront {
  private readonly authService = inject(AuthService);

  private readonly guestId: string;
  private readonly _cartItems = signal<CartItem[]>([]);

  private readonly _storageKey = computed<string>(() => {
    const uid = this.authService.user()?.uid;
    return uid ? `${CART_USER_PREFIX}${uid}` : `${CART_GUEST_PREFIX}${this.guestId}`;
  });

  readonly cartItems = this._cartItems.asReadonly();

  readonly cartTotal = computed(() =>
    this._cartItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  );

  readonly cartItemCount = computed(() =>
    this._cartItems().reduce((sum, item) => sum + item.quantity, 0),
  );

  readonly cartLineCount = computed(() => this._cartItems().length);

  readonly cartSummary = computed<CartSummary>(() => ({
    total: this.cartTotal(),
    itemCount: this.cartItemCount(),
    lineCount: this.cartLineCount(),
  }));

  constructor() {
    this.guestId = this._loadGuestId();

    effect(
      () => {
        const key = this._storageKey();
        const uid = this.authService.user()?.uid;

        if (uid) {
          const guestCartKey = `${CART_GUEST_PREFIX}${this.guestId}`;
          const userItems = loadFromStorage(key); // key === cart_user_<uid>
          const guestItems = loadFromStorage(guestCartKey);

          if (guestItems.length > 0 && userItems.length === 0) {
            // Case 1: guest has items, user cart is empty → migrate
            saveToStorage(key, guestItems);
            localStorage.removeItem(guestCartKey);
            this._cartItems.set(guestItems);
            return;
          }

          if (guestItems.length > 0) {
            // Case 3: both have items → preserve user cart, discard stale guest cart
            // TODO: implement merge strategy here if needed in the future
            localStorage.removeItem(guestCartKey);
          }

          // Case 2: user cart has items (or both empty) → load user cart as-is
          this._cartItems.set(userItems);
        } else {
          // Guest mode → load guest cart
          this._cartItems.set(loadFromStorage(key));
        }
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      const items = this._cartItems();
      const key = untracked(() => this._storageKey());
      saveToStorage(key, items);
    });
  }

  getReservedQuantity(productId: string): number {
    return this._cartItems().find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  /**
   * Units of `productId` that may still be added on top of what the cart already holds.
   * Single source of the "don't oversell" rule shared by the product page and the cart.
   */
  availableToAdd(productId: string, stock: number): number {
    return Math.max(0, stock - this.getReservedQuantity(productId));
  }

  /**
   * Replaces the persisted product snapshot of a line with fresh server data, leaving the
   * chosen quantity untouched. The cart page calls this after revalidating stock so the
   * refreshed numbers persist and the product page sees them too, instead of each screen
   * keeping its own idea of how much stock is left.
   */
  applyProductSnapshot(productId: string, snapshot: Partial<Omit<CartProductRef, 'id'>>): void {
    this._cartItems.update((items) =>
      items.map((item) =>
        item.product.id === productId
          ? { ...item, product: { ...item.product, ...snapshot } }
          : item,
      ),
    );
  }

  addToCart({ product, quantity }: AddToCartInput): AddToCartResult {
    const reserved = this.getReservedQuantity(product.id);
    const available = this.availableToAdd(product.id, product.stock);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isInteger(product.stock) ||
      quantity > available
    ) {
      return { success: false, reserved, available };
    }
    const snapshot: CartProductRef = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: product.stock,
      ...(product.brand ? { brand: product.brand } : {}),
    };
    this._cartItems.update((items) => {
      const line = { product: snapshot, quantity: reserved + quantity };
      return reserved > 0
        ? items.map((item) => (item.product.id === product.id ? line : item))
        : [...items, line];
    });
    return { success: true };
  }

  removeFromCart(productId: string): void {
    this._cartItems.update((items) => items.filter((item) => item.product.id !== productId));
  }

  updateCartItem(productId: string, { quantity }: CartItemUpdate): boolean {
    const target = this._cartItems().find((item) => item.product.id === productId);
    if (!target || !Number.isInteger(quantity) || quantity < 1 || quantity > target.product.stock)
      return false;
    this._cartItems.update((items) =>
      items.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    );
    return true;
  }

  clearCart(): void {
    this._cartItems.set([]);
  }

  private _loadGuestId(): string {
    const current = localStorage.getItem(GUEST_ID_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(LEGACY_GUEST_ID_KEY);
    if (legacy) {
      localStorage.setItem(GUEST_ID_KEY, legacy);
      localStorage.removeItem(LEGACY_GUEST_ID_KEY);
      return legacy;
    }
    return this._createGuestId();
  }

  private _createGuestId(): string {
    const id = generateGuestId();
    localStorage.setItem(GUEST_ID_KEY, id);
    return id;
  }
}
