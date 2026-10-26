import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { makeOrder } from '../testing/order.fixtures';
import { environment } from '../../../environments/environment';

const url = `${environment.baseUrl}/orders`;

describe('OrderService', () => {
  let service: OrderService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('crea el pedido enviando exactamente el payload recibido', () => {
    const payload = {
      items: [{ product: 'p1', quantity: 2 }],
      shippingAddress: 'a1',
      paymentMethod: 'TRANSFERENCIA' as const,
      nit: 'CF',
      checkoutKey: 'key-12345678',
    };
    service.createOrder(payload).subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ ok: true, replayed: false, order: makeOrder() });
  });

  it('sube el comprobante como multipart en el campo "archivo" y devuelve el pedido', () => {
    const file = new File(['x'], 'comprobante.png', { type: 'image/png' });
    let result: unknown;
    service.uploadPaymentReceipt('o1', file).subscribe((order) => (result = order));
    const request = http.expectOne(`${url}/o1/payment-receipt`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('archivo')).toBe(file);
    request.flush({ ok: true, order: makeOrder({ id: 'o1' }) });
    expect((result as { id: string }).id).toBe('o1');
  });

  it('lista mis pedidos con filtro y paginación', () => {
    service.getMyOrders('in-progress', { limit: 10, offset: 20 }).subscribe();
    const request = http.expectOne((req) => req.url === `${url}/mine`);
    expect(request.request.params.get('filter')).toBe('in-progress');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('offset')).toBe('20');
    request.flush({ ok: true, count: 0, pages: 0, orders: [] });
  });

  it('cancela con motivo recortado y sin motivo vacío', () => {
    service.cancelMyOrder('o1', '  ya no lo necesito  ').subscribe();
    const first = http.expectOne(`${url}/o1/cancel`);
    expect(first.request.body).toEqual({ reason: 'ya no lo necesito' });
    first.flush({ ok: true, order: makeOrder() });

    service.cancelMyOrder('o1', '   ').subscribe();
    const second = http.expectOne(`${url}/o1/cancel`);
    expect(second.request.body.reason).toBeUndefined();
    second.flush({ ok: true, order: makeOrder() });
  });

  it('el listado de administración omite filtros vacíos y usa los nombres del contrato', () => {
    service
      .getAdminOrders({
        orderCode: 'LUM-1',
        customer: '',
        paymentState: 'PAGO_REALIZADO',
        startDate: '2026-10-01',
        offset: 10,
      })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${url}/admin`);
    expect(request.request.params.get('orderCode')).toBe('LUM-1');
    expect(request.request.params.has('customer')).toBe(false);
    expect(request.request.params.get('paymentState')).toBe('PAGO_REALIZADO');
    expect(request.request.params.get('startDate')).toBe('2026-10-01');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('offset')).toBe('10');
    request.flush({ ok: true, count: 0, pages: 0, orders: [] });
  });

  it('actualiza pago y envío con PATCH en las rutas de administración', () => {
    service.updatePaymentState('o1', { paymentState: 'PAGO_REALIZADO', paymentReference: 'R-1' }).subscribe();
    const payment = http.expectOne(`${url}/admin/o1/payment-state`);
    expect(payment.request.method).toBe('PATCH');
    expect(payment.request.body).toEqual({ paymentState: 'PAGO_REALIZADO', paymentReference: 'R-1' });
    payment.flush({ ok: true, order: makeOrder() });

    service.updateShippingStatus('o1', [{ itemId: 'i1', shippingStatus: 'PROCESSING' }]).subscribe();
    const shipping = http.expectOne(`${url}/admin/o1/shipping-status`);
    expect(shipping.request.method).toBe('PATCH');
    expect(shipping.request.body).toEqual({ items: [{ itemId: 'i1', shippingStatus: 'PROCESSING' }] });
    shipping.flush({ ok: true, order: makeOrder() });
  });
});
