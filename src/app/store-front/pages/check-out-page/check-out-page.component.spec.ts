import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { CheckOutPageComponent } from './check-out-page.component';
import { CartProductRef, StoreFront } from '../../services/store-front';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ProductService } from '../../../products/services/product.service';
import { makeOrder } from '../../../orders/testing/order.fixtures';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const url = environment.baseUrl;

const serum: CartProductRef = {
  id: '500000000000000000000001',
  title: 'Sérum vitamina C',
  slug: 'serum-vitamina-c',
  price: 120,
  stock: 5,
  imageUrl: 'https://example.com/serum.png',
};
const address = {
  _id: '900000000000000000000001',
  department: 'Guatemala',
  municipality: 'Mixco',
  full_address: '5a avenida 10-20',
  shipping_cost: 25,
  is_default: true,
  phoneNumber: '55512345',
  recipient: 'u1',
};
const receipt = new File(['img'], 'comprobante.png', { type: 'image/png' });

describe('CheckOutPageComponent (pedido real)', () => {
  const user = signal<{ uid: string } | null>({ uid: 'u1' });
  let fixture: ComponentFixture<CheckOutPageComponent>;
  let component: CheckOutPageComponent;
  let http: HttpTestingController;
  let store: StoreFront;
  let router: Router;
  let notifications: NotificationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ...esGtProviders,
        { provide: AuthService, useValue: { user } },
      ],
    });
    store = TestBed.inject(StoreFront);
    TestBed.tick();
    store.addToCart({ product: serum, quantity: 2 });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notifications = TestBed.inject(NotificationService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CheckOutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${url}/address`).flush({ ok: true, addresses: [address] });
    fixture.detectChanges();
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function ready() {
    component.onReceiptChange({ base64: 'data:image/png;base64,AA==', file: receipt });
    fixture.detectChanges();
  }

  it('no permite confirmar sin comprobante y lo explica', () => {
    expect(component.canPlaceOrder()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Sube el comprobante de pago para continuar');
    component.onPlaceOrder();
    http.expectNone(`${url}/orders`);
  });

  it('no muestra datos bancarios ajenos ni inventa una cuenta', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('967954744');
    expect(text).not.toContain('Mariano');
    expect(text).toContain('te los confirmará la tienda');
  });

  it('envía solo ids y cantidades (sin precios, totales ni estados) con llave de checkout', () => {
    ready();
    expect(component.canPlaceOrder()).toBe(true);
    component.onPlaceOrder();

    const request = http.expectOne(`${url}/orders`);
    expect(request.request.method).toBe('POST');
    const body = request.request.body;
    expect(Object.keys(body).sort()).toEqual(
      ['checkoutKey', 'items', 'nit', 'paymentMethod', 'shippingAddress'].sort(),
    );
    expect(body.items).toEqual([{ product: serum.id, quantity: 2 }]);
    expect(body.shippingAddress).toBe(address._id);
    expect(body.paymentMethod).toBe('TRANSFERENCIA');
    expect(body.nit).toBe('CF');
    expect(body.checkoutKey).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
    request.flush({ ok: true, replayed: false, order: makeOrder() });
    http.expectOne(`${url}/orders/${makeOrder().id}/payment-receipt`).flush({ ok: true, order: makeOrder() });
  });

  it('crea el pedido, sube el comprobante, vacía el carrito y abre la confirmación', () => {
    const clearCache = vi.spyOn(TestBed.inject(ProductService), 'clearProductsCache');
    ready();
    component.onPlaceOrder();
    expect(component.isPlacingOrder()).toBe(true);

    http.expectOne(`${url}/orders`).flush({ ok: true, replayed: false, order: makeOrder() });
    const upload = http.expectOne(`${url}/orders/${makeOrder().id}/payment-receipt`);
    expect((upload.request.body as FormData).get('archivo')).toBe(receipt);
    upload.flush({ ok: true, order: makeOrder() });

    expect(store.cartLineCount()).toBe(0);
    expect(clearCache).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/my-orders', makeOrder().id], {
      queryParams: { placed: 1 },
    });
    expect(component.isPlacingOrder()).toBe(false);
  });

  it('si el comprobante falla, el pedido igual queda creado y se avisa cómo reenviarlo', () => {
    const info = vi.spyOn(notifications, 'info');
    ready();
    component.onPlaceOrder();
    http.expectOne(`${url}/orders`).flush({ ok: true, replayed: false, order: makeOrder() });
    http
      .expectOne(`${url}/orders/${makeOrder().id}/payment-receipt`)
      .flush({ ok: false, msg: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(store.cartLineCount()).toBe(0);
    expect(info).toHaveBeenCalledWith('Pedido creado', expect.stringContaining('detalle del pedido'), 6000);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('ignora un segundo clic mientras el pedido se está creando', () => {
    ready();
    component.onPlaceOrder();
    component.onPlaceOrder();
    const requests = http.match(`${url}/orders`);
    expect(requests).toHaveLength(1);
    requests[0].flush({ ok: true, replayed: false, order: makeOrder() });
    http.expectOne(`${url}/orders/${makeOrder().id}/payment-receipt`).flush({ ok: true, order: makeOrder() });
  });

  it('stock insuficiente (409): conserva el carrito, muestra el mensaje y ofrece revisarlo', () => {
    ready();
    component.onPlaceOrder();
    http
      .expectOne(`${url}/orders`)
      .flush(
        { ok: false, msg: 'Sérum vitamina C: solo quedan 1 unidades disponibles.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(store.cartLineCount()).toBe(1);
    expect(component.checkoutError()).toContain('solo quedan 1');
    expect(component.cartNeedsReview()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Revisar mi carrito');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.isPlacingOrder()).toBe(false);
    http.expectNone(`${url}/orders/${makeOrder().id}/payment-receipt`);
  });

  it('reintentar tras un error reutiliza la misma llave (no duplica pedidos)', () => {
    ready();
    component.onPlaceOrder();
    const first = http.expectOne(`${url}/orders`);
    const key = first.request.body.checkoutKey;
    first.flush({ ok: false, msg: 'Sin conexión' }, { status: 503, statusText: 'Unavailable' });

    component.onPlaceOrder();
    const second = http.expectOne(`${url}/orders`);
    expect(second.request.body.checkoutKey).toBe(key);
    second.flush({ ok: false, msg: 'x' }, { status: 503, statusText: 'Unavailable' });
  });

  it('envía el NIT solo si el cliente pidió factura', () => {
    ready();
    component.onWantsInvoiceChange(true);
    component.onNitChange('1234567-8');
    component.onPlaceOrder();
    const request = http.expectOne(`${url}/orders`);
    expect(request.request.body.nit).toBe('1234567-8');
    request.flush({ ok: false, msg: 'x' }, { status: 400, statusText: 'Bad Request' });
  });

  it('rechaza un NIT inválido antes de llamar al servidor', () => {
    ready();
    component.onWantsInvoiceChange(true);
    component.onNitChange('abc def');
    expect(component.canPlaceOrder()).toBe(false);
    component.onPlaceOrder();
    http.expectNone(`${url}/orders`);
  });

  it('el total mostrado es solo informativo: subtotal del carrito + envío de la dirección', () => {
    expect(component.subtotal()).toBe(240);
    expect(component.shippingCost()).toBe(25);
    expect(component.orderTotal()).toBe(265);
  });

  it('el resumen muestra el costo de envío de la dirección elegida dentro del total', () => {
    const summary = (fixture.nativeElement as HTMLElement).querySelector('app-checkout-order-summary dl')!
      .textContent!;
    expect(summary).toContain('Q25.00');
    expect(summary).toContain('Q265.00');
    expect(summary).not.toContain('será determinado por la empresa');
  });
});
