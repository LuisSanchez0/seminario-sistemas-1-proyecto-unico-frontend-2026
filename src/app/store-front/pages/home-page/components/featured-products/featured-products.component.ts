import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, merge, of, Subject, switchMap, tap } from 'rxjs';

import { ProductCardComponent } from '../../../../../products/components/product-card/product-card.component';
import { Product } from '../../../../../products/interfaces/product.interface';
import { ProductService } from '../../../../../products/services/product.service';

/** Desktop shows a single row of four. */
export const FEATURED_PRODUCTS_LIMIT = 4;

type FeaturedState = 'loading' | 'ready' | 'error';

/**
 * Home page product showcase.
 *
 * The API has no "featured" flag, so this reuses the catalog listing endpoint
 * (`/products/stock`: active products with stock) and keeps the first page.
 * A failure stays local to this section — no toast, no broken home page.
 */
@Component({
  selector: 'home-featured-products',
  imports: [ProductCardComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './featured-products.component.html',
})
export class FeaturedProductsComponent {
  private readonly productService = inject(ProductService);
  private readonly retry$ = new Subject<void>();

  readonly state = signal<FeaturedState>('loading');
  readonly products = signal<Product[]>([]);
  readonly placeholders = Array.from({ length: FEATURED_PRODUCTS_LIMIT }, (_, index) => index);

  constructor() {
    merge(of(undefined), this.retry$)
      .pipe(
        tap(() => this.state.set('loading')),
        switchMap(() =>
          this.productService.getProductsWithStock({ limit: FEATURED_PRODUCTS_LIMIT }).pipe(
            tap((response) => {
              this.products.set(response.products.slice(0, FEATURED_PRODUCTS_LIMIT));
              this.state.set('ready');
            }),
            catchError(() => {
              this.products.set([]);
              this.state.set('error');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  retry(): void {
    this.retry$.next();
  }
}
