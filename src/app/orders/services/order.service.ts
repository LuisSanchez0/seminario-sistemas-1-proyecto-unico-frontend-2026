import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminOrdersQuery,
  CreateOrderPayload,
  CreateOrderResponse,
  MyOrdersFilter,
  Order,
  OrderListResponse,
  OrderPagination,
  OrderResponse,
  UpdatePaymentStatePayload,
  UpdateShippingItem,
} from '../interfaces/order.interface';

const baseUrl = `${environment.baseUrl}/orders`;

/** Parámetros HTTP sin valores vacíos. */
function toParams(values: Record<string, string | number | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  // ── Cliente ────────────────────────────────────────────────────────────────

  /** Crea el pedido. El servidor calcula precios, envío, total y stock; solo recibe ids y cantidades. */
  createOrder(payload: CreateOrderPayload): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(baseUrl, payload);
  }

  uploadPaymentReceipt(orderId: string, file: File): Observable<Order> {
    const body = new FormData();
    body.append('archivo', file);
    return this.http
      .post<OrderResponse>(`${baseUrl}/${orderId}/payment-receipt`, body)
      .pipe(map((res) => res.order));
  }

  getMyOrders(
    filter: MyOrdersFilter = 'all',
    { limit = 10, offset = 0 }: OrderPagination = {},
  ): Observable<OrderListResponse> {
    return this.http.get<OrderListResponse>(`${baseUrl}/mine`, {
      params: toParams({ filter, limit, offset }),
    });
  }

  getMyOrder(orderId: string): Observable<Order> {
    return this.http.get<OrderResponse>(`${baseUrl}/${orderId}`).pipe(map((res) => res.order));
  }

  cancelMyOrder(orderId: string, reason?: string): Observable<Order> {
    return this.http
      .post<OrderResponse>(`${baseUrl}/${orderId}/cancel`, { reason: reason?.trim() || undefined })
      .pipe(map((res) => res.order));
  }

  // ── Administración ─────────────────────────────────────────────────────────

  getAdminOrders(query: AdminOrdersQuery = {}): Observable<OrderListResponse> {
    const { limit = 10, offset = 0, ...filters } = query;
    return this.http.get<OrderListResponse>(`${baseUrl}/admin`, {
      params: toParams({ ...filters, limit, offset }),
    });
  }

  getAdminOrder(orderId: string): Observable<Order> {
    return this.http
      .get<OrderResponse>(`${baseUrl}/admin/${orderId}`)
      .pipe(map((res) => res.order));
  }

  updatePaymentState(orderId: string, payload: UpdatePaymentStatePayload): Observable<Order> {
    return this.http
      .patch<OrderResponse>(`${baseUrl}/admin/${orderId}/payment-state`, payload)
      .pipe(map((res) => res.order));
  }

  updateShippingStatus(orderId: string, items: UpdateShippingItem[]): Observable<Order> {
    return this.http
      .patch<OrderResponse>(`${baseUrl}/admin/${orderId}/shipping-status`, { items })
      .pipe(map((res) => res.order));
  }
}
