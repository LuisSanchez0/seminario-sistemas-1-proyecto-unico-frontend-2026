import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { map } from 'rxjs';
import { OrderService } from '../../../orders/services/order.service';
import {
  AdminOrdersQuery,
  ORDER_STATES,
  OrderState,
  PAYMENT_STATES,
  PaymentState,
} from '../../../orders/interfaces/order.interface';
import { OrderStatusBadgeComponent } from '../../../orders/components/order-status-badge/order-status-badge.component';
import {
  EMPTY_ORDER_FILTERS,
  OrderAdminFilterValues,
  OrderAdminFiltersComponent,
} from '../../components/order-admin-filters/order-admin-filters.component';
import { PaginationService } from '../../../shared/components/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination/pagination.component';
import { apiErrorMessage } from '../../../shared/services/notification.service';

const PAGE_SIZE = 10;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Component({
  selector: 'app-orders-admin-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    OrderStatusBadgeComponent,
    OrderAdminFiltersComponent,
    PaginationComponent,
  ],
  templateUrl: './orders-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersAdminPageComponent {
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pagination = inject(PaginationService);

  readonly apiErrorMessage = apiErrorMessage;

  /** Los filtros viven en la URL: se conservan al recargar, volver atrás o compartir el enlace. */
  readonly filters = toSignal(
    this.route.queryParamMap.pipe(
      map((params): OrderAdminFilterValues => {
        const date = (key: string) => (DATE_RE.test(params.get(key) ?? '') ? params.get(key)! : '');
        const paymentState = params.get('paymentState') ?? '';
        const orderState = params.get('orderState') ?? '';
        return {
          orderCode: params.get('orderCode') ?? '',
          customer: params.get('customer') ?? '',
          paymentState: PAYMENT_STATES.includes(paymentState as PaymentState) ? paymentState : '',
          orderState: ORDER_STATES.includes(orderState as OrderState) ? orderState : '',
          startDate: date('startDate'),
          endDate: date('endDate'),
        };
      }),
    ),
    { initialValue: EMPTY_ORDER_FILTERS },
  );
  readonly page = this.pagination.currentPage;
  readonly hasFilters = computed(() => Object.values(this.filters()).some(Boolean));

  readonly ordersResource = rxResource({
    params: () => ({ filters: this.filters(), page: this.page() }),
    stream: ({ params: { filters, page } }) => {
      const query: AdminOrdersQuery = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        orderCode: filters.orderCode || undefined,
        customer: filters.customer || undefined,
        paymentState: (filters.paymentState as PaymentState) || undefined,
        orderState: (filters.orderState as OrderState) || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      return this.orders.getAdminOrders(query);
    },
  });
  readonly response = computed(() =>
    this.ordersResource.hasValue() ? this.ordersResource.value() : undefined,
  );

  constructor() {
    // Si la página pedida ya no existe (p. ej. tras filtrar), se vuelve a la última válida.
    effect(() => {
      const response = this.response();
      if (!this.ordersResource.isLoading() && response && this.page() > Math.max(1, response.pages)) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { page: Math.max(1, response.pages) },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  applyFilters(values: OrderAdminFilterValues): void {
    const queryParams: Record<string, string | number | null> = { page: 1 };
    for (const [key, value] of Object.entries(values)) queryParams[key] = value || null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    this.applyFilters(EMPTY_ORDER_FILTERS);
  }
}
