import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, of } from 'rxjs';
import { ProductTableComponent } from '../../components/product-table/product-table.component';
import { ProductService } from '../../../products/services/product.service';
import {
  Product,
  ProductCategory,
  PRODUCT_CATEGORY_OPTIONS,
} from '../../../products/interfaces/product.interface';
import { PaginationService } from '../../../shared/components/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination/pagination.component';
import { BrandAutocompleteComponent } from '../../components/brand-autocomplete/brand-autocomplete.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  apiErrorMessage,
  NotificationService,
} from '../../../shared/services/notification.service';

@Component({
  selector: 'app-products-admin-page',
  imports: [
    ProductTableComponent,
    PaginationComponent,
    RouterLink,
    BrandAutocompleteComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './products-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsAdminPageComponent {
  private service = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notifications = inject(NotificationService);
  readonly paginationService = inject(PaginationService);
  private confirmation = viewChild.required(ConfirmDialogComponent);
  readonly categories = PRODUCT_CATEGORY_OPTIONS;
  readonly apiErrorMessage = apiErrorMessage;
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  readonly pendingDelete = signal<Product | null>(null);
  readonly filters = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => {
        const category = this.categories.find(
          (option) => option.value === params.get('category'),
        )?.value;
        const rawLimit = Number(params.get('limit') ?? 10);
        return {
          category,
          subcategory: category ? params.get('subcategory') || undefined : undefined,
          brand: params.get('brand') || undefined,
          limit: [10, 20, 50, 100].includes(rawLimit) ? rawLimit : 10,
          page: this.paginationService.currentPage(),
        };
      }),
    ),
    {
      initialValue: {
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        limit: 10,
        page: 1,
      },
    },
  );
  readonly selectedCategory = computed(() => this.filters().category);
  readonly brandsResource = rxResource({ stream: () => this.service.getBrands() });
  readonly subcategoriesResource = rxResource({
    params: () => ({ category: this.selectedCategory() }),
    stream: ({ params }) =>
      params.category ? this.service.getSubcategoriesByCategory(params.category) : of([]),
  });
  readonly productsResource = rxResource({
    params: () => this.filters(),
    stream: ({ params }) =>
      this.service.getProducts({
        category: params.category,
        subcategory: params.subcategory,
        brand: params.brand,
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      }),
  });
  readonly response = computed(() =>
    this.productsResource.hasValue() ? this.productsResource.value() : undefined,
  );
  readonly brands = computed(() =>
    this.brandsResource.hasValue() ? this.brandsResource.value() : [],
  );
  readonly subcategories = computed(() =>
    this.subcategoriesResource.hasValue() ? this.subcategoriesResource.value() : [],
  );
  constructor() {
    effect(() => {
      const response = this.productsResource.hasValue() ? this.productsResource.value() : undefined;
      if (
        !this.productsResource.isLoading() &&
        response &&
        this.filters().page > Math.max(1, response.pages)
      ) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { page: Math.max(1, response.pages) },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }
  changeCategory(value: string): void {
    const category: ProductCategory | null =
      this.categories.find((option) => option.value === value)?.value ?? null;
    this.setFilters({ category, subcategory: null });
  }
  setFilters(values: {
    category?: ProductCategory | null;
    subcategory?: string | null;
    brand?: string | null;
    limit?: number;
  }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...values, page: 1 },
      queryParamsHandling: 'merge',
    });
  }
  clearFilters(): void {
    this.setFilters({ category: null, subcategory: null, brand: null });
  }
  askDelete(product: Product): void {
    this.pendingDelete.set(product);
    this.deleteError.set('');
    this.confirmation().open();
  }
  async deleteProduct(): Promise<void> {
    const product = this.pendingDelete();
    if (!product || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    try {
      await firstValueFrom(this.service.deleteProduct(product.id));
      this.confirmation().close();
      this.notifications.success('Producto eliminado');
      this.productsResource.reload();
    } catch (error) {
      this.deleteError.set(apiErrorMessage(error));
    } finally {
      this.deleting.set(false);
    }
  }
}
