import {
  AfterViewInit,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ScrollStateService } from '../../../shared/services/scroll-state.service';
import { ProductService } from '../../../products/services/product.service';
import { ProductImagePipe } from '../../../products/pipes/product-image.pipe';
import { CurrencyPipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ProductCategory,
  PRODUCT_CATEGORY_OPTIONS,
  categoryLabel,
} from '../../../products/interfaces/product.interface';

// Estado de filtros para el Subject. Refleja el contrato de filtrado del
// backend (category / subcategory); el genero y las tallas del catalogo de ropa
// anterior ya no forman parte de la navegacion.
interface FiltersState {
  category?: ProductCategory;
  subcategory?: string;
}

const VALID_CATEGORIES = new Set<string>(PRODUCT_CATEGORY_OPTIONS.map((option) => option.value));
@Component({
  selector: 'app-products-page',
  imports: [ProductImagePipe, CurrencyPipe, RouterLink],
  templateUrl: './products-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProductsPage implements AfterViewInit {
  productService = inject(ProductService);
  scrollStateService = inject(ScrollStateService);
  route = inject(ActivatedRoute);

  //!Filtros activos, derivados de los query params de la ruta
  activeCategory = signal<ProductCategory | null>(null);
  activeSubcategory = signal<string | null>(null);

  /** Etiqueta legible de la categoria activa, para encabezados. */
  activeCategoryLabel = computed(() => {
    const category = this.activeCategory();
    return category ? categoryLabel(category) : 'Todos los productos';
  });

  //!Filtros heredados del catalogo de ropa. El navbar ya no los usa, por lo que
  //!las secciones de genero y categoria de la barra lateral quedan ocultas.
  selectedGenders = signal<string[]>([]);
  selectedCategories = signal<string[]>([]);
  selectedSizes = signal<string[]>([]);
  hideGenderFilters = signal<boolean>(true);
  hideCategoryFilters = signal<boolean>(true);

  /** Vestigio del catalogo de ropa; se conserva solo para la plantilla actual. */
  isGorraCategory = signal<boolean>(false);

  // Subject para cambios de filtros el cual incluira debounce
  private filtersChanged$ = new Subject<FiltersState>();
  private destroy$ = new Subject<void>();

  constructor() {
    this.setupFiltersListener();
    this.setupRouteListener();
  }

  private setupRouteListener() {
    // La navegacion del navbar llega como query params: ?category=ROSTRO&subcategory=<id>
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const categoryParam = params.get('category') ?? '';
      const subcategoryParam = params.get('subcategory') ?? '';

      const category = VALID_CATEGORIES.has(categoryParam)
        ? (categoryParam as ProductCategory)
        : null;

      this.activeCategory.set(category);
      this.activeSubcategory.set(subcategoryParam || null);

      this.productService.clearProductsCache();
      this.productService.getProductsCache(this.getCurrentFiltersState());
    });
  }

  //!Listener que reaccionara a los cambios de filtgros
  private setupFiltersListener() {
    this.filtersChanged$
      .pipe(
        debounceTime(250),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$),
      )
      .subscribe((filters) => {
        this.productService.clearProductsCache();
        this.productService.getProductsCache(filters);
      });
  }

  ngAfterViewInit(): void {
    const savedScroll = this.scrollStateService.trendingScrollState();
    if (savedScroll > 0) {
      window.scrollTo(0, savedScroll);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollTop = window.scrollY;
    const clientHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;

    this.scrollStateService.trendingScrollState.set(scrollTop);

    const isAtBottom = scrollTop + clientHeight + 300 >= scrollHeight;
    if (isAtBottom) {
      this.productService.getProductsCache(this.getCurrentFiltersState());
    }
  }

  private getCurrentFiltersState(): FiltersState {
    return {
      category: this.activeCategory() ?? undefined,
      subcategory: this.activeSubcategory() ?? undefined,
    };
  }

  private emitFiltersChanged() {
    this.filtersChanged$.next(this.getCurrentFiltersState());
  }

  onGenderChange(value: string, checked: boolean) {
    this.selectedGenders.update((curr) => {
      if (checked) {
        // agregamos si no existe
        if (curr.includes(value)) return curr;
        return [...curr, value];
      }

      return curr.filter((v) => v !== value);
    });

    this.emitFiltersChanged();
  }

  onCategoryChange(value: string, checked: boolean) {
    this.selectedCategories.update((curr) => {
      if (checked) {
        if (curr.includes(value)) return curr;
        return [...curr, value];
      }

      return curr.filter((v) => v !== value);
    });

    this.emitFiltersChanged();
  }

  onSizeChange(value: string, checked: boolean) {
    this.selectedSizes.update((curr) => {
      if (checked) {
        if (curr.includes(value)) return curr;
        return [...curr, value];
      } else {
        return curr.filter((v) => v !== value);
      }
    });

    this.emitFiltersChanged();
  }
}
