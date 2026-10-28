import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ProductCategory } from '../../../products/interfaces/product.interface';
import {
  CATEGORY_NAVIGATION,
  CategoryNavigationItem,
} from '../../components/navbar/category-navigation';

const category = (value: ProductCategory): CategoryNavigationItem =>
  CATEGORY_NAVIGATION.find((item) => item.value === value)!;

interface TextBlock {
  title: string;
  description: string;
}

interface JourneyStep extends TextBlock {
  /** Storefront page where this step happens, when it has its own. */
  link?: { path: string; label: string };
}

@Component({
  selector: 'app-about-us-page',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './about-us-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutUsPageComponent {
  readonly categories = CATEGORY_NAVIGATION;

  /** Back to front: the last card sits on top of the stack. */
  readonly heroCards = [category('PERFUMES'), category('ROSTRO'), category('LABIOS')];

  readonly purpose: readonly TextBlock[] = [
    {
      title: 'Descubrir',
      description:
        'Encontrar productos según tu rutina, tus intereses y lo que ya sabes que te funciona.',
    },
    {
      title: 'Elegir',
      description:
        'Categorías claras, filtros por marca y fichas con lo esencial para decidir con calma.',
    },
    {
      title: 'Disfrutar',
      description: 'Una compra sin complicaciones y un pedido que puedes seguir paso a paso.',
    },
  ];

  readonly values: readonly TextBlock[] = [
    {
      title: 'Diversidad',
      description:
        'Cada rutina es diferente. Nuestro catálogo busca adaptarse a distintas necesidades, estilos y formas de vivir la belleza.',
    },
    {
      title: 'Cercanía',
      description: 'Hablamos claro, sin tecnicismos ni promesas exageradas.',
    },
    {
      title: 'Confianza',
      description:
        'Precio y disponibilidad visibles antes de comprar, y cada pedido con su estado.',
    },
    {
      title: 'Cuidado',
      description: 'La belleza como un momento para ti, no como una obligación.',
    },
    {
      title: 'Simplicidad',
      description: 'Menos pasos y menos ruido: del catálogo al carrito sin rodeos.',
    },
  ];

  readonly journey: readonly JourneyStep[] = [
    {
      title: 'Descubre',
      description: 'Recorre el catálogo por categoría, subcategoría o marca.',
      link: { path: '/products', label: 'Ir al catálogo' },
    },
    {
      title: 'Conoce',
      description: 'Revisa fotos, descripción, precio y disponibilidad de cada producto.',
    },
    {
      title: 'Elige',
      description: 'Agrega lo que te gusta al carrito y ajusta cantidades cuando quieras.',
      link: { path: '/cart', label: 'Ver mi carrito' },
    },
    {
      title: 'Compra',
      description:
        'Selecciona una dirección guardada, paga por transferencia y sube tu comprobante.',
    },
    {
      title: 'Sigue tu pedido',
      description: 'Míralo avanzar: realizado, pago confirmado, preparando, enviado y entregado.',
      link: { path: '/my-orders', label: 'Ver mis pedidos' },
    },
  ];
}
