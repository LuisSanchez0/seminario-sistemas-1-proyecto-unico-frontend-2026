import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import {
  ProductCategory,
  ProductSubcategory,
} from '../../../products/interfaces/product.interface';
import { NavbarComponent } from './navbar.component';

const url = (category: ProductCategory) =>
  `${environment.baseUrl}/subcategories/category/${category}`;

const subcategory = (id: string, name: string, category: ProductCategory): ProductSubcategory => ({
  id,
  name,
  slug: name.toLowerCase(),
  category,
});

describe('NavbarComponent cosmetics navigation', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let http: HttpTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Drain anything the auth/cart services may have queued; the assertions below
    // are explicit about the subcategory traffic they expect.
    http.match(() => true).forEach((request) => request.flush({}));
    http.verify();
  });

  const openMenu = () => {
    component.toggleProductsMenu();
    fixture.detectChanges();
  };

  it('exposes the eight canonical categories with display labels only', () => {
    expect(component.categories.map((item) => item.value)).toEqual([
      'ROSTRO',
      'OJOS_Y_CEJAS',
      'LABIOS',
      'LIMPIEZA',
      'TRATAMIENTOS',
      'HIDRATACION',
      'PROTECCION_SOLAR',
      'PERFUMES',
    ]);

    openMenu();
    expect(text()).toContain('Ojos y cejas');
    expect(text()).toContain('Protección solar');
    expect(text()).not.toContain('OJOS_Y_CEJAS');
    expect(text()).not.toContain('PROTECCION_SOLAR');
  });

  it('loads only the default category when the mega menu opens', () => {
    openMenu();

    http.expectOne(url('ROSTRO')).flush({
      ok: true,
      subcategories: [subcategory('abc123', 'Base', 'ROSTRO')],
    });
    http.expectNone(url('LABIOS'));

    fixture.detectChanges();
    expect(text()).toContain('Base');
  });

  it('fetches a newly selected category and drops the previous one from the panel', () => {
    openMenu();
    http.expectOne(url('ROSTRO')).flush({
      ok: true,
      subcategories: [subcategory('abc123', 'Base', 'ROSTRO')],
    });
    fixture.detectChanges();

    component.previewCategory('LABIOS');
    fixture.detectChanges();
    http.expectOne(url('LABIOS')).flush({
      ok: true,
      subcategories: [subcategory('lip1', 'Labiales', 'LABIOS')],
    });
    fixture.detectChanges();

    expect(text()).toContain('Labiales');
    expect(component.activeSubcategories()).toEqual([subcategory('lip1', 'Labiales', 'LABIOS')]);
  });

  it('serves an already loaded category from cache without a second request', () => {
    openMenu();
    http.expectOne(url('ROSTRO')).flush({
      ok: true,
      subcategories: [subcategory('abc123', 'Base', 'ROSTRO')],
    });

    component.previewCategory('LABIOS');
    http.expectOne(url('LABIOS')).flush({ ok: true, subcategories: [] });

    component.previewCategory('ROSTRO');
    http.expectNone(url('ROSTRO'));
    expect(component.subcategoriesOf('ROSTRO')).toHaveLength(1);
  });

  it('shows an empty state and still offers the parent category', () => {
    openMenu();
    http.expectOne(url('ROSTRO')).flush({ ok: true, subcategories: [] });
    fixture.detectChanges();

    expect(text()).toContain('Explora todos los productos de Rostro');
    expect(text()).toContain('Ver todo Rostro');
  });

  it('survives a failed subcategory lookup and keeps the parent navigable', () => {
    openMenu();
    http.expectOne(url('ROSTRO')).error(new ProgressEvent('network error'));
    fixture.detectChanges();

    expect(component.hasFailed('ROSTRO')).toBe(true);
    expect(component.isLoading('ROSTRO')).toBe(false);
    expect(text()).toContain('No se pudieron cargar las subcategorías.');
    expect(text()).toContain('Ver todo Rostro');
  });

  it('links subcategories by Mongo id and parent categories without a subcategory', () => {
    openMenu();
    http.expectOne(url('ROSTRO')).flush({
      ok: true,
      subcategories: [subcategory('abc123', 'Base', 'ROSTRO')],
    });
    fixture.detectChanges();

    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a[href]'),
    ).map((anchor) => anchor.getAttribute('href'));

    expect(hrefs).toContain('/products?category=ROSTRO&subcategory=abc123');
    expect(hrefs).toContain('/products?category=ROSTRO');
    expect(hrefs.some((href) => href?.includes('subcategory=Base'))).toBe(false);
    expect(hrefs.some((href) => href?.includes('gender'))).toBe(false);
  });

  it('closes the mega menu on Escape', () => {
    openMenu();
    expect(component.productsMenuOpen()).toBe(true);

    component.onEscape();
    fixture.detectChanges();
    expect(component.productsMenuOpen()).toBe(false);
  });

  it('expands and collapses a mobile category without hover', () => {
    component.toggleExpandedCategory('PERFUMES');
    fixture.detectChanges();
    http.expectOne(url('PERFUMES')).flush({
      ok: true,
      subcategories: [subcategory('per1', 'Fragancias', 'PERFUMES')],
    });
    fixture.detectChanges();

    expect(component.expandedCategory()).toBe('PERFUMES');
    expect(text()).toContain('Fragancias');

    component.toggleExpandedCategory('PERFUMES');
    expect(component.expandedCategory()).toBeNull();
  });
});
