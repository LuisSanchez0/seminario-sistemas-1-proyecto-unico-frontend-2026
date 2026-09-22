import axe from 'axe-core';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../auth/services/auth.service';
import { Product } from '../../../products/interfaces/product.interface';
import { StoreFront } from '../../services/store-front';
import { ProductPageComponent } from './product-page.component';
import { environment } from '../../../../environments/environment';

const product: Product = {
  id: 'cosmetic-id',
  _id: 'ignored-id',
  title: 'Fit Me Matte + Poreless',
  slug: 'fit-me',
  price: 85,
  stock: 3,
  description: 'Base líquida de acabado mate',
  category: 'ROSTRO',
  brand: { id: 'brand-id', name: 'Maybelline', slug: 'maybelline' },
  subcategory: { id: 'base-id', name: 'Base', slug: 'base', category: 'ROSTRO' },
  images: [],
};
describe('Cosmetics product detail', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let component: ProductPageComponent;
  let store: StoreFront;
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: signal(null) } },
        provideRouter([{ path: 'product/:idSlug', component: ProductPageComponent }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl('/product/fit-me', ProductPageComponent);
    store = TestBed.inject(StoreFront);
  });
  afterEach(() => http.verify());
  async function loaded(value = product) {
    http.expectOne(`${environment.baseUrl}/products/slug/fit-me`).flush(value);
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  it('renders cosmetics metadata, description and the existing gallery fallback', async () => {
    await loaded({ ...product, stock: 15 });
    const element = harness.routeNativeElement!;
    for (const text of [
      'Maybelline',
      'Fit Me Matte + Poreless',
      'Rostro',
      'Base',
      'Q85.00',
      '15 disponibles',
      product.description,
    ]) {
      expect(element.textContent).toContain(text);
    }
    expect(element.textContent).not.toMatch(/Talla|Logo|Instrucciones/);
    expect(element.querySelector('img')?.getAttribute('src')).toBe(
      '/images/product-placeholder.svg',
    );
    expect(element.querySelector('img')?.getAttribute('alt')).toBe(product.title);
    expect(element.querySelector('input[type="file"]')).toBeNull();
    expect(element.querySelector('textarea')).toBeNull();
  });
  it('clamps quantities and prevents adding more than total stock across repeated additions', async () => {
    await loaded();
    for (const [input, expected] of [
      [-1, 1],
      [4, 3],
      [1.5, 1],
      [NaN, 1],
      [3, 3],
    ]) {
      component.setQuantity(input);
      expect(component.quantityControl.value).toBe(expected);
    }
    component.onSubmit();
    expect(store.cartItems()).toEqual([
      {
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          price: product.price,
          stock: 3,
          imageUrl: '/images/product-placeholder.svg',
        },
        quantity: 3,
      },
    ]);
    expect(component.canAdd()).toBe(false);
    component.quantityControl.setValue(1);
    component.onSubmit();
    expect(store.cartItemCount()).toBe(3);
  });
  it('disables all purchase controls for zero stock even with a tampered input', async () => {
    await loaded({ ...product, stock: 0 });
    expect(harness.routeNativeElement?.textContent).toContain('Producto agotado');
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    component.quantityControl.setValue(3);
    component.onSubmit();
    expect(store.cartItemCount()).toBe(0);
  });
  it('reacts to slug navigation and cancels a stale detail request', async () => {
    const pending = http.expectOne(`${environment.baseUrl}/products/slug/fit-me`);
    await harness.navigateByUrl('/product/perfume');
    expect(pending.cancelled).toBe(true);
    http
      .expectOne(`${environment.baseUrl}/products/slug/perfume`)
      .flush({ ...product, id: 'perfume', slug: 'perfume', title: 'Perfume' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(component.product()?.id).toBe('perfume');
  });
  it('provides an error state, retry and a link back to the catalog', async () => {
    http
      .expectOne(`${environment.baseUrl}/products/slug/fit-me`)
      .flush({ msg: 'No existe' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Producto no encontrado');
    expect(harness.routeNativeElement?.textContent).toContain('No existe');
    component.reload();
    await loaded();
    expect(component.product()?.id).toBe(product.id);
  });
  it('has no detectable WCAG A/AA structural accessibility violations', async () => {
    await loaded();
    const result = await axe.run(harness.routeNativeElement!, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((item) => item.id)).toEqual([]);
  });
});
