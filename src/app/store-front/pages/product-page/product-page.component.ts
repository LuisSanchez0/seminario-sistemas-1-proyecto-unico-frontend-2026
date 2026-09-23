import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, map, merge, Subject, switchMap, tap } from 'rxjs';
import { ProductService } from '../../../products/services/product.service';
import { Product, categoryLabel } from '../../../products/interfaces/product.interface';
import { ProductCarouselComponent } from '../../../products/components/product-carousel/product-carousel.component';
import { StoreFront } from '../../services/store-front';
import {
  NotificationService,
  apiErrorMessage,
} from '../../../shared/services/notification.service';

@Component({
  selector: 'app-product-page',
  templateUrl: './product-page.component.html',
  imports: [CurrencyPipe, ReactiveFormsModule, ProductCarouselComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartStore = inject(StoreFront);
  private readonly notifications = inject(NotificationService);
  private readonly retry = new Subject<void>();
  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly adding = signal(false);
  readonly categoryLabel = categoryLabel;
  readonly images = computed(() => this.product()?.images.map((image) => image.url) ?? []);
  readonly remainingStock = computed(() => {
    const product = this.product();
    // Same rule the cart uses, so both pages agree on what is still addable.
    return product ? this.cartStore.availableToAdd(product.id, product.stock) : 0;
  });
  readonly quantityControl = new FormControl(1, { nonNullable: true });
  readonly form = new FormGroup({ quantity: this.quantityControl });
  readonly quantity = toSignal(this.quantityControl.valueChanges, { initialValue: 1 });
  readonly canAdd = computed(
    () =>
      !!this.product() &&
      !this.loading() &&
      !this.adding() &&
      Number.isInteger(this.quantity()) &&
      this.quantity() >= 1 &&
      this.quantity() <= this.remainingStock(),
  );

  constructor() {
    merge(this.route.paramMap, this.retry.pipe(map(() => this.route.snapshot.paramMap)))
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.error.set(null);
          this.product.set(null);
          this.quantityControl.setValue(1);
          return this.productService.getProductBySlug(params.get('idSlug') ?? '').pipe(
            tap((product) => this.product.set(product)),
            catchError((error: unknown) => {
              const message = apiErrorMessage(error);
              this.error.set(message);
              this.notifications.error('No se pudo cargar el producto', message);
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
    effect(() => {
      const stock = this.remainingStock();
      untracked(() => {
        this.quantityControl.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(stock),
          Validators.pattern(/^\d+$/),
        ]);
        if (stock > 0) this.quantityControl.enable({ emitEvent: false });
        else this.quantityControl.disable({ emitEvent: false });
        this.setQuantity(this.quantityControl.value);
      });
    });
  }

  setQuantity(value: number): void {
    const max = this.remainingStock();
    this.quantityControl.setValue(
      max > 0 ? Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : 1, 1), max) : 0,
    );
  }
  reload(): void {
    this.retry.next();
  }

  onSubmit(): void {
    const product = this.product();
    if (!product || !this.canAdd() || this.form.invalid) return;
    this.adding.set(true);
    try {
      const quantity = this.quantityControl.value;
      const result = this.cartStore.addToCart({
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          brand: product.brand?.name,
          imageUrl: product.images[0]?.url ?? '/images/product-placeholder.svg',
        },
        quantity,
      });
      if (!result.success) {
        this.notifications.error(
          'Stock insuficiente',
          `Puedes agregar ${result.available} unidades más.`,
        );
        return;
      }
      this.notifications.success(
        `${product.title} agregado al carrito`,
        `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`,
      );
      this.setQuantity(1);
    } finally {
      this.adding.set(false);
    }
  }
}
