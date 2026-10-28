import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import {
  catchError,
  EMPTY,
  exhaustMap,
  finalize,
  map,
  merge,
  of,
  shareReplay,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { ProductService } from '../../../products/services/product.service';
import { ProductCardComponent } from '../../../products/components/product-card/product-card.component';
import {
  Brand,
  Product,
  ProductCategory,
  ProductFilters,
  PRODUCT_CATEGORY_OPTIONS,
  ProductSubcategory,
  categoryLabel,
} from '../../../products/interfaces/product.interface';
import {
  NotificationService,
  apiErrorMessage,
} from '../../../shared/services/notification.service';
import { ScrollStateService } from '../../../shared/services/scroll-state.service';

@Component({
  selector: 'app-products-page',
  imports: [ProductCardComponent],
  templateUrl: './products-page.html',
  styleUrl: './products-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onWindowScroll()' },
})
export class ProductsPage implements AfterViewInit {
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly scrollState = inject(ScrollStateService);
  private readonly more = new Subject<void>();
  private readonly retryFilters = new Subject<void>();
  private readonly retryBrands = new Subject<void>();
  readonly categories = PRODUCT_CATEGORY_OPTIONS;
  readonly categoryLabel = categoryLabel;
  readonly activeCategory = signal<ProductCategory | null>(null);
  readonly activeSubcategory = signal<string | null>(null);
  readonly activeBrand = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly subcategories = signal<ProductSubcategory[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly productsLoading = signal(false);
  readonly subcategoriesLoading = signal(false);
  readonly brandsLoading = signal(false);
  readonly productsError = signal<string | null>(null);
  readonly subcategoriesError = signal<string | null>(null);
  readonly brandsError = signal<string | null>(null);
  readonly count = signal(0);
  readonly hasMore = signal(true);
  readonly filtersOpen = signal(false);
  readonly hasFilters = computed(
    () => !!(this.activeCategory() || this.activeSubcategory() || this.activeBrand()),
  );
  private offset = 0;
  private readonly limit = 6;

  constructor() {
    merge(of(undefined), this.retryBrands)
      .pipe(
        tap(() => {
          this.brandsLoading.set(true);
          this.brandsError.set(null);
        }),
        switchMap(() =>
          this.productService.getBrands().pipe(
            tap((brands) => this.brands.set(brands)),
            catchError((error: unknown) => {
              this.brandsError.set(apiErrorMessage(error));
              return EMPTY;
            }),
            finalize(() => this.brandsLoading.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();

    merge(
      this.route.queryParamMap,
      this.retryFilters.pipe(map(() => this.route.snapshot.queryParamMap)),
    )
      .pipe(
        switchMap((params) => {
          const category =
            this.categories.find((item) => item.value === params.get('category'))?.value ?? null;
          const requestedSubcategory = category ? params.get('subcategory') || null : null;
          this.activeCategory.set(category);
          this.activeSubcategory.set(null);
          this.activeBrand.set(params.get('brand') || null);
          this.subcategories.set([]);
          this.subcategoriesError.set(null);
          this.products.set([]);
          this.productsError.set(null);
          this.count.set(0);
          this.hasMore.set(true);
          this.offset = 0;
          this.subcategoriesLoading.set(!!category);
          if (
            (!category && (params.has('category') || params.has('subcategory'))) ||
            params.get('brand') === ''
          ) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParamsHandling: 'merge',
              queryParams: {
                category,
                subcategory: requestedSubcategory,
                brand: this.activeBrand(),
              },
              replaceUrl: true,
            });
            return EMPTY;
          }
          const subcategories = (
            category ? this.productService.getSubcategoriesByCategory(category) : of([])
          ).pipe(
            tap((items) => this.subcategories.set(items)),
            catchError((error: unknown) => {
              const message = apiErrorMessage(error);
              this.subcategoriesError.set(message);
              this.notifications.error('No se pudieron cargar las subcategorías', message);
              return of([] as ProductSubcategory[]);
            }),
            finalize(() => this.subcategoriesLoading.set(false)),
            shareReplay({ bufferSize: 1, refCount: true }),
          );
          // Parent-category browsing need not wait for the optional filter request.
          // A deep-linked subcategory must be validated before requesting products.
          const validated = requestedSubcategory
            ? subcategories.pipe(
                map((items) => {
                  const valid = items.some((item) => item.id === requestedSubcategory);
                  this.activeSubcategory.set(valid ? requestedSubcategory : null);
                  if (!valid) {
                    void this.router.navigate([], {
                      relativeTo: this.route,
                      queryParamsHandling: 'merge',
                      queryParams: { subcategory: null, page: null },
                      replaceUrl: true,
                    });
                  }
                  return valid;
                }),
              )
            : of(true);
          const listing = validated.pipe(
            switchMap((valid) => {
              if (!valid) return EMPTY;
              const filters: ProductFilters = {
                category: category ?? undefined,
                subcategory: requestedSubcategory ?? undefined,
                brand: this.activeBrand() ?? undefined,
              };
              return merge(of(undefined), this.more).pipe(
                exhaustMap(() => {
                  if (!this.hasMore()) return EMPTY;
                  this.productsLoading.set(true);
                  this.productsError.set(null);
                  return this.productService
                    .getProductsWithStock({ ...filters, limit: this.limit, offset: this.offset })
                    .pipe(
                      tap((response) => {
                        this.products.update((current) => [...current, ...response.products]);
                        this.count.set(response.count);
                        this.offset += response.products.length;
                        this.hasMore.set(
                          response.products.length > 0 && this.offset < response.count,
                        );
                      }),
                      catchError((error: unknown) => {
                        const message = apiErrorMessage(error);
                        this.productsError.set(message);
                        this.notifications.error('No se pudieron cargar los productos', message);
                        return EMPTY;
                      }),
                      finalize(() => this.productsLoading.set(false)),
                    );
                }),
              );
            }),
          );
          return merge(subcategories, listing);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    const saved = this.scrollState.trendingScrollState();
    if (saved > 0) window.scrollTo(0, saved);
  }

  onWindowScroll(): void {
    this.scrollState.trendingScrollState.set(window.scrollY);
    if (
      !this.productsError() &&
      window.scrollY + window.innerHeight + 300 >= document.documentElement.scrollHeight
    )
      this.loadMore();
  }

  loadMore(): void {
    this.more.next();
  }
  retrySubcategories(): void {
    this.retryFilters.next();
  }
  reloadBrands(): void {
    this.retryBrands.next();
  }

  selectCategory(category: ProductCategory | null): void {
    if (category === this.activeCategory() && !this.activeSubcategory()) return;
    this.activeSubcategory.set(null);
    this.subcategories.set([]);
    this.changeFilters({ category, subcategory: null });
  }
  selectSubcategory(subcategory: string | null): void {
    this.changeFilters({ subcategory });
  }
  selectBrand(brand: string): void {
    this.changeFilters({ brand: brand || null });
  }
  clearFilters(): void {
    this.changeFilters({ category: null, subcategory: null, brand: null });
  }

  private changeFilters(queryParams: Params): void {
    this.scrollState.trendingScrollState.set(0);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: {
        ...queryParams,
        page: null,
        offset: null,
        gender: null,
        sizes: null,
        size: null,
      },
    });
  }
}
