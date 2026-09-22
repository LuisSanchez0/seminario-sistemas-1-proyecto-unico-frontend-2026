import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/services/auth.service';
import { CartProductRef, StoreFront } from './store-front';

const product: CartProductRef = {
  id: 'cosmetic-id',
  title: 'Base',
  slug: 'base',
  price: 85,
  stock: 3,
  imageUrl: '/images/product-placeholder.svg',
};
describe('Cosmetics cart store', () => {
  const user = signal<{ uid: string } | null>(null);
  let store: StoreFront;
  beforeEach(() => {
    localStorage.clear();
    user.set(null);
    localStorage.setItem('prowear_guest_id', 'test-guest');
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
  });
  function start() {
    store = TestBed.inject(StoreFront);
    TestBed.tick();
  }
  it('merges by product.id and bounds the total by product.stock', () => {
    start();
    expect(store.addToCart({ product, quantity: 1 }).success).toBe(true);
    expect(store.addToCart({ product, quantity: 2 }).success).toBe(true);
    expect(store.cartLineCount()).toBe(1);
    expect(store.cartItemCount()).toBe(3);
    expect(store.cartTotal()).toBe(255);
    expect(store.addToCart({ product, quantity: 1 })).toEqual({
      success: false,
      reserved: 3,
      available: 0,
    });
    expect(store.updateCartItem(product.id, { quantity: 4 })).toBe(false);
    expect(store.updateCartItem(product.id, { quantity: 2 })).toBe(true);
    store.removeFromCart(product.id);
    expect(store.cartLineCount()).toBe(0);
  });
  it('rejects zero, negative, fractional, non-finite and exhausted quantities', () => {
    start();
    for (const quantity of [0, -1, 1.5, NaN, Infinity, 4]) {
      expect(store.addToCart({ product, quantity }).success).toBe(false);
    }
    expect(store.addToCart({ product: { ...product, stock: 0 }, quantity: 1 }).success).toBe(false);
    expect(store.cartLineCount()).toBe(0);
  });
  it('persists only the new contract and migrates the guest cart on login', () => {
    start();
    store.addToCart({ product, quantity: 2 });
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('cart_cosmetics_v1_guest_test-guest')!)).toEqual([
      { product, quantity: 2 },
    ]);
    user.set({ uid: 'user-id' });
    TestBed.tick();
    expect(store.cartItems()).toEqual([{ product, quantity: 2 }]);
    expect(localStorage.getItem('cart_cosmetics_v1_guest_test-guest')).toBeNull();
    expect(JSON.parse(localStorage.getItem('cart_cosmetics_v1_user_user-id')!)).toEqual([
      { product, quantity: 2 },
    ]);
  });
  it('isolates old carts and strips unknown fields from restored cosmetics carts', () => {
    const legacy = JSON.stringify([{ product: { _id: 'old' }, size: 'M', quantity: 2 }]);
    localStorage.setItem('cart_guest_test-guest', legacy);
    localStorage.setItem(
      'cart_cosmetics_v1_guest_test-guest',
      JSON.stringify([
        {
          product,
          quantity: 10,
          size: 'M',
          logoLocation: 'NO_LOGO',
          imgLogo: 'image',
          specialInstructions: 'old',
        },
        { product, quantity: -1 },
      ]),
    );
    start();
    TestBed.tick();
    expect(store.cartItems()).toEqual([{ product, quantity: 3 }]);
    expect(localStorage.getItem('cart_guest_test-guest')).toBe(legacy);
    expect(JSON.parse(localStorage.getItem('cart_cosmetics_v1_guest_test-guest')!)).toEqual([
      { product, quantity: 3 },
    ]);
  });
});
