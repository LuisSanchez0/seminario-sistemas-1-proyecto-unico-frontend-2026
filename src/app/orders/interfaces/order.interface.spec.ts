import { makeItem, makeOrder } from '../testing/order.fixtures';
import { buildOrderTimeline, nextShippingStatus, TimelineStep } from './order.interface';

const states = (steps: TimelineStep[] | null) => steps?.map((step) => step.state);

describe('nextShippingStatus', () => {
  it('avanza un solo paso y termina en entregado', () => {
    expect(nextShippingStatus('ORDER_PLACED')).toBe('PROCESSING');
    expect(nextShippingStatus('PROCESSING')).toBe('SHIPPED');
    expect(nextShippingStatus('SHIPPED')).toBe('DELIVERED');
    expect(nextShippingStatus('DELIVERED')).toBeNull();
  });
});

describe('buildOrderTimeline', () => {
  it('pedido recién creado: solo "realizado" está completo y el pago es el siguiente paso', () => {
    expect(states(buildOrderTimeline(makeOrder()))).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('pago confirmado: el siguiente paso es preparar', () => {
    const order = makeOrder({ paymentState: 'PAGO_REALIZADO', orderState: 'PENDIENTE' });
    expect(states(buildOrderTimeline(order))).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
  });

  it('un paso solo se completa cuando todos los productos lo cumplen', () => {
    const order = makeOrder({
      paymentState: 'PAGO_REALIZADO',
      orderState: 'PARCIALMENTE_ENVIADO',
      items: [
        makeItem({ id: 'a', shippingStatus: 'SHIPPED' }),
        makeItem({ id: 'b', shippingStatus: 'PROCESSING' }),
      ],
    });
    // Preparar está completo (ambos ≥ PROCESSING); enviar aún no (uno sigue preparándose).
    expect(states(buildOrderTimeline(order))).toEqual(['done', 'done', 'done', 'current', 'upcoming']);
  });

  it('todos enviados dejan "entregado" como siguiente; todos entregados lo completan', () => {
    const shipped = makeOrder({
      paymentState: 'PAGO_REALIZADO',
      orderState: 'ENVIADO',
      items: [makeItem({ shippingStatus: 'SHIPPED' })],
    });
    expect(states(buildOrderTimeline(shipped))).toEqual(['done', 'done', 'done', 'done', 'current']);

    const delivered = makeOrder({
      paymentState: 'PAGO_REALIZADO',
      orderState: 'COMPLETADO',
      items: [makeItem({ shippingStatus: 'DELIVERED' })],
    });
    expect(states(buildOrderTimeline(delivered))).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('no hay seguimiento para pedidos cancelados o reembolsados', () => {
    expect(buildOrderTimeline(makeOrder({ orderState: 'CANCELADO', paymentState: 'CANCELADO' }))).toBeNull();
    expect(buildOrderTimeline(makeOrder({ orderState: 'REEMBOLSADO', paymentState: 'REEMBOLSADO' }))).toBeNull();
  });
});
