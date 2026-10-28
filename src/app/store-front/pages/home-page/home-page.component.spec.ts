import axe from 'axe-core';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Product } from '../../../products/interfaces/product.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { HomePageComponent } from './home-page.component';

@Component({ template: '' })
class BlankPage {}

const stockUrl = `${environment.baseUrl}/products/stock`;

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  title: `Producto ${id}`,
  slug: `producto-${id}`,
  price: 120,
  stock: 8,
  description: 'Descripción del producto',
  category: 'LABIOS',
  images: [{ key: `${id}.jpg`, url: `https://cdn.example.com/${id}.jpg` }],
  subcategory: { id: 'sub-1', name: 'Labiales', slug: 'labiales', category: 'LABIOS' },
  brand: { id: 'brand-1', name: 'Maybelline', slug: 'maybelline' },
  ...overrides,
});

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let http: HttpTestingController;

  const root = () => fixture.nativeElement as HTMLElement;
  const featured = () => root().querySelector<HTMLElement>('home-featured-products')!;
  const hrefs = (scope: HTMLElement, selector = 'a') =>
    Array.from(scope.querySelectorAll<HTMLAnchorElement>(selector)).map((a) =>
      a.getAttribute('href'),
    );

  const featuredRequest = () => http.expectOne((req) => req.url === stockUrl);

  const flushProducts = (products: Product[]) => {
    featuredRequest().flush({ ok: true, count: products.length, pages: 1, products });
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'products', component: BlankPage },
          { path: 'product/:idSlug', component: BlankPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('requests a single page of in-stock products from the catalog endpoint', () => {
    const request = featuredRequest();
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('limit')).toBe('4');
    expect(request.request.params.has('offset')).toBe(false);
    request.flush({ ok: true, count: 0, pages: 0, products: [] });
  });

  it('renders the whole page with skeletons while featured products load', () => {
    expect(featured().querySelector('[data-testid="featured-skeleton"]')).not.toBeNull();
    expect(featured().querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(root().querySelector('h1')?.textContent).toContain('Tu próxima obsesión de belleza');
    expect(root().querySelector('#categories-heading')).not.toBeNull();
    expect(root().querySelector('#final-cta-heading')).not.toBeNull();
    flushProducts([]);
  });

  it('shows at most four featured products linking to their detail page', () => {
    flushProducts(['a', 'b', 'c', 'd', 'e'].map((id) => product(id)));

    const cards = featured().querySelectorAll('product-card');
    expect(cards).toHaveLength(4);
    expect(hrefs(featured(), 'product-card a')).toEqual([
      '/product/producto-a',
      '/product/producto-b',
      '/product/producto-c',
      '/product/producto-d',
    ]);
    expect(featured().textContent).toContain('Maybelline');
    expect(featured().textContent).toContain('Labios · Labiales');
    expect(featured().querySelector('[data-testid="featured-skeleton"]')).toBeNull();
  });

  it('falls back to the local placeholder when a product has no images', () => {
    flushProducts([product('a', { images: [] }), product('b')]);

    const images = Array.from(featured().querySelectorAll<HTMLImageElement>('product-card img'));
    expect(images[0].getAttribute('src')).toBe('/images/product-placeholder.svg');
    expect(images[0].getAttribute('alt')).toBe('Producto a');
    expect(images[1].getAttribute('src')).toBe('https://cdn.example.com/b.jpg');
  });

  it('shows a friendly message when there are no products yet', () => {
    flushProducts([]);
    expect(featured().textContent).toContain('Estamos preparando la selección.');
    expect(featured().querySelectorAll('product-card')).toHaveLength(0);
  });

  it('keeps the page usable and offers a retry when the API fails', () => {
    const notifications = TestBed.inject(NotificationService);
    const error = vi.spyOn(notifications, 'error');

    featuredRequest().flush({ msg: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(featured().textContent).toContain('No pudimos mostrar los destacados');
    expect(hrefs(featured())).toContain('/products');
    expect(root().querySelectorAll('#categorias li a')).toHaveLength(8);
    expect(root().querySelector('#final-cta-heading')).not.toBeNull();
    expect(error).not.toHaveBeenCalled();

    featured().querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(featured().querySelector('[data-testid="featured-skeleton"]')).not.toBeNull();
    flushProducts([product('a')]);
    expect(featured().querySelectorAll('product-card')).toHaveLength(1);
  });

  it('links every canonical category to the catalog category filter', () => {
    flushProducts([]);
    const links = Array.from(root().querySelectorAll<HTMLAnchorElement>('#categorias li a'));

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/products?category=ROSTRO',
      '/products?category=OJOS_Y_CEJAS',
      '/products?category=LABIOS',
      '/products?category=LIMPIEZA',
      '/products?category=TRATAMIENTOS',
      '/products?category=HIDRATACION',
      '/products?category=PROTECCION_SOLAR',
      '/products?category=PERFUMES',
    ]);
    expect(links[1].textContent).toContain('Ojos y cejas');
    expect(root().textContent).not.toContain('OJOS_Y_CEJAS');
  });

  it('degrades a missing category illustration to its gradient tile', () => {
    flushProducts([]);
    const tile = () => root().querySelector<HTMLAnchorElement>('#categorias li a')!;
    tile().querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(tile().querySelector('img')).toBeNull();
    expect(tile().querySelector('span')?.getAttribute('style')).toContain('linear-gradient');
  });

  it('routes every call to action to existing storefront pages', () => {
    flushProducts([]);
    const links = hrefs(root());

    expect(links.filter((href) => href === '/products').length).toBeGreaterThanOrEqual(3);
    expect(links).toContain('#categorias');
    expect(links).toContain('/products?category=LIMPIEZA');
    for (const href of links) {
      expect(href).toMatch(/^(\/products(\?category=[A-Z_]+)?|#categorias|\/product\/.+)$/);
    }
  });

  it('carries no leftover apparel copy', () => {
    flushProducts([]);
    expect(root().textContent).not.toMatch(/ProWear|camisa|polo|prenda|bordado|uniforme/i);
  });

  it('has no detectable structural AXE violations', async () => {
    flushProducts([product('a'), product('b', { images: [] })]);
    const result = await axe.run(root(), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((item) => item.id)).toEqual([]);
  });
});
