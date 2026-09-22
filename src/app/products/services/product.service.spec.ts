import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { Product, ProductPayload } from '../interfaces/product.interface';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../shared/services/notification.service';

const url = environment.baseUrl;
const payload: ProductPayload = {
  title: 'Fit Me Matte',
  description: 'Base líquida de acabado mate',
  slug: 'fit-me-matte',
  price: 85,
  stock: 15,
  category: 'ROSTRO',
  subcategory: '000000000000000000000002',
  brand: '000000000000000000000003',
};
const product: Product = {
  ...payload,
  id: '000000000000000000000001',
  images: [],
  brand: { id: payload.brand, name: 'Maybelline', slug: 'maybelline' },
  subcategory: { id: payload.subcategory, name: 'Base', slug: 'base', category: 'ROSTRO' },
};

describe('ProductService cosmetics contract', () => {
  let service: ProductService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends canonical filters and pagination without empty or legacy params', () => {
    service
      .getProducts({
        category: 'ROSTRO',
        subcategory: payload.subcategory,
        brand: payload.brand,
        limit: 10,
        offset: 0,
      })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${url}/products`);
    expect(request.request.params.keys()).toEqual([
      'category',
      'subcategory',
      'brand',
      'limit',
      'offset',
    ]);
    expect(request.request.params.get('category')).toBe('ROSTRO');
    expect(request.request.params.get('subcategory')).toBe(payload.subcategory);
    request.flush({ ok: true, count: 1, pages: 1, products: [product] });
    service.getProducts({ brand: '', subcategory: undefined }).subscribe();
    const empty = http.expectOne(`${url}/products`);
    expect(empty.request.params.keys()).toEqual([]);
    empty.flush({ ok: true, count: 0, pages: 0, products: [] });
  });

  it('keeps stock queries and filter caches separate', () => {
    for (const category of ['ROSTRO', 'LABIOS'] as const) {
      service.getProducts({ category }).subscribe();
      http
        .expectOne(`${url}/products?category=${category}`)
        .flush({ ok: true, count: 0, pages: 0, products: [] });
    }
    service.getProductsWithStock({ category: 'ROSTRO', brand: payload.brand }).subscribe();
    http
      .expectOne(`${url}/products/stock?category=ROSTRO&brand=${payload.brand}`)
      .flush({ ok: true, count: 0, pages: 0, products: [] });
    service.getProducts({ category: 'ROSTRO' }).subscribe();
    http.expectNone(`${url}/products?category=ROSTRO`);
  });

  it('shares subcategory requests with navigation, supports refresh and cancels unused lookups', () => {
    const first = service.getSubcategoriesByCategory('ROSTRO').subscribe();
    const second = service.getSubcategoriesByCategory('ROSTRO').subscribe();
    const request = http.expectOne(`${url}/subcategories/category/ROSTRO`);
    first.unsubscribe();
    expect(request.cancelled).toBe(false);
    request.flush({ ok: true, subcategories: [product.subcategory] });
    second.unsubscribe();
    service.getSubcategoriesByCategory('ROSTRO').subscribe();
    http.expectNone(`${url}/subcategories/category/ROSTRO`);
    service.getSubcategoriesByCategory('ROSTRO', true).subscribe();
    http.expectOne(`${url}/subcategories/category/ROSTRO`).flush({ ok: true, subcategories: [] });
    expect(service.subcategoriesByCategory()['ROSTRO']).toEqual([]);
    const cancelled = service.getSubcategoriesByCategory('LABIOS').subscribe();
    const unused = http.expectOne(`${url}/subcategories/category/LABIOS`);
    cancelled.unsubscribe();
    expect(unused.cancelled).toBe(true);
    service.getSubcategoriesByCategory('LABIOS').subscribe();
    http.expectOne(`${url}/subcategories/category/LABIOS`).flush({ ok: true, subcategories: [] });
    service.clearProductsCache();
    expect(service.subcategoriesByCategory()).toEqual({});
  });

  it('reads flattened create/update/detail responses and sends only editable fields', () => {
    const received: Product[] = [];
    service.createProduct(payload).subscribe((value) => received.push(value));
    const create = http.expectOne(`${url}/products`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    expect(create.request.body.images).toBeUndefined();
    create.flush({ ok: true, ...product });
    service.updateProduct(product.id, { stock: 0 }).subscribe((value) => received.push(value));
    const update = http.expectOne(`${url}/products/${product.id}`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ stock: 0 });
    update.flush({ ok: true, ...product, stock: 0 });
    service.clearProductsCache();
    service.getProductById(product.id).subscribe((value) => received.push(value));
    http.expectOne(`${url}/products/${product.id}`).flush({ ok: true, ...product });
    expect(received.map((value) => value.id)).toEqual([product.id, product.id, product.id]);
    expect(received[1].stock).toBe(0);
  });

  it('invalidates cached lists and old slugs after mutations and soft delete', () => {
    service.getProductBySlug(product.slug).subscribe();
    http.expectOne(`${url}/products/slug/${product.slug}`).flush({ ok: true, ...product });
    service.updateProduct(product.id, { slug: 'nuevo-slug' }).subscribe();
    http
      .expectOne(`${url}/products/${product.id}`)
      .flush({ ok: true, ...product, slug: 'nuevo-slug' });
    service.getProductBySlug(product.slug).subscribe();
    http.expectOne(`${url}/products/slug/${product.slug}`).flush({ ok: true, ...product });
    service.deleteProduct(product.id).subscribe();
    const request = http.expectOne(`${url}/products/${product.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ ok: true });
    service.getProductById(product.id).subscribe();
    http.expectOne(`${url}/products/${product.id}`).flush({ ok: true, ...product });
  });

  it('uploads archivo and deletes key at the singular upload endpoint using id', () => {
    const file = new File(['image'], 'base.png', { type: 'image/png' });
    const image = { key: 's3-key', url: 'https://example.com/base.png' };
    let uploaded: unknown;
    service
      .uploadImage(file, { ...product, _id: 'legacy-id' })
      .subscribe((value) => (uploaded = value));
    const request = http.expectOne(`${url}/upload/products/${product.id}`);
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('archivo')).toBe(file);
    request.flush({ ok: true, model: { ...product, images: [image] } });
    expect(uploaded).toEqual(image);
    service.deleteImage(product.id, image.key).subscribe();
    const deletion = http.expectOne(`${url}/upload/products/${product.id}`);
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body).toEqual({ key: image.key });
    deletion.flush({ ok: true });
  });

  it('supports brand and subcategory CRUD, active lists, and category endpoint', () => {
    service.getBrands().subscribe((items) => expect(items).toEqual([product.brand]));
    http.expectOne(`${url}/brands`).flush({
      ok: true,
      brands: [product.brand, { ...product.brand, id: 'inactive', state: false }],
    });
    service
      .getSubcategoriesByCategory('ROSTRO')
      .subscribe((items) => expect(items).toEqual([product.subcategory]));
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ ok: true, subcategories: [product.subcategory] });
    service.getSubcategories().subscribe();
    http.expectOne(`${url}/subcategories`).flush({ ok: true, subcategories: [] });
    service
      .getBrandById(product.brand.id)
      .subscribe((item) => expect(item.id).toBe(product.brand.id));
    http.expectOne(`${url}/brands/${product.brand.id}`).flush({ ok: true, brand: product.brand });
    service
      .getSubcategoryById(product.subcategory.id)
      .subscribe((item) => expect(item.id).toBe(product.subcategory.id));
    http
      .expectOne(`${url}/subcategories/${product.subcategory.id}`)
      .flush({ ok: true, ...product.subcategory });
    service.createBrand({ name: 'Maybelline', slug: 'maybelline' }).subscribe();
    http.expectOne(`${url}/brands`).flush({ ok: true, brand: product.brand });
    service.updateBrand(product.brand.id, { name: 'Maybelline', slug: 'maybelline' }).subscribe();
    http.expectOne(`${url}/brands/${product.brand.id}`).flush({ ok: true, ...product.brand });
    service.createSubcategory({ name: 'Base', slug: 'base', category: 'ROSTRO' }).subscribe();
    const create = http.expectOne(`${url}/subcategories`);
    expect(create.request.body.category).toBe('ROSTRO');
    create.flush({ ok: true, subcategory: product.subcategory });
    service
      .updateSubcategory(product.subcategory.id, { name: 'Base', slug: 'base', category: 'ROSTRO' })
      .subscribe();
    http
      .expectOne(`${url}/subcategories/${product.subcategory.id}`)
      .flush({ ok: true, ...product.subcategory });
    service.deleteBrand(product.brand.id).subscribe();
    http.expectOne(`${url}/brands/${product.brand.id}`).flush({ ok: true });
    service.deleteSubcategory(product.subcategory.id).subscribe();
    http.expectOne(`${url}/subcategories/${product.subcategory.id}`).flush({ ok: true });
  });

  for (const status of [400, 401, 404, 409]) {
    it(`preserves backend msg for HTTP ${status}`, () => {
      service.deleteBrand(product.brand.id).subscribe({
        error: (error) => expect(apiErrorMessage(error)).toBe('Mensaje del servidor'),
      });
      http
        .expectOne(`${url}/brands/${product.brand.id}`)
        .flush({ msg: 'Mensaje del servidor' }, { status, statusText: 'Error' });
    });
  }
});
