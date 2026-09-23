import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import {
  categoryLabel,
  Image,
  Product,
  ProductCategory,
  ProductPayload,
  PRODUCT_CATEGORY_OPTIONS,
} from '../../../../products/interfaces/product.interface';
import { ProductCarouselComponent } from '../../../../products/components/product-carousel/product-carousel.component';
import { ProductService } from '../../../../products/services/product.service';
import { FormUtils } from '../../../../utils/form-utils';
import { FormErrorLabelComponent } from '../../../../shared/components/form-error-label/form-error-label.component';
import {
  NotificationService,
  apiErrorMessage,
} from '../../../../shared/services/notification.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { BrandAutocompleteComponent } from '../../../components/brand-autocomplete/brand-autocomplete.component';
import {
  CatalogChange,
  CatalogManagerComponent,
} from '../../../components/catalog-manager/catalog-manager.component';

interface PendingImage {
  file: File;
  url: string;
}

/** Stock entries are whole units; `type="number"` yields `null` for non-numeric text. */
function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value === null || value === '') return null;
  return typeof value === 'number' && Number.isInteger(value) ? null : { wholeNumber: true };
}

/** Identity of an image sequence, used to tell a reordered list from the persisted one. */
function orderKey(images: Image[]): string {
  return images.map((image) => image.key).join('|');
}

/** Reapplies a locally reordered key sequence over `images`, appending anything new. */
function applyOrder(images: Image[], keys: string[]): Image[] {
  const byKey = new Map(images.map((image) => [image.key, image]));
  const ordered = keys
    .map((key) => byKey.get(key))
    .filter((image): image is Image => image !== undefined);
  const placed = new Set(ordered.map((image) => image.key));
  return [...ordered, ...images.filter((image) => !placed.has(image.key))];
}
@Component({
  selector: 'product-details',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    ProductCarouselComponent,
    FormErrorLabelComponent,
    BrandAutocompleteComponent,
    CatalogManagerComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './product-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsComponent implements OnInit {
  product = input<Product | null>(null);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private service = inject(ProductService);
  private notifications = inject(NotificationService);
  private confirmation = viewChild.required(ConfirmDialogComponent);
  private stockDialog = viewChild.required<ElementRef<HTMLDialogElement>>('stockDialog');
  readonly categoryOptions = PRODUCT_CATEGORY_OPTIONS;
  readonly apiErrorMessage = apiErrorMessage;
  readonly productId = signal<string | null>(null);
  readonly selectedCategory = signal<ProductCategory | null>(null);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly deletingImage = signal(false);
  readonly addingStock = signal(false);
  readonly savingImageOrder = signal(false);
  readonly saveError = signal('');
  readonly imageError = signal('');
  readonly stockError = signal('');
  readonly imageOrderError = signal('');
  readonly imageToDelete = signal<Image | null>(null);
  readonly currentImages = signal<Image[]>([]);
  /** Last order known to be persisted; `currentImages` is the admin's working order. */
  readonly imagesBaseline = signal<Image[]>([]);
  readonly pendingImages = signal<PendingImage[]>([]);
  readonly imagesToCarousel = computed(() => [
    ...this.currentImages().map((image) => image.url),
    ...this.pendingImages().map((image) => image.url),
  ]);
  readonly busy = computed(
    () =>
      this.saving() ||
      this.uploading() ||
      this.deletingImage() ||
      this.addingStock() ||
      this.savingImageOrder(),
  );
  /** A product only exists server-side in edit mode, which is what both features need. */
  readonly isEditMode = computed(() => !!this.product());
  readonly productForm = this.fb.group({
    title: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(4),
      Validators.pattern(/\S/),
    ]),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(10),
      Validators.pattern(/\S/),
    ]),
    slug: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern(FormUtils.slugPattern),
    ]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    stock: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    category: this.fb.control<ProductCategory | null>(null, Validators.required),
    subcategory: this.fb.nonNullable.control('', Validators.required),
    brand: this.fb.nonNullable.control('', Validators.required),
  });
  readonly formValue = toSignal(this.productForm.valueChanges, {
    initialValue: this.productForm.getRawValue(),
  });
  /** Increment-only inventory entry; the absolute stock is never typed in edit mode. */
  readonly stockForm = this.fb.group({
    quantity: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      wholeNumber,
    ]),
  });
  private readonly stockFormValue = toSignal(this.stockForm.valueChanges, {
    initialValue: this.stockForm.getRawValue(),
  });
  readonly quantityToAdd = computed(() => {
    const value = this.stockFormValue().quantity;
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
  });
  /**
   * Derived from `quantityToAdd` rather than `stockForm.valid`: form validity is not a
   * signal, so reading it here would cache the first result and never recompute. A
   * positive whole number is exactly what required + min(1) + wholeNumber accept.
   */
  readonly canAddStock = computed(() => this.quantityToAdd() > 0 && !this.addingStock());
  private readonly brandsRevision = signal(0);
  private readonly subcategoriesRevision = signal(0);
  readonly brandsResource = rxResource({
    params: () => this.brandsRevision(),
    stream: () => this.service.getBrands(),
  });
  readonly brands = computed(() =>
    this.brandsResource.hasValue() ? this.brandsResource.value() : [],
  );
  readonly subcategoriesResource = rxResource({
    params: () => ({ category: this.selectedCategory(), revision: this.subcategoriesRevision() }),
    stream: ({ params }) =>
      params.category
        ? this.service.getSubcategoriesByCategory(params.category, params.revision > 0)
        : of([]),
  });
  readonly canSave = computed(() => {
    const value = this.formValue();
    return (
      this.productForm.valid &&
      !this.busy() &&
      !this.brandsResource.isLoading() &&
      !this.subcategoriesResource.isLoading() &&
      !this.brandsResource.error() &&
      !this.subcategoriesResource.error() &&
      !!this.brandsResource.value()?.some((brand) => brand.id === value.brand) &&
      !!this.subcategoriesResource
        .value()
        ?.some((item) => item.id === value.subcategory && item.category === value.category)
    );
  });

  readonly subcategories = computed(() =>
    this.subcategoriesResource.hasValue() ? this.subcategoriesResource.value() : [],
  );
  readonly headerTitle = computed(() => {
    const typed = this.formValue().title?.trim();
    if (typed) return typed;
    return this.productId() ? 'Producto sin nombre' : 'Nuevo producto';
  });
  readonly brandName = computed(
    () => this.brands().find((brand) => brand.id === this.formValue().brand)?.name ?? '',
  );
  readonly subcategoryName = computed(
    () => this.subcategories().find((item) => item.id === this.formValue().subcategory)?.name ?? '',
  );
  readonly categoryName = computed(() => {
    const category = this.formValue().category;
    return category ? categoryLabel(category) : '';
  });
  readonly price = computed(() => {
    const value = this.formValue().price;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
  readonly stockCount = computed(() => {
    const value = this.formValue().stock;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  });
  readonly stockLevel = computed<'out' | 'low' | 'ok'>(() => {
    const stock = this.stockCount();
    return stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';
  });
  readonly stockLabel = computed(() => {
    const level = this.stockLevel();
    return level === 'out' ? 'Sin stock' : level === 'low' ? 'Stock bajo' : 'En stock';
  });
  readonly stockHint = computed(() => {
    const level = this.stockLevel();
    if (level === 'out') return 'El producto se mostrará como agotado en la tienda.';
    if (level === 'low') return 'Quedan pocas unidades disponibles.';
    return 'Inventario suficiente para la venta.';
  });
  readonly projectedStock = computed(() => this.stockCount() + this.quantityToAdd());
  readonly productState = computed(() => this.product()?.state);
  readonly imageCount = computed(() => this.imagesToCarousel().length);
  readonly imagesOrderDirty = computed(
    () => orderKey(this.currentImages()) !== orderKey(this.imagesBaseline()),
  );
  /** Reordering needs a persisted product and at least two images to swap. */
  readonly canReorderImages = computed(() => this.isEditMode() && this.currentImages().length > 1);

  constructor() {
    this.destroyRef.onDestroy(() =>
      this.pendingImages().forEach((image) => URL.revokeObjectURL(image.url)),
    );
    this.productForm.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((category) => {
        this.productForm.controls.subcategory.setValue('');
        this.selectedCategory.set(category);
      });
    this.productForm.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe((title) => {
      if (!this.productId() && !this.productForm.controls.slug.dirty)
        this.productForm.controls.slug.setValue(FormUtils.slugify(title));
    });
  }

  ngOnInit(): void {
    const product = this.product();
    if (!product) return;
    this.productId.set(product.id);
    this.setPersistedImages(product.images);
    // Initialize the parent first without emitting a category change that clears the child.
    this.selectedCategory.set(product.category);
    this.productForm.patchValue(
      { ...product, subcategory: product.subcategory.id, brand: product.brand.id },
      { emitEvent: false },
    );
    this.productForm.updateValueAndValidity();
  }

  chooseSubcategory(id: string): void {
    this.productForm.controls.subcategory.setValue(id);
    this.productForm.controls.subcategory.markAsDirty();
  }
  chooseBrand(id: string): void {
    this.productForm.controls.brand.setValue(id);
    this.productForm.controls.brand.markAsDirty();
  }

  catalogChanged(change: CatalogChange): void {
    const control =
      change.kind === 'brand'
        ? this.productForm.controls.brand
        : this.productForm.controls.subcategory;
    if (change.action === 'deleted' && control.value === change.item.id) control.setValue('');
    if (change.kind === 'brand') {
      this.brandsRevision.update((value) => value + 1);
      if (change.action === 'created') this.chooseBrand(change.item.id);
    } else {
      this.subcategoriesRevision.update((value) => value + 1);
      if (
        change.action === 'created' &&
        'category' in change.item &&
        change.item.category === this.selectedCategory()
      )
        this.chooseSubcategory(change.item.id);
    }
  }

  async onSubmit(): Promise<void> {
    this.productForm.markAllAsTouched();
    if (!this.canSave()) return;
    const value = this.productForm.getRawValue();
    if (!value.category) return;
    const payload: ProductPayload = {
      title: value.title.trim(),
      description: value.description.trim(),
      slug: value.slug.trim(),
      price: Number(value.price),
      stock: Number(value.stock),
      category: value.category,
      subcategory: value.subcategory,
      brand: value.brand,
    };
    if (
      payload.title.length < 4 ||
      payload.description.length < 10 ||
      !Number.isFinite(payload.price) ||
      !Number.isFinite(payload.stock)
    ) {
      this.saveError.set('Revisa el nombre, la descripción, el precio y el stock.');
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    // An unsaved image order is owned by "Guardar orden", so saving fields must not drop it.
    const localOrder = this.imagesOrderDirty()
      ? this.currentImages().map((image) => image.key)
      : null;
    try {
      const id = this.productId();
      const product = await firstValueFrom(
        id ? this.service.updateProduct(id, payload) : this.service.createProduct(payload),
      );
      // Keep the persisted ID even if a later upload fails, so retry cannot create a duplicate.
      this.productId.set(product.id);
      this.setPersistedImages(product.images);
      this.saving.set(false);
      this.uploading.set(this.pendingImages().length > 0);
      for (const pending of [...this.pendingImages()]) {
        const image = await firstValueFrom(this.service.uploadImage(pending.file, product));
        this.currentImages.update((images) => [...images, image]);
        this.imagesBaseline.update((images) => [...images, image]);
        this.pendingImages.update((images) => images.filter((item) => item !== pending));
        URL.revokeObjectURL(pending.url);
      }
      if (localOrder) this.currentImages.update((images) => applyOrder(images, localOrder));
      this.service.updateProductsCache({ ...product, images: this.imagesBaseline() });
      this.productForm.markAsPristine();
      this.notifications.success(
        'Producto guardado',
        'La información y las imágenes se guardaron correctamente.',
      );
      if (!this.product())
        await this.router.navigate(['/admin/products', product.id], { replaceUrl: true });
    } catch (error) {
      const message = apiErrorMessage(error);
      this.saveError.set(
        this.uploading()
          ? `El producto está guardado. No se completó la carga de imágenes: ${message} Puedes reintentar las imágenes pendientes.`
          : message,
      );
    } finally {
      this.saving.set(false);
      this.uploading.set(false);
    }
  }

  onFilesChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.pendingImages.update((images) => [
      ...images,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    input.value = '';
  }
  removePending(image: PendingImage): void {
    URL.revokeObjectURL(image.url);
    this.pendingImages.update((images) => images.filter((item) => item !== image));
  }
  askDeleteImage(image: Image): void {
    this.imageToDelete.set(image);
    this.imageError.set('');
    this.confirmation().open();
  }
  async deleteImage(): Promise<void> {
    const image = this.imageToDelete();
    const id = this.productId();
    if (!image || !id || this.busy()) return;
    this.deletingImage.set(true);
    try {
      await firstValueFrom(this.service.deleteImage(id, image.key));
      // Drop it from both lists so a pending reorder never references a deleted image.
      const without = (images: Image[]) => images.filter((item) => item.key !== image.key);
      this.currentImages.update(without);
      this.imagesBaseline.update(without);
      this.confirmation().close();
      this.notifications.success('Imagen eliminada');
    } catch (error) {
      this.imageError.set(apiErrorMessage(error));
    } finally {
      this.deletingImage.set(false);
    }
  }

  private setPersistedImages(images: Image[]): void {
    this.currentImages.set(images);
    this.imagesBaseline.set(images);
  }

  openAddStock(): void {
    this.stockForm.reset();
    this.stockError.set('');
    this.stockDialog().nativeElement.showModal();
  }
  closeAddStock(): void {
    if (this.addingStock()) return;
    this.stockDialog().nativeElement.close();
  }
  async addStock(): Promise<void> {
    this.stockForm.markAllAsTouched();
    const id = this.productId();
    const quantity = this.quantityToAdd();
    // `busy()` also covers the in-flight request, so a second click cannot double-increment.
    if (!id || !quantity || !this.canAddStock()) return;
    this.addingStock.set(true);
    this.stockError.set('');
    try {
      const product = await firstValueFrom(this.service.addStock(id, quantity));
      // The saved product is the source of truth for the resulting inventory.
      this.productForm.controls.stock.setValue(product.stock);
      this.stockDialog().nativeElement.close();
      this.stockForm.reset();
      this.notifications.success(
        'Inventario actualizado',
        `Se agregaron ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} al inventario.`,
      );
    } catch (error) {
      // Leave the dialog open with the typed amount so the admin can retry.
      this.stockError.set(apiErrorMessage(error));
    } finally {
      this.addingStock.set(false);
    }
  }

  /**
   * Drag-and-drop reorder. Guarded by `busy()` so the working order cannot shift while an
   * older key sequence is still being persisted.
   */
  dropImage(event: CdkDragDrop<Image[]>): void {
    if (this.busy() || event.previousIndex === event.currentIndex) return;
    const reordered = [...this.currentImages()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.currentImages.set(reordered);
    this.imageOrderError.set('');
  }

  moveImage(index: number, offset: number): void {
    const images = this.currentImages();
    const target = index + offset;
    if (this.busy() || target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    this.currentImages.set(next);
    this.imageOrderError.set('');
  }
  discardImageOrder(): void {
    if (this.busy()) return;
    this.currentImages.set(this.imagesBaseline());
    this.imageOrderError.set('');
  }
  async saveImageOrder(): Promise<void> {
    const id = this.productId();
    if (!id || !this.imagesOrderDirty() || this.busy()) return;
    this.savingImageOrder.set(true);
    this.imageOrderError.set('');
    try {
      const keys = this.currentImages().map((image) => image.key);
      const images = await firstValueFrom(this.service.reorderProductImages(id, keys));
      this.setPersistedImages(images);
      this.notifications.success('Orden de imágenes actualizado');
    } catch (error) {
      // Keep the local order: the admin keeps their arrangement and can retry.
      this.imageOrderError.set(
        apiErrorMessage(error, 'No se pudo guardar el orden de las imágenes.'),
      );
    } finally {
      this.savingImageOrder.set(false);
    }
  }
}
