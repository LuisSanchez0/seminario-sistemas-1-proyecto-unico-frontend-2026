import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { SellService } from '../../../sell/services/sell.service';
import {
  MyOrdersFilter,
  ORDER_STATE_LABELS,
  PAYMENT_STATE_LABELS,
  OrderState,
  PaymentState,
  SellSummary,
} from '../../../sell/interfaces/sell.interface';

interface OrderTab {
  label: string;
  filter: MyOrdersFilter;
  emptyMessage: string;
}

const ORDER_TABS: OrderTab[] = [
  {
    label: 'En proceso',
    filter: 'in-progress',
    emptyMessage: 'No tienes pedidos en proceso.',
  },
  {
    label: 'Completadas',
    filter: 'completed',
    emptyMessage: 'Aún no tienes pedidos completados.',
  },
  {
    label: 'Canceladas',
    filter: 'cancelled',
    emptyMessage: 'No tienes pedidos cancelados.',
  },
  {
    label: 'Todas',
    filter: 'all',
    emptyMessage: 'Aún no tienes pedidos.',
  },
];

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './orders-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPageComponent {
  private readonly sellService = inject(SellService);
  private readonly router = inject(Router);

  readonly tabs = ORDER_TABS;
  readonly activeFilter = signal<MyOrdersFilter>('in-progress');

  readonly ordersResource = rxResource<SellSummary[], MyOrdersFilter>({
    params: () => this.activeFilter(),
    stream: ({ params: filter }) =>
      this.sellService.getMyOrders(filter).pipe(map((r) => r.sells)),
    defaultValue: [],
  });

  get activeTab(): OrderTab {
    return ORDER_TABS.find((t) => t.filter === this.activeFilter())!;
  }

  selectTab(filter: MyOrdersFilter): void {
    this.activeFilter.set(filter);
  }

  goToOrder(sell: SellSummary): void {
    this.router.navigate(['/my-orders', sell.id]);
  }

  retry(): void {
    this.ordersResource.reload();
  }

  trackById(_index: number, sell: SellSummary): string {
    return sell.id;
  }

  getOrderStateLabel(state: OrderState): string {
    return ORDER_STATE_LABELS[state] ?? state;
  }

  getPaymentStateLabel(state: PaymentState): string {
    return PAYMENT_STATE_LABELS[state] ?? state;
  }

  getOrderStateBadge(state: OrderState): string {
    switch (state) {
      case 'COMPLETADO':
        return 'bg-green-100 text-green-700 ring-1 ring-green-200';
      case 'ENVIADO':
        return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
      case 'EN_PROCESO':
        return 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200';
      case 'PARCIALMENTE_ENVIADO':
        return 'bg-sky-100 text-sky-700 ring-1 ring-sky-200';
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
      case 'CANCELADO':
        return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      case 'REEMBOLSADO':
        return 'bg-purple-100 text-purple-700 ring-1 ring-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
    }
  }

  getPaymentStateBadge(state: PaymentState): string {
    switch (state) {
      case 'PAGO_REALIZADO':
        return 'bg-green-100 text-green-700 ring-1 ring-green-200';
      case 'EN_ESPERA_DE_PAGO':
        return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
      case 'CANCELADO':
        return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      case 'REEMBOLSADO':
        return 'bg-purple-100 text-purple-700 ring-1 ring-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
    }
  }
}
