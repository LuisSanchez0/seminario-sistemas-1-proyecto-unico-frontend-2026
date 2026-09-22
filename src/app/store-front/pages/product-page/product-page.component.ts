import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../products/services/product.service';
import {
  Category,
  Product,
  ProductSize,
  Size,
} from '../../../products/interfaces/product.interface';
import { ProductImagePipe } from '../../../products/pipes/product-image.pipe';
import { ProductCarouselComponent } from '../../../products/components/product-carousel/product-carousel.component';
import {
  GORRA_PLACEMENT_OPTIONS,
  LogoPlacementSelectorComponent,
  NO_LOGO_VALUE,
  PLACEMENT_OPTIONS,
  PlacementOption,
} from '../../components/logo-placement-selector/logo-placement-selector.component';
import { LogoUploadFieldComponent } from '../../components/logo-upload-field/logo-upload-field.component';
import {
  fileToBase64,
  StoreFront,
} from '../../services/store-front';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-product-page',
  standalone: true,
  templateUrl: './product-page.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProductImagePipe,
    ProductCarouselComponent,
    LogoPlacementSelectorComponent,
    LogoUploadFieldComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProductPageComponent {

  selectedSize = signal<ProductSize | null>(null);

  readonly logoLocation = signal<string>(NO_LOGO_VALUE);

  readonly specialInstructions = signal<string>('');

  readonly logoPreviewUrl = signal<string | null>(null);

  readonly NO_LOGO = NO_LOGO_VALUE;

  readonly requiresLogoUpload = computed(
    () => this.logoLocation() !== NO_LOGO_VALUE
  );

  // ── Gorra detection ────────────────────────────────────────────────────────

  readonly isGorra = computed(() => {
    const p = this.product();
    if (!p) return false;
    const normalized = (p.category as string)?.trim().toLowerCase();
    return normalized === Category.Gorra.toLowerCase();
  });

  // ── Filtered sizes for display (gorra → only TALLA UNICA) ─────────────────

  readonly displayedSizes = computed((): ProductSize[] => {
    const p = this.product();
    if (!p?.sizes?.length) return [];
    if (this.isGorra()) {
      const tallaUnica = p.sizes.find((s) => s.size === Size.TallaUnica);
      return tallaUnica ? [tallaUnica] : [];
    }
    return p.sizes;
  });

  // ── Logo placement options (gorra → only CENTER + NO_LOGO) ────────────────

  readonly gorraLogoOptions = computed((): PlacementOption[] =>
    this.isGorra() ? GORRA_PLACEMENT_OPTIONS : PLACEMENT_OPTIONS
  );

  /**
   * Remaining stock available for the selected size, accounting for units
   * already reserved across ALL cart lines with the same product + size
   * (regardless of logoLocation).
   */
  readonly remainingStock = computed(() => {
    const size = this.selectedSize();
    const p = this.product();
    if (!size || !p || size.stock <= 0) return 0;
    const reserved = this.cartStore.getReservedQuantity(p._id, size.size);
    return Math.max(0, size.stock - reserved);
  });

  readonly hasSizes = computed(() => this.displayedSizes().length > 0);

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartStore = inject(StoreFront);
  private readonly notifications = inject(NotificationService);

  private readonly productIdSlug =
    this.activatedRoute.snapshot.params['idSlug'];

  readonly productResource = rxResource<Product | null, { idSlug: string }>({
    params: () => ({ idSlug: this.productIdSlug }),
    stream: ({ params }) =>
      this.productService.getProductBySlug(params.idSlug),
    defaultValue: null,
  });

  readonly product = computed<Product | null>(() => this.productResource.value() ?? null);

  readonly form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      size: [null, Validators.required],
      quantity: [
        { value: 1, disabled: true },
        [Validators.required, Validators.min(1)],
      ],
      logoLocation: [NO_LOGO_VALUE, Validators.required],
      logoFile: [null],
    });

    this.setupLogoValidation();
    this.setupSizeListener();
    this.setupProductEffect();
    this.setupRemainingStockEffect();
  }

  private setupLogoValidation(): void {
    this.form.get('logoLocation')!.valueChanges.subscribe((value: string) => {
      this.logoLocation.set(value);

      if (value === NO_LOGO_VALUE) {
        this.form.get('logoFile')!.setValue(null, { emitEvent: false });
        this.logoPreviewUrl.set(null);
      }
    });

    this.form.get('logoFile')!.valueChanges.subscribe((file: File | null) => {
      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          this.logoPreviewUrl.set(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.logoPreviewUrl.set(null);
      }
    });

    effect(() => {
      const logoFileCtrl = this.form.get('logoFile')!;

      if (this.requiresLogoUpload()) {
        logoFileCtrl.setValidators([Validators.required]);
      } else {
        logoFileCtrl.clearValidators();
      }

      logoFileCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  private setupSizeListener(): void {
    const sizeCtrl = this.form.get('size')!;
    const quantityCtrl = this.form.get('quantity')!;

    sizeCtrl.valueChanges.subscribe((sizeValue: string | null) => {
      const p = this.product();

      if (!p || !sizeValue) {
        this.selectedSize.set(null);
        quantityCtrl.disable();
        quantityCtrl.setValue(1);
        return;
      }

      const sizeObj =
        p.sizes?.find((s: ProductSize) => s.size === sizeValue) ?? null;
      this.selectedSize.set(sizeObj);

      if (!sizeObj || sizeObj.stock <= 0) {
        quantityCtrl.disable();
        quantityCtrl.setValue(1);
        return;
      }

      quantityCtrl.setValidators([Validators.required, Validators.min(1)]);
      quantityCtrl.updateValueAndValidity({ emitEvent: false });
      quantityCtrl.enable();
      quantityCtrl.setValue(1);
    });
  }

  /**
   * Keeps the quantity form validator's max in sync with remainingStock.
   */
  private setupRemainingStockEffect(): void {
    effect(() => {
      const remaining = this.remainingStock();
      const quantityCtrl = this.form.get('quantity')!;

      if (!quantityCtrl.enabled) return;

      if (remaining > 0) {
        quantityCtrl.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(remaining),
        ]);
      } else {
        quantityCtrl.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(0),
        ]);
      }

      quantityCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  private setupProductEffect(): void {
    const sizeCtrl = this.form.get('size')!;
    const quantityCtrl = this.form.get('quantity')!;
    const logoLocationCtrl = this.form.get('logoLocation')!;

    effect(() => {
      const p = this.product();
      if (!p) return;

      const isGorra = this.isGorra();

      if (this.hasSizes()) {
        sizeCtrl.enable();

        if (isGorra) {
          // Gorras use only TALLA UNICA
          const tallaUnica =
            p.sizes?.find((s: ProductSize) => s.size === Size.TallaUnica) ??
            null;

          sizeCtrl.setValue(Size.TallaUnica);

          if (!tallaUnica || tallaUnica.stock <= 0) {
            quantityCtrl.disable();
            quantityCtrl.setValue(1);
          }
        } else {
          const firstAvailableSize =
            p.sizes?.find((s: ProductSize) => s.stock > 0) ?? null;

          if (firstAvailableSize) {
            sizeCtrl.setValue(firstAvailableSize.size);
          } else {
            sizeCtrl.setValue(null);
            quantityCtrl.disable();
            this.selectedSize.set(null);
            quantityCtrl.setValue(1);
          }
        }
      } else {
        sizeCtrl.disable();
        this.selectedSize.set(null);
        quantityCtrl.enable();
        quantityCtrl.setValidators([Validators.required, Validators.min(1)]);
        quantityCtrl.updateValueAndValidity();
        quantityCtrl.setValue(1);
      }

      // ── Reset logo location when switching product categories ──────────────
      const currentLogoLoc = logoLocationCtrl.value as string;
      const gorraValues = GORRA_PLACEMENT_OPTIONS.map((o) => o.value);

      if (isGorra && !gorraValues.includes(currentLogoLoc)) {
        // Clothing placement selected → reset to no-logo for gorra
        logoLocationCtrl.setValue(NO_LOGO_VALUE);
        this.logoLocation.set(NO_LOGO_VALUE);
        this.form.get('logoFile')!.setValue(null, { emitEvent: false });
        this.logoPreviewUrl.set(null);
      } else if (!isGorra && currentLogoLoc === 'centro-gorra') {
        // Coming from a gorra → reset cap placement to no-logo
        logoLocationCtrl.setValue(NO_LOGO_VALUE);
        this.logoLocation.set(NO_LOGO_VALUE);
        this.form.get('logoFile')!.setValue(null, { emitEvent: false });
        this.logoPreviewUrl.set(null);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const p = this.product();
    if (!p) return;

    const { size, quantity, logoLocation, logoFile } = this.form.getRawValue();

    let imgLogo: string | null = null;
    if (logoFile instanceof File) {
      imgLogo = await fileToBase64(logoFile);
    }

    const stockForSize = this.selectedSize()?.stock ?? null;

    const result = this.cartStore.addToCart({
      product: {
        _id: p._id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        imageUrl: p.images?.[0]?.url ?? '',
      },
      size: size ?? 'no-size',
      quantity,
      logoLocation,
      imgLogo,
      stockForSize,
      specialInstructions: this.specialInstructions().trim(),
    });

    if (!result.success) {
      const sizeLabel = size ?? 'única';
      const available = result.available;
      this.notifications.error(
        'Stock insuficiente',
        available > 0
          ? `Solo puedes agregar ${available} unidad${available === 1 ? '' : 'es'} más para la talla ${sizeLabel}.`
          : `Has llegado al límite de stock disponible para la talla ${sizeLabel}.`
      );
      return;
    }

    this.notifications.success(
      `${p.title} agregado al carrito`,
      `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} · Talla ${size ?? 'única'}`
    );
  }
}
