import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import {
  ProductCategory,
  ProductSubcategory,
} from '../../../products/interfaces/product.interface';
import { ProductService } from '../../../products/services/product.service';
import { StoreFront } from '../../services/store-front';
import { CATEGORY_NAVIGATION, CategoryNavigationItem } from './category-navigation';

/** Storefront listing route driven by `category` / `subcategory` query params. */
const PRODUCTS_ROUTE = '/products';

@Component({
  selector: 'navbar',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly cartStore = inject(StoreFront);

  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly productsMenu = viewChild<ElementRef<HTMLElement>>('productsMenu');
  private readonly productsTrigger = viewChild<ElementRef<HTMLButtonElement>>('productsTrigger');
  private readonly mobileMenu = viewChild<ElementRef<HTMLDialogElement>>('mobileMenu');

  readonly categories = CATEGORY_NAVIGATION;

  /** Desktop mega menu. */
  readonly productsMenuOpen = signal(false);
  /** Category previewed in the desktop subcategory panel. */
  readonly activeCategory = signal<ProductCategory>(CATEGORY_NAVIGATION[0].value);
  /** Category expanded in the mobile accordion; `null` means all collapsed. */
  readonly expandedCategory = signal<ProductCategory | null>(null);

  /** In-memory cache so a category is fetched at most once per page load. */
  private readonly subcategoriesByCategory = signal<
    Partial<Record<ProductCategory, ProductSubcategory[]>>
  >({});
  private readonly loadingCategories = signal<readonly ProductCategory[]>([]);
  private readonly failedCategories = signal<readonly ProductCategory[]>([]);
  private readonly brokenImages = signal<readonly ProductCategory[]>([]);

  /** Query params of the listing the customer is currently browsing. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly activeFilters = computed(() => {
    const { queryParams } = this.router.parseUrl(this.currentUrl());
    return {
      category: queryParams['category'] as string | undefined,
      subcategory: queryParams['subcategory'] as string | undefined,
    };
  });

  readonly activeItem = computed<CategoryNavigationItem>(
    () =>
      this.categories.find((item) => item.value === this.activeCategory()) ?? this.categories[0],
  );

  readonly activeSubcategories = computed(
    () => this.subcategoriesByCategory()[this.activeCategory()],
  );

  constructor() {
    // Any navigation — including RouterLink clicks inside the menus — dismisses them.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.productsMenuOpen.set(false);
        this.closeMobileMenu();
      });
  }

  // ── Subcategory loading ───────────────────────────────────────────────────

  subcategoriesOf(category: ProductCategory): ProductSubcategory[] | undefined {
    return this.subcategoriesByCategory()[category];
  }

  isLoading(category: ProductCategory): boolean {
    return this.loadingCategories().includes(category);
  }

  hasFailed(category: ProductCategory): boolean {
    return this.failedCategories().includes(category);
  }

  /** Fetches a category's subcategories once; later calls reuse the cache. */
  private loadSubcategories(category: ProductCategory): void {
    if (this.subcategoriesByCategory()[category] || this.isLoading(category)) return;

    this.loadingCategories.update((current) => [...current, category]);
    this.failedCategories.update((current) => current.filter((value) => value !== category));

    this.productService
      .getSubcategoriesByCategory(category)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subcategories) => {
          this.subcategoriesByCategory.update((cache) => ({ ...cache, [category]: subcategories }));
          this.stopLoading(category);
        },
        // A failed lookup must never take the navbar down: parent categories stay
        // navigable and the panel offers a retry.
        error: () => {
          this.failedCategories.update((current) => [...current, category]);
          this.stopLoading(category);
        },
      });
  }

  private stopLoading(category: ProductCategory): void {
    this.loadingCategories.update((current) => current.filter((value) => value !== category));
  }

  retry(category: ProductCategory): void {
    this.failedCategories.update((current) => current.filter((value) => value !== category));
    this.loadSubcategories(category);
  }

  // ── Desktop mega menu ─────────────────────────────────────────────────────

  toggleProductsMenu(): void {
    this.productsMenuOpen.update((open) => !open);
    if (this.productsMenuOpen()) this.loadSubcategories(this.activeCategory());
  }

  /** Previews a category without navigating (hover, focus, or first tap). */
  previewCategory(category: ProductCategory): void {
    if (!this.productsMenuOpen()) return;
    this.activeCategory.set(category);
    this.loadSubcategories(category);
  }

  /**
   * A tile that is not yet active only previews, so touch users see the
   * subcategories before committing. Pointer and keyboard users have already
   * previewed it via hover/focus, so their click navigates.
   */
  activateCategory(category: ProductCategory): void {
    if (this.activeCategory() === category) {
      this.goToCategory(category);
      return;
    }
    this.activeCategory.set(category);
    this.loadSubcategories(category);
  }

  onEscape(): void {
    if (!this.productsMenuOpen()) return;
    this.productsMenuOpen.set(false);
    this.productsTrigger()?.nativeElement.focus();
  }

  onDocumentClick(event: Event): void {
    if (!this.productsMenuOpen()) return;
    const menu = this.productsMenu()?.nativeElement;
    const target = event.target;
    if (menu && target instanceof Node && !menu.contains(target)) {
      this.productsMenuOpen.set(false);
    }
  }

  /** Closes when focus leaves the menu entirely (keyboard tab-out). */
  onProductsFocusOut(event: FocusEvent): void {
    const menu = this.productsMenu()?.nativeElement;
    const next = event.relatedTarget;
    if (!menu || next === null) return;
    if (next instanceof Node && !menu.contains(next)) this.productsMenuOpen.set(false);
  }

  // ── Mobile drawer ─────────────────────────────────────────────────────────

  toggleExpandedCategory(category: ProductCategory): void {
    const expanded = this.expandedCategory() === category;
    this.expandedCategory.set(expanded ? null : category);
    if (!expanded) this.loadSubcategories(category);
  }

  closeMobileMenu(): void {
    const dialog = this.mobileMenu()?.nativeElement;
    if (dialog?.open) dialog.close();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Selecting a parent category always drops any previous subcategory filter. */
  goToCategory(category: ProductCategory): void {
    this.router.navigate([PRODUCTS_ROUTE], { queryParams: { category } });
  }

  goToSubcategory(category: ProductCategory, subcategory: ProductSubcategory): void {
    this.router.navigate([PRODUCTS_ROUTE], {
      queryParams: { category, subcategory: this.subcategoryId(subcategory) },
    });
  }

  subcategoryId(subcategory: ProductSubcategory): string {
    return subcategory.id ?? subcategory._id ?? '';
  }

  // ── Active state derived from the current listing ─────────────────────────

  isBrowsingCategory(category: ProductCategory): boolean {
    return this.activeFilters().category === category;
  }

  isBrowsingSubcategory(subcategory: ProductSubcategory): boolean {
    return this.activeFilters().subcategory === this.subcategoryId(subcategory);
  }

  // ── Category imagery ──────────────────────────────────────────────────────

  isImageBroken(category: ProductCategory): boolean {
    return this.brokenImages().includes(category);
  }

  /** Missing artwork degrades to the category gradient instead of a broken icon. */
  onImageError(category: ProductCategory): void {
    this.brokenImages.update((current) =>
      current.includes(category) ? current : [...current, category],
    );
  }
}
