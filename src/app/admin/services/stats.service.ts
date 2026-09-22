import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CommonUsersCountResponse,
  DashboardStatsResponse,
  LeastSellingProductsResponse,
  SystemRevenueResponse,
  TopDepartmentsResponse,
  TopSellingProductsResponse,
  ValidSalesCountResponse,
} from '../interfaces/stats.interface';

const baseUrl = environment.baseUrl;

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${baseUrl}/stats/dashboard`);
  }

  getCommonUsersCount(): Observable<CommonUsersCountResponse> {
    return this.http.get<CommonUsersCountResponse>(
      `${baseUrl}/stats/users/common-role/count`,
    );
  }

  getTopSellingProductsStats(): Observable<TopSellingProductsResponse> {
    return this.http.get<TopSellingProductsResponse>(
      `${baseUrl}/stats/products/top-selling`,
    );
  }

  getLeastSellingProductsStats(): Observable<LeastSellingProductsResponse> {
    return this.http.get<LeastSellingProductsResponse>(
      `${baseUrl}/stats/products/least-selling`,
    );
  }

  getTopDepartmentsStats(): Observable<TopDepartmentsResponse> {
    return this.http.get<TopDepartmentsResponse>(
      `${baseUrl}/stats/sales/top-departments`,
    );
  }

  getValidSalesCount(): Observable<ValidSalesCountResponse> {
    return this.http.get<ValidSalesCountResponse>(
      `${baseUrl}/stats/sales/count`,
    );
  }

  getSystemRevenue(): Observable<SystemRevenueResponse> {
    return this.http.get<SystemRevenueResponse>(
      `${baseUrl}/stats/sales/revenue`,
    );
  }
}
