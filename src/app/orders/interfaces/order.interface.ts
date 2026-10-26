/** Contrato de pedidos del backend (`/api/orders`). */

export type PaymentState = 'EN_ESPERA_DE_PAGO' | 'PAGO_REALIZADO' | 'CANCELADO' | 'REEMBOLSADO';

export type OrderState =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'PARCIALMENTE_ENVIADO'
  | 'ENVIADO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

/** Estado de preparación/envío de un producto del pedido, en orden de avance. */
export type ShippingStatus = 'ORDER_PLACED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';

export type PaymentMethod = 'TRANSFERENCIA';

export type MyOrdersFilter = 'all' | 'in-progress' | 'completed' | 'cancelled';

export const PAYMENT_STATES: readonly PaymentState[] = [
  'EN_ESPERA_DE_PAGO',
  'PAGO_REALIZADO',
  'CANCELADO',
  'REEMBOLSADO',
];

export const ORDER_STATES: readonly OrderState[] = [
  'PENDIENTE',
  'EN_PROCESO',
  'PARCIALMENTE_ENVIADO',
  'ENVIADO',
  'COMPLETADO',
  'CANCELADO',
  'REEMBOLSADO',
];

export const SHIPPING_STATUSES: readonly ShippingStatus[] = [
  'ORDER_PLACED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  EN_ESPERA_DE_PAGO: 'Pago pendiente',
  PAGO_REALIZADO: 'Pago confirmado',
  CANCELADO: 'Cancelado',
  REEMBOLSADO: 'Reembolsado',
};

export const ORDER_STATE_LABELS: Record<OrderState, string> = {
  PENDIENTE: 'Pedido recibido',
  EN_PROCESO: 'Preparando',
  PARCIALMENTE_ENVIADO: 'Enviado parcialmente',
  ENVIADO: 'Enviado',
  COMPLETADO: 'Entregado',
  CANCELADO: 'Cancelado',
  REEMBOLSADO: 'Reembolsado',
};

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  ORDER_PLACED: 'Pedido realizado',
  PROCESSING: 'Preparando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
};

export const MY_ORDERS_FILTERS: ReadonlyArray<{
  value: MyOrdersFilter;
  label: string;
  empty: string;
}> = [
  { value: 'all', label: 'Todos', empty: 'Aún no tienes pedidos.' },
  { value: 'in-progress', label: 'En curso', empty: 'No tienes pedidos en curso.' },
  { value: 'completed', label: 'Entregados', empty: 'Aún no tienes pedidos entregados.' },
  { value: 'cancelled', label: 'Cancelados', empty: 'No tienes pedidos cancelados.' },
];

export interface ShippingHistoryEntry {
  status: ShippingStatus;
  changedAt: string;
}

export interface OrderItem {
  id: string;
  product: string;
  title: string;
  brandName: string | null;
  slug: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  shippingStatus: ShippingStatus;
  shippingStatusHistory: ShippingHistoryEntry[];
}

export interface OrderShippingAddress {
  department: string;
  municipality: string;
  street: string | null;
  full_address: string;
  phoneNumber: string;
}

export interface PaymentReceipt {
  /** URL firmada y temporal; es `null` si el almacenamiento no pudo firmarla. */
  url: string | null;
  uploadedAt: string;
}

export interface OrderBuyer {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  orderCode: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod: PaymentMethod;
  paymentState: PaymentState;
  orderState: OrderState;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  subtotal: number;
  shippingCost: number;
  total: number;
  nit: string;
  notes: string | null;
  paymentReference: string | null;
  paymentReceipt: PaymentReceipt | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  /** El cliente puede cancelar solo mientras el pago no se confirmó. */
  canCancel: boolean;
  awaitingReceipt: boolean;
  /** Solo en las respuestas de administración. */
  buyer?: OrderBuyer | null;
}

export interface OrderPreviewItem {
  title: string;
  imageUrl: string | null;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  orderCode: string;
  createdAt: string;
  total: number;
  paymentState: PaymentState;
  orderState: OrderState;
  itemCount: number;
  unitCount: number;
  preview: OrderPreviewItem[];
  canCancel: boolean;
  awaitingReceipt: boolean;
  buyer?: OrderBuyer | null;
  municipality?: string | null;
  department?: string | null;
}

export interface OrderResponse {
  ok: boolean;
  msg?: string;
  order: Order;
}

export interface CreateOrderResponse extends OrderResponse {
  /** `true` si el servidor devolvió un pedido ya existente para la misma llave de checkout. */
  replayed: boolean;
}

export interface OrderListResponse {
  ok: boolean;
  count: number;
  pages: number;
  orders: OrderSummary[];
}

export interface CreateOrderPayload {
  items: Array<{ product: string; quantity: number }>;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  nit?: string;
  notes?: string;
  /** Identificador del intento de checkout: reintentar con la misma llave no duplica el pedido. */
  checkoutKey: string;
}

export interface OrderPagination {
  limit?: number;
  offset?: number;
}

export interface AdminOrdersQuery extends OrderPagination {
  orderCode?: string;
  customer?: string;
  paymentState?: PaymentState;
  orderState?: OrderState;
  /** `YYYY-MM-DD` en hora de Guatemala. */
  startDate?: string;
  endDate?: string;
}

export interface UpdatePaymentStatePayload {
  paymentState: PaymentState;
  paymentReference?: string;
  reason?: string;
}

export interface UpdateShippingItem {
  itemId: string;
  shippingStatus: ShippingStatus;
}

// ── Seguimiento ──────────────────────────────────────────────────────────────

export type TimelineStepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  key: 'placed' | 'paid' | 'preparing' | 'shipped' | 'delivered';
  label: string;
  state: TimelineStepState;
}

const TIMELINE_LABELS: ReadonlyArray<[TimelineStep['key'], string]> = [
  ['placed', 'Pedido realizado'],
  ['paid', 'Pago confirmado'],
  ['preparing', 'Preparando'],
  ['shipped', 'Enviado'],
  ['delivered', 'Entregado'],
];

/** Siguiente paso de un producto, o `null` si ya fue entregado. */
export function nextShippingStatus(status: ShippingStatus): ShippingStatus | null {
  return SHIPPING_STATUSES[SHIPPING_STATUSES.indexOf(status) + 1] ?? null;
}

/**
 * Pasos completados del seguimiento. Un paso cuenta como completado solo cuando lo cumplen
 * *todos* los productos; mientras tanto el estado del pedido ("Enviado parcialmente") lo explica.
 * Los pedidos cancelados o reembolsados no tienen seguimiento.
 */
export function buildOrderTimeline(
  order: Pick<Order, 'paymentState' | 'orderState' | 'items'>,
): TimelineStep[] | null {
  if (order.orderState === 'CANCELADO' || order.orderState === 'REEMBOLSADO') return null;

  const slowest = Math.min(
    ...order.items.map((item) => SHIPPING_STATUSES.indexOf(item.shippingStatus)),
  );
  // Posición del último paso completado: 0 = realizado, 1 = pagado, 2 = preparando, ...
  let completed = 0;
  if (order.paymentState === 'PAGO_REALIZADO') completed = 1;
  if (completed === 1 && slowest >= 1) completed = 2;
  if (completed === 2 && slowest >= 2) completed = 3;
  if (completed === 3 && slowest >= 3) completed = 4;

  return TIMELINE_LABELS.map(([key, label], index) => ({
    key,
    label,
    state: index <= completed ? 'done' : index === completed + 1 ? 'current' : 'upcoming',
  }));
}
