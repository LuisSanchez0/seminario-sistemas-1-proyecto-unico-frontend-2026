import axe from 'axe-core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProductsPage } from './products-page';
import { Product, ProductCategory } from '../../../products/interfaces/product.interface';
import { environment } from '../../../../environments/environment';

const url = environment.baseUrl;
const product: Product = {
  id: 'product-id',
  title: 'Fit Me',
  slug: 'fit-me',
  price: 85,
  stock: 15,
  description: 'Base líquida',
  category: 'ROSTRO',
  images: [],
  subcategory: { id: 'base-id', name: 'Base', slug: 'base', category: 'ROSTRO' },
  brand: { id: 'brand-id', name: 'Maybelline', slug: 'maybelline' },
};

describe('Storefront catalog filters', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let component: ProductsPage;
  let router: Router;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'products', component: ProductsPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());
  const settle = async () => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  async function start(query = '') {
    component = await harness.navigateByUrl('/products' + query, ProductsPage);
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [product.brand] });
  }
  function subcategories(category: ProductCategory, empty = false) {
    const request = http.expectOne(`${url}/subcategories/category/${category}`);
    request.flush({ ok: true, subcategories: empty ? [] : [{ ...product.subcategory, category }] });
  }
  function products(count = 1, items = [product]) {
    const request = http.expectOne((req) => req.url === `${url}/products/stock`);
    request.flush({ ok: true, count, pages: Math.ceil(count / 6), products: items });
    return request.request.params;
  }
  it('initializes a navbar category without waiting for the optional subcategory filter', async () => {
    await start('?category=ROSTRO');
    expect(component.activeCategory()).toBe('ROSTRO');
    expect(products().get('category')).toBe('ROSTRO');
    expect(component.subcategoriesLoading()).toBe(true);
    subcategories('ROSTRO');
    await settle();
    expect(component.activeSubcategory()).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Maybelline');
  });
  it('shows the brand from the URL after its options load asynchronously', async () => {
    await start('?brand=brand-id');
    products();
    await settle();
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#catalog-brand')?.value,
    ).toBe('brand-id');
    component.clearFilters();
    await settle();
    products();
    await settle();
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#catalog-brand')?.value,
    ).toBe('');
  });
  it('keeps subcategories when the selected parent is clicked again', async () => {
    await start('?category=ROSTRO');
    subcategories('ROSTRO');
    products();
    component.selectCategory('ROSTRO');
    await settle();
    expect(component.subcategories()).toHaveLength(1);
    http.expectNone((req) => req.url.includes('/subcategories'));
  });
  it('validates a navbar subcategory before requesting products and keeps filters on the next batch', async () => {
    await start('?category=ROSTRO&subcategory=base-id&brand=brand-id');
    http.expectNone((req) => req.url === `${url}/products/stock`);
    subcategories('ROSTRO');
    expect(component.activeSubcategory()).toBe('base-id');
    const first = products(2);
    expect(first.get('subcategory')).toBe('base-id');
    expect(first.get('brand')).toBe('brand-id');
    expect(first.get('offset')).toBe('0');
    component.loadMore();
    const second = products(2, [{ ...product, id: 'second' }]);
    expect(second.get('category')).toBe('ROSTRO');
    expect(second.get('subcategory')).toBe('base-id');
    expect(second.get('brand')).toBe('brand-id');
    expect(second.get('offset')).toBe('1');
    component.loadMore();
    http.expectNone((req) => req.url === `${url}/products/stock`);
    expect(component.products()).toHaveLength(2);
  });
  it('clears the dependent selection and offset on category changes, then clears all filters', async () => {
    await start('?category=ROSTRO&subcategory=base-id&brand=brand-id&page=2');
    subcategories('ROSTRO');
    products();
    component.selectCategory('LABIOS');
    expect(component.activeSubcategory()).toBeNull();
    await settle();
    expect(router.url).toBe('/products?category=LABIOS&brand=brand-id');
    subcategories('LABIOS', true);
    expect(products().get('offset')).toBe('0');
    await settle();
    expect(harness.routeNativeElement?.textContent).toContain('No hay subcategorías disponibles.');
    component.clearFilters();
    await settle();
    expect(router.url).toBe('/products');
    expect(products().keys()).toEqual(['limit', 'offset']);
    expect(component.subcategories()).toEqual([]);
  });
  it('cancels old category and product requests during rapid navigation', async () => {
    await start('?category=ROSTRO');
    const oldSub = http.expectOne(`${url}/subcategories/category/ROSTRO`);
    const oldProducts = http.expectOne((req) => req.url === `${url}/products/stock`);
    await harness.navigateByUrl('/products?category=LABIOS');
    const middle = http.expectOne(`${url}/subcategories/category/LABIOS`);
    const middleProducts = http.expectOne((req) => req.url === `${url}/products/stock`);
    await harness.navigateByUrl('/products?category=PERFUMES');
    expect(
      oldSub.cancelled && oldProducts.cancelled && middle.cancelled && middleProducts.cancelled,
    ).toBe(true);
    subcategories('PERFUMES', true);
    products();
    expect(component.activeCategory()).toBe('PERFUMES');
    expect(component.subcategories()).toEqual([]);
  });
  it('removes a subcategory that does not belong to the category', async () => {
    await start('?category=LABIOS&subcategory=rostro-only');
    subcategories('LABIOS', true);
    await settle();
    expect(router.url).toBe('/products?category=LABIOS');
    expect(products().has('subcategory')).toBe(false);
  });
  it('normalizes unknown categories and orphan subcategories', async () => {
    await start('?category=INVALID&subcategory=base-id');
    await settle();
    expect(router.url).toBe('/products');
    expect(products().has('category')).toBe(false);
    http.expectNone((req) => req.url.includes('/subcategories'));
  });
  it('keeps parent products available when filters fail and allows retry', async () => {
    await start('?category=ROSTRO');
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ msg: 'Intenta de nuevo' }, { status: 500, statusText: 'Error' });
    products();
    expect(component.subcategoriesError()).toBe('Intenta de nuevo');
    expect(component.products()).toHaveLength(1);
    component.retrySubcategories();
    subcategories('ROSTRO');
    expect(component.subcategoriesError()).toBeNull();
    expect(component.products()).toHaveLength(1);
  });
  it('retries a failed products request at the same offset', async () => {
    await start();
    http
      .expectOne((req) => req.url === `${url}/products/stock`)
      .flush({ msg: 'Sin conexión' }, { status: 500, statusText: 'Error' });
    expect(component.productsError()).toBe('Sin conexión');
    component.loadMore();
    expect(products().get('offset')).toBe('0');
    expect(component.productsError()).toBeNull();
  });
  it('has labeled, single-selection filters without detectable structural AXE violations', async () => {
    await start('?category=ROSTRO&subcategory=base-id');
    subcategories('ROSTRO');
    products();
    component.filtersOpen.set(true);
    await settle();
    const element = harness.routeNativeElement!;
    expect(element.textContent).not.toMatch(/Talla|HOMBRES|MUJERES|UNISEX/);
    expect(element.querySelector('[aria-pressed="true"]')?.textContent).toContain('Rostro');
    const results = await axe.run(element, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((item) => item.id)).toEqual([]);
  });
});
