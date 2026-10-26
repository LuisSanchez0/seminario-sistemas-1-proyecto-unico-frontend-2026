import axe from 'axe-core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OrderPage } from './order-page';
import { makeItem, makeOrder } from '../../../orders/testing/order.fixtures';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const url = `${environment.baseUrl}/orders`;
const ID = makeOrder().id;

describe('OrderPage (detalle del pedido del cliente)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'my-orders/:orderId', component: OrderPage }]),
        ...esGtProviders,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function tick() {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  }
  async function open(order = makeOrder(), query = '') {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/my-orders/${ID}${query}`, OrderPage);
    http.expectOne(`${url}/${ID}`).flush({ ok: true, order });
    el = harness.routeNativeElement!;
    await settle();
  }
  const button = (label: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;

  it('muestra código, estados, productos, dirección y resumen del pedido', async () => {
    await open();
    const text = el.textContent!;
    expect(text).toContain('LUM-20261024-ABC123');
    expect(text).toContain('Pedido recibido');
    expect(text).toContain('Pago pendiente');
    expect(text).toContain('Fit Me Matte');
    expect(text).toContain('2 × Q85.50');
    expect(text).toContain('Mixco, Guatemala');
    expect(text).toContain('Q25.00'); // envío
    expect(text).toContain('Q196.00'); // total
    expect(el.querySelector('img[alt="Fit Me Matte"]')).not.toBeNull();
  });

  it('el banner de confirmación solo aparece con ?placed=1', async () => {
    await open(makeOrder(), '?placed=1');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Recibimos tu pedido');
    expect(el.textContent).toContain('LUM-20261024-ABC123');
  });

  it('sin ?placed=1 no hay banner de confirmación', async () => {
    await open();
    expect(el.textContent).not.toContain('Recibimos tu pedido');
  });

  it('seguimiento: pago confirmado y envío parcial refleja el estado y la insignia de cada producto', async () => {
    await open(
      makeOrder({
        paymentState: 'PAGO_REALIZADO',
        orderState: 'PARCIALMENTE_ENVIADO',
        canCancel: false,
        awaitingReceipt: false,
        items: [
          makeItem({ id: 'a', title: 'Labial rojo', shippingStatus: 'SHIPPED' }),
          makeItem({ id: 'b', title: 'Rubor rosa', shippingStatus: 'PROCESSING' }),
        ],
      }),
    );
    const steps = Array.from(el.querySelectorAll('ol[aria-label="Seguimiento del pedido"] li'));
    expect(steps).toHaveLength(5);
    expect(el.querySelector('li[aria-current="step"]')?.textContent).toContain('Enviado');
    expect(el.textContent).toContain('Enviado parcialmente');
    expect(el.textContent).toContain('Parte de tu pedido ya va en camino');
    // Con el pago confirmado ya no se pide comprobante ni se ofrece cancelar.
    expect(el.textContent).not.toContain('Subir comprobante');
    expect(button('Cancelar pedido')).toBeUndefined();
  });

  it('pedido cancelado: sin línea de tiempo, con aviso y motivo', async () => {
    await open(
      makeOrder({
        paymentState: 'CANCELADO',
        orderState: 'CANCELADO',
        canCancel: false,
        awaitingReceipt: false,
        cancellationReason: 'Cambié de opinión',
      }),
    );
    expect(el.querySelector('ol[aria-label="Seguimiento del pedido"]')).toBeNull();
    expect(el.textContent).toContain('Este pedido fue cancelado.');
    expect(el.textContent).toContain('Cambié de opinión');
  });

  it('con pago pendiente muestra la cuenta pendiente de configurar sin inventar datos bancarios', async () => {
    await open();
    expect(el.textContent).toContain('Aún no subes tu comprobante de pago.');
    expect(el.textContent).toContain('te los confirmará la tienda');
    expect(el.textContent).not.toContain('967954744');
  });

  it('sube el comprobante como imagen y pasa a "Comprobante enviado"', async () => {
    await open();
    const file = new File(['img'], 'pago.png', { type: 'image/png' });
    const input = el.querySelector('#receipt-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    harness.detectChanges();

    const upload = http.expectOne(`${url}/${ID}/payment-receipt`);
    expect((upload.request.body as FormData).get('archivo')).toBe(file);
    upload.flush({
      ok: true,
      order: makeOrder({
        awaitingReceipt: false,
        paymentReceipt: { url: 'https://s3.example/receipt.webp?sig=1', uploadedAt: '2026-10-24T11:00:00.000Z' },
      }),
    });
    await tick();
    expect(el.textContent).toContain('Comprobante enviado');
    expect(el.textContent).toContain('Reemplazar comprobante');
    expect(el.querySelector('a[href^="https://s3.example/receipt.webp"]')).not.toBeNull();
  });

  it('rechaza en el cliente archivos que no son imagen y no llama al servidor', async () => {
    await open();
    const input = el.querySelector('#receipt-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })], configurable: true });
    input.dispatchEvent(new Event('change'));
    harness.detectChanges();
    http.expectNone(`${url}/${ID}/payment-receipt`);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('PNG, JPG o WebP');
  });

  it('muestra el mensaje del servidor si falla la subida', async () => {
    await open();
    const input = el.querySelector('#receipt-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
    input.dispatchEvent(new Event('change'));
    http
      .expectOne(`${url}/${ID}/payment-receipt`)
      .flush({ ok: false, msg: 'Ya no se puede subir un comprobante' }, { status: 409, statusText: 'x' });
    await tick();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Ya no se puede subir un comprobante');
  });

  it('cancela con confirmación y muestra el pedido cancelado', async () => {
    await open();
    button('Cancelar pedido').click();
    harness.detectChanges();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('volverán al inventario');

    button('Sí, cancelar pedido').click();
    const cancel = http.expectOne(`${url}/${ID}/cancel`);
    expect(cancel.request.method).toBe('POST');
    cancel.flush({
      ok: true,
      order: makeOrder({ paymentState: 'CANCELADO', orderState: 'CANCELADO', canCancel: false, awaitingReceipt: false }),
    });
    await tick();
    expect(dialog.open).toBe(false);
    expect(el.textContent).toContain('Este pedido fue cancelado.');
    expect(button('Cancelar pedido')).toBeUndefined();
  });

  it('si el pago se confirmó mientras tanto, la cancelación falla con el motivo y se recarga el pedido', async () => {
    await open();
    button('Cancelar pedido').click();
    harness.detectChanges();
    button('Sí, cancelar pedido').click();
    http
      .expectOne(`${url}/${ID}/cancel`)
      .flush({ ok: false, msg: 'Tu pago ya fue confirmado. Comunícate con la tienda.' }, { status: 409, statusText: 'x' });
    await tick();
    expect(el.querySelector('dialog [role="alert"]')?.textContent).toContain('Tu pago ya fue confirmado');
    http
      .expectOne(`${url}/${ID}`)
      .flush({ ok: true, order: makeOrder({ paymentState: 'PAGO_REALIZADO', canCancel: false, awaitingReceipt: false }) });
    await settle();
    expect(el.textContent).toContain('Pago confirmado');
    expect(button('Cancelar pedido')).toBeUndefined();
  });

  it('un pedido ajeno o inexistente (404) muestra "Pedido no encontrado" sin datos', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/my-orders/${ID}`, OrderPage);
    http.expectOne(`${url}/${ID}`).flush({ ok: false, msg: 'Pedido no encontrado' }, { status: 404, statusText: 'x' });
    el = harness.routeNativeElement!;
    await settle();
    expect(el.textContent).toContain('Pedido no encontrado');
    expect(el.textContent).not.toContain('LUM-');
  });

  it('un error de red permite reintentar', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/my-orders/${ID}`, OrderPage);
    http.expectOne(`${url}/${ID}`).flush({ ok: false, msg: 'Error al obtener el pedido' }, { status: 500, statusText: 'x' });
    el = harness.routeNativeElement!;
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Error al obtener el pedido');
    button('Reintentar').click();
    await tick();
    http.expectOne(`${url}/${ID}`).flush({ ok: true, order: makeOrder() });
    await settle();
    expect(el.textContent).toContain('LUM-20261024-ABC123');
  });

  it('no tiene violaciones de accesibilidad detectables con axe', async () => {
    await open(makeOrder(), '?placed=1');
    const result = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
