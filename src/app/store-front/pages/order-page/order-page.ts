import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { map } from 'rxjs';
import { OrderService } from '../../../orders/services/order.service';
import { buildOrderTimeline, Order } from '../../../orders/interfaces/order.interface';
import { OrderStatusBadgeComponent } from '../../../orders/components/order-status-badge/order-status-badge.component';
import { OrderTimelineComponent } from '../../../orders/components/order-timeline/order-timeline.component';
import { PaymentAccountComponent } from '../../../orders/components/payment-account/payment-account.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  apiErrorMessage,
  NotificationService,
} from '../../../shared/services/notification.service';
import { receiptFileError } from '../check-out-page/components/checkout-payment-card/checkout-payment-card.component';

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    OrderStatusBadgeComponent,
    OrderTimelineComponent,
    PaymentAccountComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './order-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPage {
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly cancelDialog = viewChild.required(ConfirmDialogComponent);

  readonly apiErrorMessage = apiErrorMessage;
  private readonly orderId = toSignal(this.route.paramMap.pipe(map((p) => p.get('orderId'))), {
    initialValue: this.route.snapshot.paramMap.get('orderId'),
  });
  /** `?placed=1` lo agrega el checkout para mostrar la confirmación del pedido recién creado. */
  readonly justPlaced = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('placed') === '1')), {
    initialValue: this.route.snapshot.queryParamMap.get('placed') === '1',
  });

  readonly orderResource = rxResource({
    params: () => ({ id: this.orderId() }),
    stream: ({ params }) => this.orders.getMyOrder(params.id ?? ''),
  });

  /** Último pedido conocido: el cargado o el devuelto por una acción (subir comprobante, cancelar). */
  private readonly updated = signal<Order | null>(null);
  readonly order = computed<Order | undefined>(() => {
    const fresh = this.orderResource.hasValue() ? this.orderResource.value() : undefined;
    const local = this.updated();
    return local && local.id === (fresh?.id ?? local.id) ? local : fresh;
  });
  readonly timeline = computed(() => {
    const order = this.order();
    return order ? buildOrderTimeline(order) : null;
  });
  readonly notFound = computed(() => {
    const error = this.orderResource.error() as { status?: number } | undefined;
    return error?.status === 404 || error?.status === 400;
  });

  readonly uploading = signal(false);
  readonly uploadError = signal('');
  readonly cancelling = signal(false);
  readonly cancelError = signal('');

  onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const order = this.order();
    input.value = '';
    if (!file || !order || this.uploading()) return;

    const problem = receiptFileError(file);
    if (problem) {
      this.uploadError.set(problem);
      return;
    }
    this.uploading.set(true);
    this.uploadError.set('');
    this.orders.uploadPaymentReceipt(order.id, file).subscribe({
      next: (updated) => {
        this.updated.set(updated);
        this.uploading.set(false);
        this.notifications.success('Comprobante enviado', 'Revisaremos tu pago pronto.');
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        const message = apiErrorMessage(error, 'No se pudo subir el comprobante. Intenta de nuevo.');
        this.uploadError.set(message);
        this.notifications.error('Error al subir el comprobante', message);
      },
    });
  }

  askCancel(): void {
    this.cancelError.set('');
    this.cancelDialog().open();
  }

  cancelOrder(): void {
    const order = this.order();
    if (!order || this.cancelling()) return;
    this.cancelling.set(true);
    this.cancelError.set('');
    this.orders.cancelMyOrder(order.id).subscribe({
      next: (updated) => {
        this.updated.set(updated);
        this.cancelling.set(false);
        this.cancelDialog().close();
        this.notifications.success('Pedido cancelado', 'Los productos volvieron al inventario.');
      },
      error: (error: unknown) => {
        this.cancelling.set(false);
        this.cancelError.set(apiErrorMessage(error, 'No se pudo cancelar el pedido.'));
        // El pedido pudo cambiar (p. ej. el pago ya se confirmó): se recarga para mostrar la verdad.
        this.updated.set(null);
        this.orderResource.reload();
      },
    });
  }
}
