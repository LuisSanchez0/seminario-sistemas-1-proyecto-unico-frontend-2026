import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { map } from 'rxjs';
import { OrderService } from '../../../orders/services/order.service';
import { MY_ORDERS_FILTERS, MyOrdersFilter } from '../../../orders/interfaces/order.interface';
import { OrderStatusBadgeComponent } from '../../../orders/components/order-status-badge/order-status-badge.component';
import { PaginationService } from '../../../shared/components/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination/pagination.component';
import { apiErrorMessage } from '../../../shared/services/notification.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, OrderStatusBadgeComponent, PaginationComponent],
  templateUrl: './orders-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPageComponent {
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly pagination = inject(PaginationService);

  readonly filters = MY_ORDERS_FILTERS;
  readonly apiErrorMessage = apiErrorMessage;

  /** El filtro vive en la URL (`?filter=`) para que se conserve al recargar o compartir el enlace. */
  readonly filter = toSignal(
    this.route.queryParamMap.pipe(
      map((params): MyOrdersFilter => {
        const value = params.get('filter');
        return MY_ORDERS_FILTERS.find((option) => option.value === value)?.value ?? 'all';
      }),
    ),
    { initialValue: 'all' as MyOrdersFilter },
  );
  readonly page = this.pagination.currentPage;
  readonly emptyMessage = computed(
    () => MY_ORDERS_FILTERS.find((option) => option.value === this.filter())?.empty ?? '',
  );

  readonly ordersResource = rxResource({
    params: () => ({ filter: this.filter(), page: this.page() }),
    stream: ({ params }) =>
      this.orders.getMyOrders(params.filter, {
        limit: PAGE_SIZE,
        offset: (params.page - 1) * PAGE_SIZE,
      }),
  });

  readonly response = computed(() =>
    this.ordersResource.hasValue() ? this.ordersResource.value() : undefined,
  );
}
