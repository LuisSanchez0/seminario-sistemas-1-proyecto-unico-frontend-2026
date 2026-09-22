import { Pipe, PipeTransform } from '@angular/core';
import { Image } from '../interfaces/product.interface';

@Pipe({
  name: 'productImage',
})
export class ProductImagePipe implements PipeTransform {
  transform(value: null | string | Image[] | Image): string {
    const fallback = '/images/product-placeholder.svg';

    if (!value) return fallback;

    if (typeof value === 'string') {
      return value; // Ya es una URL directa
    }

    if (Array.isArray(value)) {
      const image = value.at(0);
      return image?.url ?? fallback;
    }

    if (value?.url) {
      return value.url;
    }

    return fallback;
  }
}
