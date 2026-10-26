import { Order, OrderItem, OrderSummary } from '../interfaces/order.interface';

/** Datos de prueba con la forma exacta que devuelve la API de pedidos. */
export function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: '600000000000000000000001',
    product: '500000000000000000000001',
    title: 'Fit Me Matte',
    brandName: 'Maybelline',
    slug: 'fit-me-matte',
    imageUrl: 'https://example.com/fit-me.png',
    unitPrice: 85.5,
    quantity: 2,
    subtotal: 171,
    shippingStatus: 'ORDER_PLACED',
    shippingStatusHistory: [{ status: 'ORDER_PLACED', changedAt: '2026-10-24T10:00:00.000Z' }],
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: '700000000000000000000001',
    orderCode: 'LUM-20261024-ABC123',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
    paymentMethod: 'TRANSFERENCIA',
    paymentState: 'EN_ESPERA_DE_PAGO',
    orderState: 'PENDIENTE',
    items: [makeItem()],
    shippingAddress: {
      department: 'Guatemala',
      municipality: 'Mixco',
      street: 'Calle 1',
      full_address: '5a avenida 10-20, zona 1',
      phoneNumber: '55512345',
    },
    subtotal: 171,
    shippingCost: 25,
    total: 196,
    nit: 'CF',
    notes: null,
    paymentReference: null,
    paymentReceipt: null,
    paidAt: null,
    cancelledAt: null,
    refundedAt: null,
    completedAt: null,
    cancellationReason: null,
    canCancel: true,
    awaitingReceipt: true,
    buyer: { id: '800000000000000000000001', name: 'Ana López', email: 'ana@example.com' },
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: '700000000000000000000001',
    orderCode: 'LUM-20261024-ABC123',
    createdAt: '2026-10-24T10:00:00.000Z',
    total: 196,
    paymentState: 'EN_ESPERA_DE_PAGO',
    orderState: 'PENDIENTE',
    itemCount: 1,
    unitCount: 2,
    preview: [{ title: 'Fit Me Matte', imageUrl: 'https://example.com/fit-me.png', quantity: 2 }],
    canCancel: true,
    awaitingReceipt: true,
    buyer: { id: '800000000000000000000001', name: 'Ana López', email: 'ana@example.com' },
    ...overrides,
  };
}
