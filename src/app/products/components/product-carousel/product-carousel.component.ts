import {
  AfterViewInit,
  ChangeDetectionStrategy,
  OnDestroy,
  Component,
  ElementRef,
  input,
  OnChanges,
  SimpleChanges,
  viewChild,
} from '@angular/core';

import { NgOptimizedImage } from '@angular/common';
import Swiper from 'swiper';
import { A11y, Keyboard, Navigation, Pagination } from 'swiper/modules';

import { ProductImagePipe } from '../../pipes/product-image.pipe';

@Component({
  selector: 'product-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductImagePipe, NgOptimizedImage],
  templateUrl: './product-carousel.component.html',
  styleUrls: ['../../styles/carousel-styles.css'],
})
export class ProductCarouselComponent implements AfterViewInit, OnChanges, OnDestroy {
  images = input.required<string[]>();
  productTitle = input('Producto');
  swiperDiv = viewChild.required<ElementRef>('swiperDiv');

  swiper: Swiper | undefined = undefined;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['images'] || changes['images'].firstChange) {
      return;
    }

    if (!this.swiper || this.swiper.destroyed) return;

    this.swiper.destroy(true, true);

    const paginationEl: HTMLDivElement =
      this.swiperDiv().nativeElement?.querySelector('.swiper-pagination');

    paginationEl.innerHTML = '';

    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.swiperInit();
    }, 100);
  }

  ngAfterViewInit(): void {
    this.swiperInit();
  }

  ngOnDestroy(): void {
    clearTimeout(this.refreshTimer);
    this.swiper?.destroy(true, true);
  }

  swiperInit() {
    const element = this.swiperDiv().nativeElement;
    if (!element) return;

    const totalSlides = this.images()?.length ?? 0;

    this.swiper = new Swiper(element, {
      direction: 'horizontal',

      loop: totalSlides > 1,

      modules: [A11y, Keyboard, Navigation, Pagination],
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: {
        prevSlideMessage: 'Imagen anterior',
        nextSlideMessage: 'Imagen siguiente',
        paginationBulletMessage: 'Ir a imagen {{index}}',
        slideLabelMessage: 'Imagen {{index}} de {{slidesLength}}',
      },

      slidesPerView: 1,
      slidesPerGroup: 1,

      watchOverflow: true,

      pagination: {
        el: element.querySelector('.swiper-pagination'),
        clickable: true,
      },

      navigation: {
        nextEl: element.querySelector('.swiper-button-next'),
        prevEl: element.querySelector('.swiper-button-prev'),
      },

      scrollbar: {
        el: '.swiper-scrollbar',
      },
    });
  }
}
