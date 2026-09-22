export interface ProductStat {
  productId?: string;
  title?: string;
  slug?: string;
  totalSold: number;
  totalRevenue?: number;
  image?: string;
}

export interface DepartmentStat {
  department: string;
  totalSales?: number;
  totalRevenue?: number;
}

/**
 * Normalized frontend model used by the dashboard component.
 * All numeric fields are required — never undefined.
 */
export interface DashboardStats {
  commonUsersCount: number;
  validSalesCount: number;
  systemRevenue: number;
  topSellingProducts: ProductStat[];
  leastSellingProducts: ProductStat[];
  topDepartments: DepartmentStat[];
}

/**
 * Raw response from GET /api/stats/dashboard.
 * Backend now returns all fields at the top level with canonical names.
 * Optional markers kept only as safety net for partial responses.
 */
export interface DashboardStatsResponse {
  ok: boolean;
  commonUsersCount?: number;
  validSalesCount?: number;
  systemRevenue?: number;
  topSellingProducts?: ProductStat[];
  leastSellingProducts?: ProductStat[];
  topDepartments?: DepartmentStat[];
  msg?: string;
}

export interface CommonUsersCountResponse {
  ok: boolean;
  commonUsersCount: number;
}

export interface ValidSalesCountResponse {
  ok: boolean;
  validSalesCount: number;
}

export interface SystemRevenueResponse {
  ok: boolean;
  systemRevenue: number;
}

export interface TopSellingProductsResponse {
  ok: boolean;
  topSellingProducts: ProductStat[];
}

export interface LeastSellingProductsResponse {
  ok: boolean;
  leastSellingProducts: ProductStat[];
}

export interface TopDepartmentsResponse {
  ok: boolean;
  topDepartments: DepartmentStat[];
}
