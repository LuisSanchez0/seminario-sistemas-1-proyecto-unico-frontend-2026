import {
  PRODUCT_CATEGORY_OPTIONS,
  ProductCategory,
} from '../../../products/interfaces/product.interface';

/**
 * Visual metadata for a storefront parent category.
 *
 * Labels are not repeated here on purpose: they are derived from
 * PRODUCT_CATEGORY_OPTIONS so the canonical catalog constant stays the single
 * source of truth for what a category is called.
 */
export interface CategoryNavigationItem {
  value: ProductCategory;
  label: string;
  /** Static asset under `public/`, served from the site root. */
  image: string;
  /** Short editorial teaser shown under the label in the mega menu. */
  blurb: string;
  /** Tile ground, and the visible fallback when `image` fails to load. */
  gradient: string;
}

type CategoryMedia = Omit<CategoryNavigationItem, 'value' | 'label'>;

const gradient = (from: string, to: string) => `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;

const CATEGORY_MEDIA: Record<ProductCategory, CategoryMedia> = {
  ROSTRO: {
    image: '/images/categories/rostro.svg',
    blurb: 'Base, rubor, corrector',
    gradient: gradient('#F7EAE1', '#E3BEA6'),
  },
  OJOS_Y_CEJAS: {
    image: '/images/categories/ojos-y-cejas.svg',
    blurb: 'Máscara, delineador, cejas',
    gradient: gradient('#EAE6F5', '#B6A9DA'),
  },
  LABIOS: {
    image: '/images/categories/labios.svg',
    blurb: 'Labiales, gloss, bálsamos',
    gradient: gradient('#FCE4E8', '#E28C9C'),
  },
  LIMPIEZA: {
    image: '/images/categories/limpieza.svg',
    blurb: 'Limpiadores, tónicos, desmaquillantes',
    gradient: gradient('#E6F2F1', '#A5CFCA'),
  },
  TRATAMIENTOS: {
    image: '/images/categories/tratamientos.svg',
    blurb: 'Sérums, ampollas, mascarillas',
    gradient: gradient('#F1ECF8', '#C0AEDD'),
  },
  HIDRATACION: {
    image: '/images/categories/hidratacion.svg',
    blurb: 'Cremas, brumas, contorno',
    gradient: gradient('#E5EFF9', '#A6C6E4'),
  },
  PROTECCION_SOLAR: {
    image: '/images/categories/proteccion-solar.svg',
    blurb: 'Protectores con y sin color',
    gradient: gradient('#FDF1DE', '#F0CB84'),
  },
  PERFUMES: {
    image: '/images/categories/perfumes.svg',
    blurb: 'Fragancias y brumas corporales',
    gradient: gradient('#F1EBE4', '#C9B8A3'),
  },
};

export const CATEGORY_NAVIGATION: readonly CategoryNavigationItem[] = PRODUCT_CATEGORY_OPTIONS.map(
  ({ value, label }) => ({ value, label, ...CATEGORY_MEDIA[value] }),
);
