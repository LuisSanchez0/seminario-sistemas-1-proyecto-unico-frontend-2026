import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, categoryLabel } from '../../../products/interfaces/product.interface';
import { ProductImagePipe } from '../../../products/pipes/product-image.pipe';

@Component({
  selector: 'product-table',
  imports: [ProductImagePipe, RouterLink, CurrencyPipe, NgOptimizedImage],
  templateUrl: './product-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTableComponent {
  products = input.required<Product[]>();
  deleting = input(false);
  deleteRequested = output<Product>();
  readonly categoryLabel = categoryLabel;
}
