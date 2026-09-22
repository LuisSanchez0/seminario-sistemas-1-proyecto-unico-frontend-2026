import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
@Component({
  selector: 'product-details',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
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
  readonly categoryOptions = PRODUCT_CATEGORY_OPTIONS;
  readonly apiErrorMessage = apiErrorMessage;
  readonly productId = signal<string | null>(null);
  readonly selectedCategory = signal<ProductCategory | null>(null);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly deletingImage = signal(false);
  readonly saveError = signal('');
  readonly imageError = signal('');
  readonly imageToDelete = signal<Image | null>(null);
  readonly currentImages = signal<Image[]>([]);
  readonly pendingImages = signal<PendingImage[]>([]);
  readonly imagesToCarousel = computed(() => [
    ...this.currentImages().map((image) => image.url),
    ...this.pendingImages().map((image) => image.url),
  ]);
  readonly busy = computed(() => this.saving() || this.uploading() || this.deletingImage());
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
  readonly productState = computed(() => this.product()?.state);
  readonly imageCount = computed(() => this.imagesToCarousel().length);

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
    this.currentImages.set(product.images);
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
    try {
      const id = this.productId();
      const product = await firstValueFrom(
        id ? this.service.updateProduct(id, payload) : this.service.createProduct(payload),
      );
      // Keep the persisted ID even if a later upload fails, so retry cannot create a duplicate.
      this.productId.set(product.id);
      this.currentImages.set(product.images);
      this.saving.set(false);
      this.uploading.set(this.pendingImages().length > 0);
      for (const pending of [...this.pendingImages()]) {
        const image = await firstValueFrom(this.service.uploadImage(pending.file, product));
        this.currentImages.update((images) => [...images, image]);
        this.pendingImages.update((images) => images.filter((item) => item !== pending));
        URL.revokeObjectURL(pending.url);
      }
      this.service.updateProductsCache({ ...product, images: this.currentImages() });
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
      this.currentImages.update((images) => images.filter((item) => item.key !== image.key));
      this.confirmation().close();
      this.notifications.success('Imagen eliminada');
    } catch (error) {
      this.imageError.set(apiErrorMessage(error));
    } finally {
      this.deletingImage.set(false);
    }
  }
}
