import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { map, Observable } from 'rxjs';
import { OrderService } from '../../../orders/services/order.service';
import {
  nextShippingStatus,
  Order,
  OrderItem,
  SHIPPING_STATUS_LABELS,
  ShippingStatus,
} from '../../../orders/interfaces/order.interface';
import { OrderStatusBadgeComponent } from '../../../orders/components/order-status-badge/order-status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  apiErrorMessage,
  NotificationService,
} from '../../../shared/services/notification.service';

export type PaymentAction = 'confirm' | 'cancel' | 'refund';

interface ActionCopy {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  askReason: boolean;
}

const ACTION_COPY: Record<PaymentAction, ActionCopy> = {
  confirm: {
    title: 'Confirmar pago',
    message:
      'Se marcará el pago como recibido y el pedido pasará a preparación. Verifica que el depósito coincida con el total.',
    confirmLabel: 'Confirmar pago',
    confirmClass: 'btn btn-success',
    askReason: false,
  },
  cancel: {
    title: 'Cancelar pedido',
    message:
      'El pedido se cancelará y los productos volverán al inventario. Esta acción no se puede deshacer.',
    confirmLabel: 'Cancelar pedido',
    confirmClass: 'btn btn-error',
    askReason: true,
  },
  refund: {
    title: 'Reembolsar pedido',
    message:
      'Se marcará el pedido como reembolsado y los productos volverán al inventario. Debes devolver el dinero al cliente por tu cuenta.',
    confirmLabel: 'Reembolsar pedido',
    confirmClass: 'btn btn-error',
    askReason: true,
  },
};

@Component({
  selector: 'app-order-admin-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    OrderStatusBadgeComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './order-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderAdminPageComponent {
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = viewChild.required(ConfirmDialogComponent);

  readonly apiErrorMessage = apiErrorMessage;
  readonly shippingLabels = SHIPPING_STATUS_LABELS;
  readonly nextShippingStatus = nextShippingStatus;

  private readonly orderId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });
  readonly orderResource = rxResource({
    params: () => ({ id: this.orderId() }),
    stream: ({ params }) => this.orders.getAdminOrder(params.id ?? ''),
  });

  /** Pedido devuelto por la última acción del administrador (más reciente que el cargado). */
  private readonly updated = signal<Order | null>(null);
  readonly order = computed<Order | undefined>(() => {
    const fresh = this.orderResource.hasValue() ? this.orderResource.value() : undefined;
    const local = this.updated();
    return local && local.id === (fresh?.id ?? local.id) ? local : fresh;
  });

  readonly paymentReference = new FormControl('', { nonNullable: true });
  /** Versión reactiva del campo: un `computed` no detecta cambios de `FormControl.value`. */
  private readonly paymentReferenceText = toSignal(this.paymentReference.valueChanges, {
    initialValue: '',
  });
  readonly reason = new FormControl('', { nonNullable: true });

  readonly action = signal<PaymentAction | null>(null);
  readonly copy = computed(() => ACTION_COPY[this.action() ?? 'confirm']);
  readonly busy = signal(false);
  readonly dialogError = signal('');
  readonly shippingBusy = signal(false);
  readonly shippingError = signal('');

  // ── Reglas de la interfaz (el servidor las vuelve a validar) ───────────────

  readonly awaitingPayment = computed(() => this.order()?.paymentState === 'EN_ESPERA_DE_PAGO');
  readonly canConfirmPayment = computed(() => {
    const order = this.order();
    return (
      !!order &&
      order.paymentState === 'EN_ESPERA_DE_PAGO' &&
      (!!order.paymentReceipt || this.paymentReferenceText().trim() !== '')
    );
  });
  /** Reembolsar solo aplica a pedidos pagados sin productos despachados. */
  readonly canRefund = computed(() => {
    const order = this.order();
    return (
      !!order &&
      order.paymentState === 'PAGO_REALIZADO' &&
      order.items.every((i) => i.shippingStatus === 'ORDER_PLACED' || i.shippingStatus === 'PROCESSING')
    );
  });
  readonly refundBlocked = computed(
    () => this.order()?.paymentState === 'PAGO_REALIZADO' && !this.canRefund(),
  );
  readonly canShip = computed(() => this.order()?.paymentState === 'PAGO_REALIZADO');

  /** Si todos los productos están en el mismo paso, se pueden avanzar juntos. */
  readonly bulkTarget = computed<ShippingStatus | null>(() => {
    const order = this.order();
    if (!order || !this.canShip() || order.items.length < 2) return null;
    const first = order.items[0].shippingStatus;
    return order.items.every((i) => i.shippingStatus === first) ? nextShippingStatus(first) : null;
  });

  // ── Pago ───────────────────────────────────────────────────────────────────

  openAction(action: PaymentAction): void {
    this.action.set(action);
    this.reason.reset();
    this.dialogError.set('');
    this.dialog().open();
  }

  runAction(): void {
    const order = this.order();
    const action = this.action();
    if (!order || !action || this.busy()) return;

    const reason = this.reason.value.trim() || undefined;
    this.busy.set(true);
    this.dialogError.set('');
    const request: Observable<Order> = this.orders.updatePaymentState(
      order.id,
      action === 'confirm'
        ? {
            paymentState: 'PAGO_REALIZADO',
            paymentReference: this.paymentReference.value.trim() || undefined,
          }
        : { paymentState: action === 'cancel' ? 'CANCELADO' : 'REEMBOLSADO', reason },
    );
    request.subscribe({
      next: (updated) => {
        this.updated.set(updated);
        this.busy.set(false);
        this.dialog().close();
        this.notifications.success(
          action === 'confirm'
            ? 'Pago confirmado'
            : action === 'cancel'
              ? 'Pedido cancelado'
              : 'Pedido reembolsado',
        );
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.dialogError.set(apiErrorMessage(error, 'No se pudo actualizar el pago.'));
        // Otro administrador pudo haber cambiado el pedido: se recarga el estado real.
        this.updated.set(null);
        this.orderResource.reload();
      },
    });
  }

  // ── Envío ──────────────────────────────────────────────────────────────────

  advance(item: OrderItem): void {
    const next = nextShippingStatus(item.shippingStatus);
    if (next) this.updateShipping([{ itemId: item.id, shippingStatus: next }]);
  }

  advanceAll(): void {
    const order = this.order();
    const target = this.bulkTarget();
    if (!order || !target) return;
    this.updateShipping(order.items.map((item) => ({ itemId: item.id, shippingStatus: target })));
  }

  private updateShipping(items: Array<{ itemId: string; shippingStatus: ShippingStatus }>): void {
    const order = this.order();
    if (!order || this.shippingBusy()) return;
    this.shippingBusy.set(true);
    this.shippingError.set('');
    this.orders.updateShippingStatus(order.id, items).subscribe({
      next: (updated) => {
        this.updated.set(updated);
        this.shippingBusy.set(false);
        this.notifications.success('Envío actualizado');
      },
      error: (error: unknown) => {
        this.shippingBusy.set(false);
        const message = apiErrorMessage(error, 'No se pudo actualizar el envío.');
        this.shippingError.set(message);
        this.notifications.error('No se pudo actualizar el envío', message);
        this.updated.set(null);
        this.orderResource.reload();
      },
    });
  }
}
