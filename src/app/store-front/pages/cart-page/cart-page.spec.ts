import axe from 'axe-core';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CartPage } from './cart-page';
import { CartProductRef, StoreFront } from '../../services/store-front';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';

const url = environment.baseUrl;

const perfume: CartProductRef = {
  id: '000000000000000000000001',
  title: 'Acqua di Gio',
  slug: 'acqua-di-gio',
  price: 850,
  stock: 8,
  brand: 'Giorgio Armani',
  imageUrl: 'https://example.com/a.png',
};
const base: CartProductRef = {
  id: '000000000000000000000002',
  title: 'Fit Me Matte',
  slug: 'fit-me-matte',
  price: 75,
  stock: 10,
  brand: 'Maybelline',
  imageUrl: 'https://example.com/b.png',
};

/** Server payload for a cart product, with whatever stock the test needs. */
function serverProduct(ref: CartProductRef, overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    id: ref.id,
    _id: ref.id,
    title: ref.title,
    slug: ref.slug,
    price: ref.price,
    description: 'Una fragancia acuática',
    stock: ref.stock,
    state: true,
    category: 'PERFUMES',
    brand: { id: 'b', name: ref.brand, slug: 'b' },
    subcategory: { id: 's', name: 'Hombre', slug: 'hombre', category: 'PERFUMES' },
    images: [{ key: 'k', url: ref.imageUrl }],
    ...overrides,
  };
}

describe('Cosmetics cart page', () => {
  const user = signal<{ uid: string } | null>(null);
  let fixture: ComponentFixture<CartPage>;
  let component: CartPage;
  let store: StoreFront;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    user.set(null);
    localStorage.setItem('prowear_guest_id', 'test-guest');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { user } },
      ],
    });
    store = TestBed.inject(StoreFront);
    TestBed.tick();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  /** Seeds the cart, then creates the page so its constructor revalidates. */
  function start(seed: Array<{ product: CartProductRef; quantity: number }>) {
    for (const line of seed) store.addToCart(line);
    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  function settle(products: Array<ReturnType<typeof serverProduct>>) {
    for (const product of products) http.expectOne(`${url}/products/${product.id}`).flush(product);
    fixture.detectChanges();
  }

  it('computes line subtotal, cart subtotal and total for one product', () => {
    start([{ product: { ...perfume, price: 100, stock: 5 }, quantity: 3 }]);
    settle([serverProduct({ ...perfume, price: 100, stock: 5 })]);
    expect(component.subtotal()).toBe(300);
    expect(component.total()).toBe(300);
    expect(component.totalUnits()).toBe(3);
    expect(component.lineCount()).toBe(1);
  });

  it('adds up units, lines and money across several products', () => {
    start([
      { product: { ...perfume, price: 100 }, quantity: 2 },
      { product: { ...base, price: 75 }, quantity: 3 },
    ]);
    settle([serverProduct({ ...perfume, price: 100 }), serverProduct({ ...base, price: 75 })]);
    expect(component.totalUnits()).toBe(5);
    expect(component.lineCount()).toBe(2);
    expect(component.subtotal()).toBe(425);
    expect(component.total()).toBe(425);
    expect(component.canCheckout()).toBe(true);
  });

  it('increases up to stock and refuses to go past it', () => {
    start([{ product: { ...perfume, stock: 5 }, quantity: 4 }]);
    settle([serverProduct({ ...perfume, stock: 5 })]);
    component.onQuantityChange(component.items()[0], 5);
    expect(component.totalUnits()).toBe(5);
    // The template disables "+" here; the store rejects it regardless.
    component.onQuantityChange(component.items()[0], 6);
    expect(component.totalUnits()).toBe(5);
  });

  it('decreases by one and never below one', () => {
    start([{ product: perfume, quantity: 3 }]);
    settle([serverProduct(perfume)]);
    component.onQuantityChange(component.items()[0], 2);
    expect(component.totalUnits()).toBe(2);
    component.onQuantityChange(component.items()[0], 0);
    expect(component.totalUnits()).toBe(2);
  });

  it('flags a line whose server stock dropped below the cart quantity', () => {
    start([{ product: { ...perfume, stock: 8 }, quantity: 5 }]);
    settle([serverProduct({ ...perfume, stock: 8 }, { stock: 3 })]);
    expect(component.stateOf(component.items()[0])).toBe('reduced');
    expect(component.canCheckout()).toBe(false);
    expect(component.checkoutBlockReason()).toContain('Ajusta las cantidades');
    // The persisted snapshot now carries the server's number.
    expect(component.items()[0].product.stock).toBe(3);
  });

  it('clears the flag once the quantity is adjusted to the server stock', () => {
    start([{ product: { ...perfume, stock: 8 }, quantity: 5 }]);
    settle([serverProduct({ ...perfume, stock: 8 }, { stock: 3 })]);
    component.onAdjustToStock(component.items()[0]);
    expect(component.totalUnits()).toBe(3);
    expect(component.stateOf(component.items()[0])).toBe('ok');
    expect(component.canCheckout()).toBe(true);
  });

  it('marks a sold-out product and blocks checkout', () => {
    start([{ product: perfume, quantity: 2 }]);
    settle([serverProduct(perfume, { stock: 0 })]);
    expect(component.stateOf(component.items()[0])).toBe('out');
    expect(component.canCheckout()).toBe(false);
    expect(component.checkoutBlockReason()).toContain('agotados');
  });

  it('marks an inactive product as no longer available', () => {
    start([{ product: perfume, quantity: 1 }]);
    settle([serverProduct(perfume, { state: false })]);
    expect(component.stateOf(component.items()[0])).toBe('removed');
    expect(component.canCheckout()).toBe(false);
  });

  it('treats a 404 as a removed product without breaking the other lines', () => {
    start([
      { product: perfume, quantity: 1 },
      { product: base, quantity: 2 },
    ]);
    http
      .expectOne(`${url}/products/${perfume.id}`)
      .flush(
        { ok: false, msg: 'No se encontró el producto' },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne(`${url}/products/${base.id}`).flush(serverProduct(base));
    fixture.detectChanges();
    expect(component.stateOf(component.items()[0])).toBe('removed');
    expect(component.stateOf(component.items()[1])).toBe('ok');
    expect(component.canCheckout()).toBe(false);
    // Removing the dead line unblocks checkout.
    component.onRemove(component.items()[0]);
    expect(component.canCheckout()).toBe(true);
  });

  it('keeps a failed verification retryable and checkout disabled', () => {
    start([{ product: perfume, quantity: 1 }]);
    http
      .expectOne(`${url}/products/${perfume.id}`)
      .flush({ msg: 'Servicio no disponible' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.stateOf(component.items()[0])).toBe('failed');
    expect(component.canCheckout()).toBe(false);
    component.verify(perfume.id);
    http.expectOne(`${url}/products/${perfume.id}`).flush(serverProduct(perfume));
    fixture.detectChanges();
    expect(component.stateOf(component.items()[0])).toBe('ok');
    expect(component.canCheckout()).toBe(true);
  });

  it('blocks checkout while availability is still being verified', () => {
    start([{ product: perfume, quantity: 1 }]);
    expect(component.validating()).toBe(true);
    expect(component.canCheckout()).toBe(false);
    expect(component.checkoutBlockReason()).toContain('verificando');
    http.expectOne(`${url}/products/${perfume.id}`).flush(serverProduct(perfume));
    fixture.detectChanges();
    expect(component.validating()).toBe(false);
    expect(component.canCheckout()).toBe(true);
  });

  it('verifies each product once even with repeated additions', () => {
    store.addToCart({ product: perfume, quantity: 1 });
    store.addToCart({ product: perfume, quantity: 2 });
    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Merged into one line, so exactly one request.
    expect(component.lineCount()).toBe(1);
    expect(component.totalUnits()).toBe(3);
    http.expectOne(`${url}/products/${perfume.id}`).flush(serverProduct(perfume));
  });

  it('persists quantity changes and removals across a reload', () => {
    start([{ product: perfume, quantity: 2 }]);
    settle([serverProduct(perfume)]);
    component.onQuantityChange(component.items()[0], 4);
    TestBed.tick();
    const raw = localStorage.getItem('cart_cosmetics_v1_guest_test-guest')!;
    expect(JSON.parse(raw)[0].quantity).toBe(4);
    component.onRemove(component.items()[0]);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('cart_cosmetics_v1_guest_test-guest')!)).toEqual([]);
  });

  it('shows the empty state and no summary when the cart has no lines', () => {
    start([]);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Tu carrito está vacío');
    expect(text).not.toContain('Resumen del pedido');
    expect(component.canCheckout()).toBe(false);
  });

  it('renders money, quantity and brand instead of blank values', () => {
    start([{ product: { ...perfume, price: 850, stock: 8 }, quantity: 5 }]);
    settle([serverProduct({ ...perfume, price: 850, stock: 8 })]);
    const text: string = fixture.nativeElement.textContent.replace(/ /g, ' ');
    expect(text).toContain('Giorgio Armani');
    expect(text).toContain('c/u');
    // The regression this page had: currency bindings rendered empty.
    expect(text).toMatch(/Q\s?850\.00/);
    expect(text).toMatch(/Q\s?4,250\.00/);
    expect(text).toContain('8 disponibles');
    expect(text).toContain('5 artículos');
  });

  it('has no detectable WCAG A/AA structural accessibility violations', async () => {
    start([{ product: perfume, quantity: 2 }]);
    settle([serverProduct(perfume, { stock: 1 })]);
    const result = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
