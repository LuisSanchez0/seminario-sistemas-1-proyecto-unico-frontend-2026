import axe from 'axe-core';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ProductDetailsComponent } from './product-details.component';
import { ProductCarouselComponent } from '../../../../products/components/product-carousel/product-carousel.component';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Image, Product } from '../../../../products/interfaces/product.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'product-carousel',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CarouselStub {
  images = input.required<string[]>();
  productTitle = input('Producto');
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

  it('keeps the inventory and reorder controls free of WCAG A/AA violations', async () => {
    fixture.componentRef.setInput('product', {
      ...product,
      images: [
        { key: 'a', url: 'https://example.com/a.png' },
        { key: 'b', url: 'https://example.com/b.png' },
      ],
    });
    fixture.detectChanges();
    http.expectOne(`${url}/brands`).flush({ ok: true, brands: [brand] });
    http
      .expectOne(`${url}/subcategories/category/ROSTRO`)
      .flush({ ok: true, subcategories: [subcategory] });
    await fixture.whenStable();
    component.moveImage(0, 1);
    fixture.detectChanges();
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

  describe('inventory entries', () => {
    function stubDialog() {
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
    }

    it('adds to the current stock instead of replacing it', async () => {
      await start();
      stubDialog();
      expect(component.stockCount()).toBe(15);
      component.openAddStock();
      component.stockForm.controls.quantity.setValue(5);
      fixture.detectChanges();
      expect(component.projectedStock()).toBe(20);
      const added = component.addStock();
      // Re-reads server stock, then writes the computed absolute value.
      const read = http.expectOne(`${url}/products/${product.id}`);
      expect(read.request.method).toBe('GET');
      read.flush({ ok: true, ...product, stock: 15 });
      await Promise.resolve();
      const patch = http.expectOne(`${url}/products/${product.id}`);
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toEqual({ stock: 20 });
      patch.flush({ ok: true, ...product, stock: 20 });
      await added;
      expect(component.stockCount()).toBe(20);
      expect(component.stockForm.controls.quantity.value).toBeNull();
    });

    it('keeps accumulating on a second entry', async () => {
      await start();
      stubDialog();
      component.productForm.controls.stock.setValue(20);
      component.openAddStock();
      component.stockForm.controls.quantity.setValue(3);
      fixture.detectChanges();
      expect(component.projectedStock()).toBe(23);
      const added = component.addStock();
      http.expectOne(`${url}/products/${product.id}`).flush({ ok: true, ...product, stock: 20 });
      await Promise.resolve();
      const patch = http.expectOne(`${url}/products/${product.id}`);
      expect(patch.request.body).toEqual({ stock: 23 });
      patch.flush({ ok: true, ...product, stock: 23 });
      await added;
      expect(component.stockCount()).toBe(23);
    });

    it('rejects zero, negative, fractional and empty amounts', async () => {
      await start();
      for (const value of [0, -1, 1.5, null]) {
        component.stockForm.controls.quantity.setValue(value);
        expect(component.stockForm.valid).toBe(false);
        expect(component.canAddStock()).toBe(false);
      }
      component.stockForm.controls.quantity.setValue(2);
      expect(component.canAddStock()).toBe(true);
    });

    it('ignores a second submit while a request is in flight', async () => {
      await start();
      stubDialog();
      component.openAddStock();
      component.stockForm.controls.quantity.setValue(5);
      const added = component.addStock();
      expect(component.canAddStock()).toBe(false);
      // A double click must not queue a second increment.
      await component.addStock();
      http.expectOne(`${url}/products/${product.id}`).flush({ ok: true, ...product, stock: 15 });
      await Promise.resolve();
      const patch = http.expectOne(`${url}/products/${product.id}`);
      patch.flush({ ok: true, ...product, stock: 20 });
      await added;
      expect(component.stockCount()).toBe(20);
    });

    it('keeps the dialog and the typed amount when the server rejects the entry', async () => {
      await start();
      stubDialog();
      component.openAddStock();
      component.stockForm.controls.quantity.setValue(5);
      const added = component.addStock();
      http.expectOne(`${url}/products/${product.id}`).flush({ ok: true, ...product, stock: 15 });
      await Promise.resolve();
      http
        .expectOne(`${url}/products/${product.id}`)
        .flush({ msg: 'Inventario bloqueado' }, { status: 409, statusText: 'Conflict' });
      await added;
      expect(component.stockError()).toBe('Inventario bloqueado');
      expect(component.stockForm.controls.quantity.value).toBe(5);
      expect(component.stockCount()).toBe(15);
    });

    it('keeps a plain initial stock field while creating', async () => {
      await start(false);
      expect(component.isEditMode()).toBe(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#product-stock')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Agregar existencias');
    });

    it('replaces the stock input with a read-only summary while editing', async () => {
      await start();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#product-stock')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Inventario actual');
      expect(fixture.nativeElement.textContent).toContain('Agregar existencias');
    });
  });

  describe('image ordering', () => {
    const a = { key: 'a', url: 'https://example.com/a.png' };
    const b = { key: 'b', url: 'https://example.com/b.png' };
    const c = { key: 'c', url: 'https://example.com/c.png' };
    async function startWithImages() {
      fixture.componentRef.setInput('product', { ...product, images: [a, b, c] });
      fixture.detectChanges();
      http.expectOne(`${url}/brands`).flush({ ok: true, brands: [brand] });
      http
        .expectOne(`${url}/subcategories/category/ROSTRO`)
        .flush({ ok: true, subcategories: [subcategory] });
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('starts clean and marks the order dirty only after a real move', async () => {
      await startWithImages();
      expect(component.imagesOrderDirty()).toBe(false);
      component.moveImage(2, -1);
      expect(component.currentImages().map((image) => image.key)).toEqual(['a', 'c', 'b']);
      expect(component.imagesOrderDirty()).toBe(true);
    });

    it('promotes a moved image to cover and persists the submitted keys', async () => {
      await startWithImages();
      component.moveImage(2, -1);
      component.moveImage(1, -1);
      expect(component.currentImages().map((image) => image.key)).toEqual(['c', 'a', 'b']);
      const saved = component.saveImageOrder();
      const request = http.expectOne(`${url}/upload/products/${product.id}/images/order`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ keys: ['c', 'a', 'b'] });
      request.flush({ ok: true, model: { ...product, images: [c, a, b] } });
      await saved;
      expect(component.imagesOrderDirty()).toBe(false);
      expect(component.imagesBaseline().map((image) => image.key)).toEqual(['c', 'a', 'b']);
    });

    it('restores the persisted order on discard without any request', async () => {
      await startWithImages();
      component.moveImage(0, 1);
      expect(component.imagesOrderDirty()).toBe(true);
      component.discardImageOrder();
      expect(component.currentImages().map((image) => image.key)).toEqual(['a', 'b', 'c']);
      expect(component.imagesOrderDirty()).toBe(false);
      http.expectNone(`${url}/upload/products/${product.id}/images/order`);
    });

    it('keeps the local order and stays dirty when the server rejects it', async () => {
      await startWithImages();
      component.moveImage(0, 1);
      const saved = component.saveImageOrder();
      http
        .expectOne(`${url}/upload/products/${product.id}/images/order`)
        .flush({ msg: 'Orden inválido' }, { status: 400, statusText: 'Bad Request' });
      await saved;
      expect(component.imageOrderError()).toBe('Orden inválido');
      expect(component.currentImages().map((image) => image.key)).toEqual(['b', 'a', 'c']);
      expect(component.imagesOrderDirty()).toBe(true);
    });

    it('falls back to an order-specific message when the server sends no msg', async () => {
      await startWithImages();
      component.moveImage(0, 1);
      const saved = component.saveImageOrder();
      http
        .expectOne(`${url}/upload/products/${product.id}/images/order`)
        .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
      await saved;
      expect(component.imageOrderError()).toBe('No se pudo guardar el orden de las imágenes.');
      expect(component.currentImages().map((image) => image.key)).toEqual(['b', 'a', 'c']);
    });

    it('will not move past either boundary', async () => {
      await startWithImages();
      component.moveImage(0, -1);
      component.moveImage(2, 1);
      expect(component.currentImages().map((image) => image.key)).toEqual(['a', 'b', 'c']);
      expect(component.imagesOrderDirty()).toBe(false);
    });

    it('drops a deleted image from both the working order and the baseline', async () => {
      await startWithImages();
      Object.defineProperty(HTMLDialogElement.prototype, 'close', {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = false;
        },
      });
      component.moveImage(0, 1);
      component.imageToDelete.set(a);
      const removed = component.deleteImage();
      http.expectOne(`${url}/upload/products/${product.id}`).flush({ ok: true });
      await removed;
      expect(component.currentImages().map((image) => image.key)).toEqual(['b', 'c']);
      expect(component.imagesBaseline().map((image) => image.key)).toEqual(['b', 'c']);
    });

    /** Minimal CdkDragDrop stand-in: `dropImage` only reads the two indices. */
    function dropEvent(previousIndex: number, currentIndex: number) {
      return { previousIndex, currentIndex } as CdkDragDrop<Image[]>;
    }

    it('drags an image one slot later', async () => {
      await startWithImages();
      component.dropImage(dropEvent(1, 2));
      expect(component.currentImages().map((image) => image.key)).toEqual(['a', 'c', 'b']);
      expect(component.imagesOrderDirty()).toBe(true);
    });

    it('drags an image to the cover slot and relabels it Portada immediately', async () => {
      await startWithImages();
      component.dropImage(dropEvent(2, 0));
      expect(component.currentImages().map((image) => image.key)).toEqual(['c', 'a', 'b']);
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('.image-reorder-list > li');
      expect(cards[0].textContent).toContain('Portada');
      expect(cards[0].querySelector('img').getAttribute('src')).toBe(c.url);
      expect(cards[1].textContent).toContain('Imagen 2');
      expect(cards[2].textContent).toContain('Imagen 3');
    });

    it('ignores a drop that lands on the same index', async () => {
      await startWithImages();
      component.dropImage(dropEvent(1, 1));
      expect(component.currentImages().map((image) => image.key)).toEqual(['a', 'b', 'c']);
      expect(component.imagesOrderDirty()).toBe(false);
    });

    it('sends the dragged key order to the reorder endpoint', async () => {
      await startWithImages();
      component.dropImage(dropEvent(2, 0));
      const saved = component.saveImageOrder();
      const request = http.expectOne(`${url}/upload/products/${product.id}/images/order`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ keys: ['c', 'a', 'b'] });
      request.flush({ ok: true, model: { ...product, images: [c, a, b] } });
      await saved;
      expect(component.imagesOrderDirty()).toBe(false);
      expect(component.currentImages().map((image) => image.key)).toEqual(['c', 'a', 'b']);
    });

    it('clears the dirty flag when a drag is undone by hand', async () => {
      await startWithImages();
      component.dropImage(dropEvent(2, 0));
      expect(component.imagesOrderDirty()).toBe(true);
      component.dropImage(dropEvent(0, 2));
      expect(component.currentImages().map((image) => image.key)).toEqual(['a', 'b', 'c']);
      expect(component.imagesOrderDirty()).toBe(false);
    });

    it('refuses to drag while an older order is still being saved', async () => {
      await startWithImages();
      component.dropImage(dropEvent(2, 0));
      const saved = component.saveImageOrder();
      const request = http.expectOne(`${url}/upload/products/${product.id}/images/order`);
      // A drag landing mid-flight must not change the array under the in-flight payload.
      component.dropImage(dropEvent(0, 2));
      expect(component.currentImages().map((image) => image.key)).toEqual(['c', 'a', 'b']);
      request.flush({ ok: true, model: { ...product, images: [c, a, b] } });
      await saved;
    });

    it('keeps pending uploads out of the drop list and the payload', async () => {
      await startWithImages();
      component.pendingImages.set([
        { file: new File(['x'], 'new.png', { type: 'image/png' }), url: 'blob:pending' },
      ]);
      fixture.detectChanges();
      const dragged = fixture.nativeElement.querySelectorAll('.image-reorder-list > li');
      expect(dragged).toHaveLength(3);
      expect(fixture.nativeElement.textContent).toContain('Pendiente de subir');
      expect(fixture.nativeElement.querySelector('.image-reorder-list').textContent).not.toContain(
        'Pendiente de subir',
      );
      component.dropImage(dropEvent(2, 0));
      const saved = component.saveImageOrder();
      const request = http.expectOne(`${url}/upload/products/${product.id}/images/order`);
      expect(request.request.body).toEqual({ keys: ['c', 'a', 'b'] });
      request.flush({ ok: true, model: { ...product, images: [c, a, b] } });
      await saved;
      expect(component.pendingImages()).toHaveLength(1);
    });

    it('hides reorder controls while creating and with a single image', async () => {
      await start(false);
      expect(component.canReorderImages()).toBe(false);
      component.currentImages.set([a]);
      expect(component.canReorderImages()).toBe(false);
    });
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
