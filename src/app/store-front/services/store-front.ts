import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

const GUEST_ID_KEY = 'prowear_guest_id';
const CART_USER_PREFIX  = 'cart_user_';
const CART_GUEST_PREFIX = 'cart_guest_';

// ── Domain interfaces ─────────────────────────────────────────────────────────

export interface CartProductRef {
  _id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string;
}

export interface CartItem {
  product: CartProductRef;
  size: string;
  logoLocation: string;
  imgLogo: string | null;
  quantity: number;
  stockForSize: number | null;
  specialInstructions?: string;
}

export interface AddToCartInput {
  product: CartProductRef;
  size: string;
  logoLocation: string;
  imgLogo?: string | null;
  quantity: number;
  stockForSize?: number | null;
  specialInstructions?: string;
}

export type AddToCartResult =
  | { success: true }
  | {
      success: false;
      reserved: number;
      available: number;
    };

export type CartItemUpdate = Partial<
  Pick<CartItem, 'quantity' | 'logoLocation' | 'imgLogo' | 'specialInstructions'>
>;

export interface CartSummary {
  total: number;
  itemCount: number;
  lineCount: number;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function generateGuestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadFromStorage(key: string): CartItem[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
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
    return uid
      ? `${CART_USER_PREFIX}${uid}`
      : `${CART_GUEST_PREFIX}${this.guestId}`;
  });

  readonly cartItems = this._cartItems.asReadonly();

  readonly cartTotal = computed(() =>
    this._cartItems().reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )
  );

  readonly cartItemCount = computed(() =>
    this._cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly cartLineCount = computed(() => this._cartItems().length);

  readonly cartSummary = computed<CartSummary>(() => ({
    total: this.cartTotal(),
    itemCount: this.cartItemCount(),
    lineCount: this.cartLineCount(),
  }));

  constructor() {
    this.guestId =
      localStorage.getItem(GUEST_ID_KEY) ?? this._createGuestId();

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
      { allowSignalWrites: true }
    );

    effect(() => {
      const items = this._cartItems();
      const key = untracked(() => this._storageKey());
      saveToStorage(key, items);
    });
  }

  getReservedQuantity(productId: string, size: string): number {
    return this._cartItems().reduce(
      (sum, item) =>
        item.product._id === productId && item.size === size
          ? sum + item.quantity
          : sum,
      0
    );
  }

  addToCart(input: AddToCartInput): AddToCartResult {
    const {
      product,
      size,
      quantity,
      logoLocation,
      imgLogo = null,
      stockForSize = null,
      specialInstructions = '',
    } = input;

    const normalizedInstructions = specialInstructions.trim();

    if (stockForSize !== null) {
      const currentReserved = this.getReservedQuantity(product._id, size);

      if (currentReserved + quantity > stockForSize) {
        const available = Math.max(0, stockForSize - currentReserved);
        return { success: false, reserved: currentReserved, available };
      }
    }

    this._cartItems.update((items) => {
      const existingIndex = items.findIndex(
        (item) =>
          item.product._id === product._id &&
          item.size === size &&
          item.logoLocation === logoLocation &&
          (item.specialInstructions ?? '') === normalizedInstructions
      );

      if (existingIndex >= 0) {
        const updated = [...items];
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + quantity,
          imgLogo: imgLogo ?? existing.imgLogo,
          stockForSize: stockForSize ?? existing.stockForSize,
        };
        return updated;
      }

      return [
        ...items,
        {
          product,
          size,
          quantity,
          logoLocation,
          imgLogo,
          stockForSize,
          specialInstructions: normalizedInstructions,
        },
      ];
    });

    return { success: true };
  }

  removeFromCart(
    productId: string,
    size: string,
    logoLocation: string,
    specialInstructions = ''
  ): void {
    const normalized = specialInstructions.trim();
    this._cartItems.update((items) =>
      items.filter(
        (item) =>
          !(
            item.product._id === productId &&
            item.size === size &&
            item.logoLocation === logoLocation &&
            (item.specialInstructions ?? '') === normalized
          )
      )
    );
  }

  updateCartItem(
    productId: string,
    size: string,
    logoLocation: string,
    changes: CartItemUpdate,
    specialInstructions = ''
  ): boolean {
    const normalized = specialInstructions.trim();

    if (changes.quantity !== undefined) {
      const targetItem = this._cartItems().find(
        (item) =>
          item.product._id === productId &&
          item.size === size &&
          item.logoLocation === logoLocation &&
          (item.specialInstructions ?? '') === normalized
      );

      const stock = targetItem?.stockForSize ?? null;

      if (stock !== null && targetItem) {
        const reservedByOthers =
          this.getReservedQuantity(productId, size) - targetItem.quantity;

        const maxAllowedForThisLine = stock - reservedByOthers;

        if (changes.quantity > maxAllowedForThisLine) {
          return false; // blocked — caller should show a toast
        }
      }
    }

    this._cartItems.update((items) => {
      const mapped = items.map((item) =>
        item.product._id === productId &&
        item.size === size &&
        item.logoLocation === logoLocation &&
        (item.specialInstructions ?? '') === normalized
          ? { ...item, ...changes }
          : item
      );
      return mapped.filter((item) => item.quantity > 0);
    });

    return true;
  }

  clearCart(): void {
    this._cartItems.set([]);
  }


  private _createGuestId(): string {
    const id = generateGuestId();
    localStorage.setItem(GUEST_ID_KEY, id);
    return id;
  }
}
