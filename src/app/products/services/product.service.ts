import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { concatMap, finalize, from, map, Observable, of, shareReplay, tap, toArray } from 'rxjs';
import { NotificationService, apiErrorMessage } from '../../shared/services/notification.service';
import { environment } from '../../../environments/environment';
import {
  Brand,
  BrandPayload,
  Image,
  Product,
  ProductFilters,
  ProductPayload,
  ProductsResponse,
  ProductSubcategory,
  ProductCategory,
  SubcategoryPayload,
} from '../interfaces/product.interface';

const baseUrl = environment.baseUrl;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  private readonly productsCache = new Map<string, ProductsResponse>();
  private readonly productCache = new Map<string, Product>();
  private readonly subcategoryRequests = new Map<
    ProductCategory,
    Observable<ProductSubcategory[]>
  >();
  private readonly subcategoryCache = signal<
    Partial<Record<ProductCategory, ProductSubcategory[]>>
  >({});
  readonly subcategoriesByCategory = this.subcategoryCache.asReadonly();
  readonly products = signal<Product[]>([]);
  readonly productsLoading = signal(false);
  private readonly productsPage = signal(0);

  clearProductsCache(): void {
    this.subcategoryCache.set({});
    this.productsCache.clear();
    this.productCache.clear();
    this.products.set([]);
    this.productsPage.set(0);
  }

  private params(options: ProductFilters): HttpParams {
    let params = new HttpParams();
    for (const key of ['category', 'subcategory', 'brand', 'limit', 'offset'] as const) {
      const value = options[key];
      if (value !== undefined && value !== null && value !== '') params = params.set(key, value);
    }
    return params;
  }

  getProducts(options: ProductFilters = {}): Observable<ProductsResponse> {
    return this.list('products', options);
  }

  getProductsWithStock(options: ProductFilters = {}): Observable<ProductsResponse> {
    return this.list('products/stock', options);
  }

  private list(endpoint: string, options: ProductFilters): Observable<ProductsResponse> {
    const params = this.params(options);
    const key = `${endpoint}?${params.toString()}`;
    const cached = this.productsCache.get(key);
    if (cached) return of(cached);
    return this.http
      .get<ProductsResponse>(`${baseUrl}/${endpoint}`, { params })
      .pipe(tap((response) => this.productsCache.set(key, response)));
  }

  getProductsCache(options: ProductFilters = {}): void {
    if (this.productsLoading()) return;
    this.productsLoading.set(true);
    const limit = options.limit ?? 6;
    this.getProductsWithStock({ ...options, limit, offset: this.productsPage() * limit })
      .pipe(finalize(() => this.productsLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.products.update((current) => [...current, ...response.products]);
          this.productsPage.update((page) => page + 1);
        },
        error: (error) =>
          this.notifications.error('No se pudieron cargar los productos', apiErrorMessage(error)),
      });
  }

  getProductById(id: string): Observable<Product> {
    const cached = this.productCache.get(id);
    if (cached) return of(cached);
    return this.http
      .get<Product & { ok: boolean }>(`${baseUrl}/products/${id}`)
      .pipe(tap((product) => this.updateProductCache(product)));
  }

  getProductBySlug(slug: string): Observable<Product> {
    const cached = this.productCache.get(slug);
    if (cached) return of(cached);
    return this.http
      .get<Product & { ok: boolean }>(`${baseUrl}/products/slug/${slug}`)
      .pipe(tap((product) => this.updateProductCache(product)));
  }

  createProduct(payload: ProductPayload): Observable<Product> {
    return this.http
      .post<Product & { ok: boolean }>(`${baseUrl}/products`, payload)
      .pipe(tap((product) => this.updateProductsCache(product)));
  }

  updateProduct(id: string, payload: Partial<ProductPayload>): Observable<Product> {
    return this.http
      .patch<Product & { ok: boolean }>(`${baseUrl}/products/${id}`, payload)
      .pipe(tap((product) => this.updateProductsCache(product)));
  }

  deleteProduct(id: string): Observable<{ ok: boolean }> {
    return this.http
      .delete<{ ok: boolean }>(`${baseUrl}/products/${id}`)
      .pipe(tap(() => this.clearProductsCache()));
  }

  updateProductsCache(product: Product): void {
    // Membership, ordering and page counts may change after any catalog mutation.
    this.clearProductsCache();
    this.updateProductCache(product);
  }

  updateProductCache(product: Product): void {
    this.productCache.set(product.id, product);
    this.productCache.set(product.slug, product);
  }

  uploadImages(product: Product, images?: FileList): Observable<Image[]> {
    return from(Array.from(images ?? [])).pipe(
      concatMap((file) => this.uploadImage(file, product)),
      toArray(),
    );
  }

  uploadImage(file: File, product: Product): Observable<Image> {
    const data = new FormData();
    data.append('archivo', file);
    return this.http
      .post<{ ok: boolean; model: Product }>(`${baseUrl}/upload/products/${product.id}`, data)
      .pipe(
        tap((response) => this.updateProductsCache(response.model)),
        map((response) => response.model.images[response.model.images.length - 1]),
      );
  }

  deleteImage(id: string, key: string): Observable<{ ok: boolean }> {
    return this.http
      .delete<{ ok: boolean }>(`${baseUrl}/upload/products/${id}`, { body: { key } })
      .pipe(tap(() => this.clearProductsCache()));
  }

  getBrands(): Observable<Brand[]> {
    return this.http
      .get<{ ok: boolean; brands: Brand[] }>(`${baseUrl}/brands`)
      .pipe(map((response) => response.brands.filter((brand) => brand.state !== false)));
  }
  getBrandById(id: string): Observable<Brand> {
    return this.http
      .get<Brand | { brand: Brand }>(`${baseUrl}/brands/${id}`)
      .pipe(map((response) => ('brand' in response ? response.brand : response)));
  }
  createBrand(payload: BrandPayload): Observable<Brand> {
    return this.http.post<Brand | { brand: Brand }>(`${baseUrl}/brands`, payload).pipe(
      map((response) => ('brand' in response ? response.brand : response)),
      tap(() => this.clearProductsCache()),
    );
  }
  updateBrand(id: string, payload: BrandPayload): Observable<Brand> {
    return this.http.patch<Brand | { brand: Brand }>(`${baseUrl}/brands/${id}`, payload).pipe(
      map((response) => ('brand' in response ? response.brand : response)),
      tap(() => this.clearProductsCache()),
    );
  }
  deleteBrand(id: string): Observable<{ ok: boolean }> {
    return this.http
      .delete<{ ok: boolean }>(`${baseUrl}/brands/${id}`)
      .pipe(tap(() => this.clearProductsCache()));
  }
  getSubcategories(category?: ProductCategory): Observable<ProductSubcategory[]> {
    const endpoint = category ? `subcategories/category/${category}` : 'subcategories';
    return this.http
      .get<{ ok: boolean; subcategories: ProductSubcategory[] }>(`${baseUrl}/${endpoint}`)
      .pipe(map((response) => response.subcategories.filter((item) => item.state !== false)));
  }
  getSubcategoriesByCategory(
    category: ProductCategory,
    refresh = false,
  ): Observable<ProductSubcategory[]> {
    const cached = this.subcategoryCache()[category];
    if (cached && !refresh) return of(cached);
    const pending = this.subcategoryRequests.get(category);
    if (pending) return pending;
    const request = this.getSubcategories(category).pipe(
      map((items) => items.filter((item) => item.category === category)),
      tap((items) => this.subcategoryCache.update((cache) => ({ ...cache, [category]: items }))),
      finalize(() => this.subcategoryRequests.delete(category)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.subcategoryRequests.set(category, request);
    return request;
  }
  getSubcategoryById(id: string): Observable<ProductSubcategory> {
    return this.http
      .get<ProductSubcategory | { subcategory: ProductSubcategory }>(
        `${baseUrl}/subcategories/${id}`,
      )
      .pipe(map((response) => ('subcategory' in response ? response.subcategory : response)));
  }
  createSubcategory(payload: SubcategoryPayload): Observable<ProductSubcategory> {
    return this.http
      .post<ProductSubcategory | { subcategory: ProductSubcategory }>(
        `${baseUrl}/subcategories`,
        payload,
      )
      .pipe(
        map((response) => ('subcategory' in response ? response.subcategory : response)),
        tap(() => this.clearProductsCache()),
      );
  }
  updateSubcategory(id: string, payload: SubcategoryPayload): Observable<ProductSubcategory> {
    return this.http
      .patch<ProductSubcategory | { subcategory: ProductSubcategory }>(
        `${baseUrl}/subcategories/${id}`,
        payload,
      )
      .pipe(
        map((response) => ('subcategory' in response ? response.subcategory : response)),
        tap(() => this.clearProductsCache()),
      );
  }
  deleteSubcategory(id: string): Observable<{ ok: boolean }> {
    return this.http
      .delete<{ ok: boolean }>(`${baseUrl}/subcategories/${id}`)
      .pipe(tap(() => this.clearProductsCache()));
  }
}
