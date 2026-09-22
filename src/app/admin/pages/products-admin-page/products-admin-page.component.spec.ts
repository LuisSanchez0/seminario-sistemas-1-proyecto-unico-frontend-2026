import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ProductsAdminPageComponent } from './products-admin-page.component';
import { Product } from '../../../products/interfaces/product.interface';
import { environment } from '../../../../environments/environment';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class EmptyPage {}
const url = environment.baseUrl;
const product: Product = {
  id: 'product-id',
  title: 'Fit Me Matte',
  description: 'Base líquida de acabado mate',
  slug: 'fit-me-matte',
  price: 85,
  stock: 0,
  category: 'ROSTRO',
  brand: { id: 'brand-id', name: 'Maybelline', slug: 'maybelline' },
  subcategory: { id: 'subcategory-id', name: 'Base', slug: 'base', category: 'ROSTRO' },
  images: [],
};

describe('Product admin listing', () => {
  let fixture: ComponentFixture<ProductsAdminPageComponent>;
  let component: ProductsAdminPageComponent;
  let http: HttpTestingController;
  let router: Router;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsAdminPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: EmptyPage }]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    await router.navigateByUrl('/');
    fixture = TestBed.createComponent(ProductsAdminPageComponent);
    component = fixture.componentInstance;
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    });
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  async function initial() {
    fixture.detectChanges();
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [product.brand] });
    http
      .expectOne((req) => req.url === `${url}/products`)
      .flush({ ok: true, count: 1, pages: 1, products: [product] });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders category labels and top-level zero stock', async () => {
    await initial();
    expect(fixture.nativeElement.textContent).toContain('Sin stock');
    expect(fixture.nativeElement.textContent).toContain('Rostro');
    expect(fixture.nativeElement.textContent).toContain('Maybelline');
  });
  it('sends filters with IDs, resets page, clears dependent filter on category changes', async () => {
    await initial();
    component.setFilters({
      category: 'ROSTRO',
      subcategory: product.subcategory.id,
      brand: product.brand.id,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ ok: true, subcategories: [product.subcategory] });
    const request = http.expectOne((req) => req.url === `${url}/products`);
    expect(request.request.params.get('category')).toBe('ROSTRO');
    expect(request.request.params.get('subcategory')).toBe(product.subcategory.id);
    expect(request.request.params.get('brand')).toBe(product.brand.id);
    expect(request.request.params.get('offset')).toBe('0');
    request.flush({ ok: true, count: 1, pages: 1, products: [product] });
    await fixture.whenStable();
    component.changeCategory('LABIOS');
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    http.expectOne(`${url}/subcategories/category/LABIOS`).flush({ ok: true, subcategories: [] });
    const changed = http.expectOne((req) => req.url === `${url}/products`);
    expect(changed.request.params.has('subcategory')).toBe(false);
    changed.flush({ ok: true, count: 0, pages: 0, products: [] });
    await fixture.whenStable();
    component.clearFilters();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.filters().category).toBeUndefined();
    expect(component.filters().brand).toBeUndefined();
    expect(component.filters().subcategory).toBeUndefined();
  });
  it('keeps list intact on delete conflict and shows server message', async () => {
    await initial();
    component.askDelete(product);
    const remove = component.deleteProduct();
    http
      .expectOne(`${url}/products/${product.id}`)
      .flush({ msg: 'No se puede eliminar' }, { status: 409, statusText: 'Conflict' });
    await remove;
    expect(component.response()?.products).toEqual([product]);
    expect(component.deleteError()).toBe('No se puede eliminar');
  });
  it('moves back a page when deleting the final product on the current page', async () => {
    await router.navigateByUrl('/?page=2');
    fixture.detectChanges();
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [product.brand] });
    http
      .expectOne((req) => req.url === `${url}/products` && req.params.get('offset') === '10')
      .flush({ ok: true, count: 11, pages: 2, products: [product] });
    await fixture.whenStable();
    component.askDelete(product);
    const remove = component.deleteProduct();
    http.expectOne(`${url}/products/${product.id}`).flush({ ok: true });
    await remove;
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === `${url}/products` && req.params.get('offset') === '10')
      .flush({ ok: true, count: 10, pages: 1, products: [] });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(component.filters().page).toBe(1);
    });
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === `${url}/products` && req.params.get('offset') === '0')
      .flush({ ok: true, count: 10, pages: 1, products: [product] });
    await fixture.whenStable();
    expect(component.filters().page).toBe(1);
  });
});
