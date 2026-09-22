export type ProductCategory =
  | 'ROSTRO'
  | 'OJOS_Y_CEJAS'
  | 'LABIOS'
  | 'LIMPIEZA'
  | 'TRATAMIENTOS'
  | 'HIDRATACION'
  | 'PROTECCION_SOLAR'
  | 'PERFUMES';

export const PRODUCT_CATEGORY_OPTIONS: ReadonlyArray<{ value: ProductCategory; label: string }> = [
  { value: 'ROSTRO', label: 'Rostro' },
  { value: 'OJOS_Y_CEJAS', label: 'Ojos y cejas' },
  { value: 'LABIOS', label: 'Labios' },
  { value: 'LIMPIEZA', label: 'Limpieza' },
  { value: 'TRATAMIENTOS', label: 'Tratamientos' },
  { value: 'HIDRATACION', label: 'Hidratación' },
  { value: 'PROTECCION_SOLAR', label: 'Protección solar' },
  { value: 'PERFUMES', label: 'Perfumes' },
];

export function categoryLabel(category: ProductCategory): string {
  return PRODUCT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
}

export interface Brand {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  state?: boolean;
}

export interface ProductSubcategory extends Brand {
  category: ProductCategory;
}

export interface Image {
  key: string;
  url: string;
}

export interface Product {
  id: string;
  _id?: string;
  title: string;
  price: number;
  description: string;
  stock: number;
  slug: string;
  category: ProductCategory;
  subcategory: ProductSubcategory;
  brand: Brand;
  images: Image[];
  state?: boolean;
}

export interface ProductsResponse {
  ok: boolean;
  count: number;
  pages: number;
  products: Product[];
}

export interface ProductPayload {
  title: string;
  price: number;
  description: string;
  stock: number;
  slug: string;
  category: ProductCategory;
  subcategory: string;
  brand: string;
}

export interface ProductFilters {
  category?: ProductCategory;
  subcategory?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}

export interface BrandPayload {
  name: string;
  slug: string;
}
export interface SubcategoryPayload extends BrandPayload {
  category: ProductCategory;
}
