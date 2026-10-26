import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ORDER_STATE_LABELS,
  OrderState,
  PAYMENT_STATE_LABELS,
  PaymentState,
  SHIPPING_STATUS_LABELS,
  ShippingStatus,
} from '../../interfaces/order.interface';

export type OrderBadgeKind = 'payment' | 'order' | 'shipping';

const TONES = {
  neutral: 'bg-gray-100 text-gray-800 ring-gray-300',
  warning: 'bg-amber-100 text-amber-900 ring-amber-300',
  info: 'bg-sky-100 text-sky-900 ring-sky-300',
  progress: 'bg-indigo-100 text-indigo-900 ring-indigo-300',
  success: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  danger: 'bg-red-100 text-red-900 ring-red-300',
} as const;

type Tone = keyof typeof TONES;

const PAYMENT_TONES: Record<PaymentState, Tone> = {
  EN_ESPERA_DE_PAGO: 'warning',
  PAGO_REALIZADO: 'success',
  CANCELADO: 'danger',
  REEMBOLSADO: 'neutral',
};

const ORDER_TONES: Record<OrderState, Tone> = {
  PENDIENTE: 'warning',
  EN_PROCESO: 'info',
  PARCIALMENTE_ENVIADO: 'progress',
  ENVIADO: 'progress',
  COMPLETADO: 'success',
  CANCELADO: 'danger',
  REEMBOLSADO: 'neutral',
};

const SHIPPING_TONES: Record<ShippingStatus, Tone> = {
  ORDER_PLACED: 'neutral',
  PROCESSING: 'info',
  SHIPPED: 'progress',
  DELIVERED: 'success',
};

/** Etiqueta de estado; el color nunca es el único indicador, siempre lleva texto. */
@Component({
  selector: 'app-order-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
    [class]="tone()"
    >{{ label() }}</span
  >`,
})
export class OrderStatusBadgeComponent {
  readonly kind = input.required<OrderBadgeKind>();
  readonly value = input.required<string>();

  readonly label = computed(() => {
    const value = this.value();
    const labels: Record<string, string> =
      this.kind() === 'payment'
        ? PAYMENT_STATE_LABELS
        : this.kind() === 'order'
          ? ORDER_STATE_LABELS
          : SHIPPING_STATUS_LABELS;
    return labels[value] ?? value;
  });

  readonly tone = computed(() => {
    const value = this.value();
    const tones: Record<string, Tone> =
      this.kind() === 'payment'
        ? PAYMENT_TONES
        : this.kind() === 'order'
          ? ORDER_TONES
          : SHIPPING_TONES;
    return TONES[tones[value] ?? 'neutral'];
  });
}
