import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Product, categoryLabel } from '../../interfaces/product.interface';
import { ProductImagePipe } from '../../pipes/product-image.pipe';

/**
 * Storefront product tile shared by the catalog listing and the home page.
 *
 * The title is an `h3` because both hosts render it under a section `h2`.
 */
@Component({
  selector: 'product-card',
  imports: [CurrencyPipe, NgOptimizedImage, ProductImagePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <article
      class="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      <a
        [routerLink]="['/product', product().slug]"
        class="block rounded-t-2xl focus-visible:outline-offset-[-4px]"
      >
        <div class="overflow-hidden bg-gray-50">
          <img
            [ngSrc]="product().images | productImage"
            width="480"
            height="480"
            [alt]="product().title"
            [priority]="priority()"
            class="aspect-square w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div class="p-5 pb-2">
          <p class="text-xs font-semibold tracking-wider text-gray-600 uppercase">
            {{ product().brand.name }}
          </p>
          <h3 class="mt-2 text-base font-semibold break-words text-gray-900">
            {{ product().title }}
          </h3>
        </div>
      </a>
      <div class="flex flex-1 flex-col px-5 pb-5">
        <p class="text-sm text-gray-600">
          {{ categoryLabel(product().category) }} · {{ product().subcategory.name }}
        </p>
        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
          <p class="text-lg font-semibold text-gray-900">
            {{ product().price | currency: 'GTQ' : 'Q' : '1.2-2' }}
          </p>
          <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">{{
            product().stock > 0 ? 'En stock' : 'Sin stock'
          }}</span>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  /** Above-the-fold cards can opt into eager image loading. */
  readonly priority = input(false);

  readonly categoryLabel = categoryLabel;
}
