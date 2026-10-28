import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ProductCategory } from '../../../products/interfaces/product.interface';
import {
  CATEGORY_NAVIGATION,
  CategoryNavigationItem,
} from '../../components/navbar/category-navigation';
import { FeaturedProductsComponent } from './components/featured-products/featured-products.component';

const HERO_IMAGES_URL = 'https://lumina-beauty-bucket.s3.us-east-1.amazonaws.com/static/images';

const category = (value: ProductCategory): CategoryNavigationItem =>
  CATEGORY_NAVIGATION.find((item) => item.value === value)!;

interface RoutineStep {
  verb: string;
  description: string;
  category: CategoryNavigationItem;
}

interface BeautyMoment {
  title: string;
  description: string;
  categories: CategoryNavigationItem[];
}

interface Benefit {
  title: string;
  description: string;
  /** Heroicons outline path (24×24, stroke). */
  icon: string;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, NgOptimizedImage, FeaturedProductsComponent],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  readonly categories = CATEGORY_NAVIGATION;

  /** Hero tile columns, left to right; the middle one is the tallest. */
  readonly heroColumns: readonly (readonly string[])[] = [
    ['imagen-1.jpeg', 'imagen-2.jpeg'],
    ['imagen-4.jpeg', 'imagen--10.jpeg', 'imagen-5.jpeg'],
    ['imagen-6.jpeg', 'imagen-8.jpeg'],
  ].map((column) => column.map((file) => `${HERO_IMAGES_URL}/${file}`));

  readonly routine: readonly RoutineStep[] = [
    {
      verb: 'Limpia',
      description: 'Retira impurezas y prepara la piel.',
      category: category('LIMPIEZA'),
    },
    {
      verb: 'Trata',
      description: 'Sérums y ampollas con un objetivo claro.',
      category: category('TRATAMIENTOS'),
    },
    {
      verb: 'Hidrata',
      description: 'Cremas y brumas que mantienen el equilibrio.',
      category: category('HIDRATACION'),
    },
    {
      verb: 'Protege',
      description: 'El paso que no se salta, ni en días nublados.',
      category: category('PROTECCION_SOLAR'),
    },
  ];

  readonly moments: readonly BeautyMoment[] = [
    {
      title: 'Cuidado de la piel',
      description: 'Limpieza, tratamiento e hidratación para el día a día.',
      categories: [category('LIMPIEZA'), category('TRATAMIENTOS'), category('HIDRATACION')],
    },
    {
      title: 'Maquillaje',
      description: 'Rostro, ojos y labios para looks sutiles o intensos.',
      categories: [category('ROSTRO'), category('OJOS_Y_CEJAS'), category('LABIOS')],
    },
    {
      title: 'Protección',
      description: 'Protectores con y sin color para usar todos los días.',
      categories: [category('PROTECCION_SOLAR')],
    },
    {
      title: 'Fragancias',
      description: 'Perfumes y brumas para cerrar tu rutina con tu sello.',
      categories: [category('PERFUMES')],
    },
  ];

  readonly benefits: readonly Benefit[] = [
    {
      title: 'Compra sencilla',
      description: 'Agrega al carrito y confirma tu pedido en pocos pasos.',
      icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
    },
    {
      title: 'Direcciones guardadas',
      description: 'Elige a dónde enviar cada pedido sin volver a escribirlo.',
      icon: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    },
    {
      title: 'Seguimiento de pedidos',
      description: 'Consulta en Mis pedidos cómo avanza cada compra.',
      icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
    },
    {
      title: 'Cuenta protegida',
      description: 'Verificación por código y recuperación de contraseña.',
      icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
    },
  ];

  private readonly brokenImages = signal<readonly ProductCategory[]>([]);

  isImageBroken(value: ProductCategory): boolean {
    return this.brokenImages().includes(value);
  }

  /** Missing artwork degrades to the category gradient instead of a broken icon. */
  onImageError(value: ProductCategory): void {
    this.brokenImages.update((current) =>
      current.includes(value) ? current : [...current, value],
    );
  }
}
