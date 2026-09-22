import axe from 'axe-core';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ProductDetailsComponent } from './product-details.component';
import { ProductCarouselComponent } from '../../../../products/components/product-carousel/product-carousel.component';
import { Product } from '../../../../products/interfaces/product.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'product-carousel',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CarouselStub {
  images = input.required<string[]>();
}
const url = environment.baseUrl;
const brand = { id: '000000000000000000000003', name: 'Maybelline', slug: 'maybelline' };
const subcategory = {
  id: '000000000000000000000002',
  name: 'Base',
  slug: 'base',
  category: 'ROSTRO' as const,
};
const product: Product = {
  id: '000000000000000000000001',
  title: 'Fit Me Matte',
  description: 'Base líquida de acabado mate',
  slug: 'fit-me-matte',
  price: 85,
  stock: 15,
  category: 'ROSTRO',
  brand,
  subcategory,
  images: [],
};

describe('ProductDetails cosmetics workflow', () => {
  let fixture: ComponentFixture<ProductDetailsComponent>;
  let component: ProductDetailsComponent;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideComponent(ProductDetailsComponent, {
        remove: { imports: [ProductCarouselComponent] },
        add: { imports: [CarouselStub] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(ProductDetailsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());
  async function start(edit = true) {
    if (edit) fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [brand] });
    if (edit)
      http
        .expectOne(`${url}/subcategories/category/ROSTRO`)
        .flush({ ok: true, subcategories: [subcategory] });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('has no detectable WCAG A/AA structural accessibility violations', async () => {
    await start();
    const result = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });

  it('initializes populated edit values as IDs and waits for matching subcategories', async () => {
    await start();
    expect(component.productForm.getRawValue().brand).toBe(brand.id);
    expect(component.productForm.getRawValue().subcategory).toBe(subcategory.id);
    expect(component.canSave()).toBe(true);
    expect(component.productForm.controls.slug.value).toBe('fit-me-matte');
  });

  it('clears selection immediately and cancels stale requests on category changes', async () => {
    await start();
    component.productForm.controls.category.setValue('LABIOS');
    expect(component.productForm.controls.subcategory.value).toBe('');
    expect(component.canSave()).toBe(false);
    fixture.detectChanges();
    const old = http.expectOne(`${url}/subcategories/category/LABIOS`);
    component.productForm.controls.category.setValue('OJOS_Y_CEJAS');
    fixture.detectChanges();
    expect(old.cancelled).toBe(true);
    http
      .expectOne(`${url}/subcategories/category/OJOS_Y_CEJAS`)
      .flush({ ok: true, subcategories: [] });
    await fixture.whenStable();
    expect(component.canSave()).toBe(false);
  });

  it('creates with numeric stock/price and ID payload, without image or clothing fields', async () => {
    await start(false);
    component.productForm.patchValue({
      title: product.title,
      description: product.description,
      price: 85,
      stock: 15,
      category: 'ROSTRO',
      brand: brand.id,
    });
    fixture.detectChanges();
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ ok: true, subcategories: [subcategory] });
    await fixture.whenStable();
    component.chooseSubcategory(subcategory.id);
    const save = component.onSubmit();
    const request = http.expectOne(`${url}/products`);
    expect(request.request.body).toEqual({
      title: product.title,
      description: product.description,
      slug: product.slug,
      price: 85,
      stock: 15,
      category: 'ROSTRO',
      brand: brand.id,
      subcategory: subcategory.id,
    });
    request.flush({ ok: true, ...product });
    await save;
    expect(component.productId()).toBe(product.id);
  });

  it('preserves manually edited slugs and accepts zero inventory', async () => {
    await start(false);
    component.productForm.controls.title.setValue('Hidratación + Rostro');
    expect(component.productForm.controls.slug.value).toBe('hidratacion-rostro');
    component.productForm.controls.slug.setValue('mi-slug');
    component.productForm.controls.slug.markAsDirty();
    component.productForm.controls.title.setValue('Otro producto');
    expect(component.productForm.controls.slug.value).toBe('mi-slug');
    expect(component.productForm.controls.stock.valid).toBe(true);
  });

  it('reloads and auto-selects inline creations, preserving product data', async () => {
    await start();
    const addedBrand = { id: '000000000000000000000004', name: 'Rare Beauty', slug: 'rare-beauty' };
    component.catalogChanged({ kind: 'brand', action: 'created', item: addedBrand });
    fixture.detectChanges();
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [brand, addedBrand] });
    await fixture.whenStable();
    const addedSubcategory = {
      ...subcategory,
      id: '000000000000000000000005',
      name: 'Iluminador',
      slug: 'iluminador',
    };
    component.catalogChanged({ kind: 'subcategory', action: 'created', item: addedSubcategory });
    fixture.detectChanges();
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ ok: true, subcategories: [subcategory, addedSubcategory] });
    await fixture.whenStable();
    expect(component.productForm.controls.brand.value).toBe(addedBrand.id);
    expect(component.productForm.controls.subcategory.value).toBe(addedSubcategory.id);
    expect(component.productForm.controls.title.value).toBe(product.title);
    expect(component.canSave()).toBe(true);
    component.catalogChanged({ kind: 'brand', action: 'deleted', item: addedBrand });
    fixture.detectChanges();
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [brand] });
    await fixture.whenStable();
    expect(component.productForm.controls.brand.value).toBe('');
  });

  it('retains the created id on image failure and retries with PATCH, never another POST', async () => {
    await start(false);
    component.productForm.patchValue({
      title: product.title,
      description: product.description,
      price: 85,
      stock: 15,
      category: 'ROSTRO',
      brand: brand.id,
    });
    fixture.detectChanges();
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ ok: true, subcategories: [subcategory] });
    await fixture.whenStable();
    component.chooseSubcategory(subcategory.id);
    const file = new File(['x'], 'image.png', { type: 'image/png' });
    component.pendingImages.set([{ file, url: 'blob:preview' }]);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override revokeObjectURL = vi.fn();
      },
    );
    const first = component.onSubmit();
    http.expectOne(`${url}/products`).flush({ ok: true, ...product });
    await Promise.resolve();
    http
      .expectOne(`${url}/upload/products/${product.id}`)
      .flush({ msg: 'No se pudo subir' }, { status: 400, statusText: 'Bad Request' });
    await first;
    expect(component.productId()).toBe(product.id);
    expect(component.pendingImages()).toHaveLength(1);
    expect(component.saveError()).toContain('No se pudo subir');
    const retry = component.onSubmit();
    const patch = http.expectOne(`${url}/products/${product.id}`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ ok: true, ...product });
    await Promise.resolve();
    http.expectOne(`${url}/upload/products/${product.id}`).flush({
      ok: true,
      model: { ...product, images: [{ key: 'key', url: 'https://example.com/image.png' }] },
    });
    await retry;
    expect(component.pendingImages()).toHaveLength(0);
    expect(component.currentImages()).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it('deletes a confirmed image by key and preserves it if the server rejects deletion', async () => {
    await start();
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
    const image = { key: 'product/image-key', url: 'https://example.com/image.png' };
    component.currentImages.set([image]);
    component.askDeleteImage(image);
    http.expectNone(`${url}/upload/products/${product.id}`);
    const rejected = component.deleteImage();
    const first = http.expectOne(`${url}/upload/products/${product.id}`);
    expect(first.request.body).toEqual({ key: image.key });
    first.flush({ msg: 'Imagen no disponible' }, { status: 404, statusText: 'Not Found' });
    await rejected;
    expect(component.currentImages()).toEqual([image]);
    expect(component.imageError()).toBe('Imagen no disponible');
    const success = component.deleteImage();
    http.expectOne(`${url}/upload/products/${product.id}`).flush({ ok: true });
    await success;
    expect(component.currentImages()).toEqual([]);
  });

  it('renders server catalog errors and keeps save disabled', async () => {
    fixture.detectChanges();
    http
      .expectOne(`${url}/brands`)
      .flush({ msg: 'Sesión inválida' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sesión inválida');
    expect(component.canSave()).toBe(false);
  });
});
