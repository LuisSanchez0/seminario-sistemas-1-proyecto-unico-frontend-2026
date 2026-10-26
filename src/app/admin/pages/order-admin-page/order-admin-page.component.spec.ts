import axe from 'axe-core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OrderAdminPageComponent } from './order-admin-page.component';
import { makeItem, makeOrder } from '../../../orders/testing/order.fixtures';
import { Order } from '../../../orders/interfaces/order.interface';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const url = `${environment.baseUrl}/orders/admin`;
const ID = makeOrder().id;
const RECEIPT = { url: 'https://s3.example/r.webp?sig=1', uploadedAt: '2026-10-24T11:00:00.000Z' };

const paid = (overrides: Partial<Order> = {}) =>
  makeOrder({
    paymentState: 'PAGO_REALIZADO',
    paidAt: '2026-10-24T12:00:00.000Z',
    paymentReceipt: RECEIPT,
    canCancel: false,
    awaitingReceipt: false,
    ...overrides,
  });

describe('OrderAdminPageComponent (detalle administrativo)', () => {
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
        provideRouter([{ path: 'admin/orders/:id', component: OrderAdminPageComponent }]),
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
  async function open(order: Order) {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/admin/orders/${ID}`, OrderAdminPageComponent);
    http.expectOne(`${url}/${ID}`).flush({ ok: true, order });
    el = harness.routeNativeElement!;
    await settle();
  }
  const buttons = (label: string) =>
    // Los botones del diálogo de confirmación comparten texto con los de la página: se excluyen.
    Array.from(el.querySelectorAll('button')).filter(
      (b) => !b.closest('dialog') && b.textContent?.includes(label),
    ) as HTMLButtonElement[];
  const button = (label: string) => buttons(label)[0];

  it('muestra cliente, dirección, productos, totales y comprobante', async () => {
    await open(makeOrder({ paymentReceipt: RECEIPT, awaitingReceipt: false }));
    const text = el.textContent!;
    expect(text).toContain('LUM-20261024-ABC123');
    expect(text).toContain('Ana López');
    expect(text).toContain('ana@example.com');
    expect(text).toContain('Mixco, Guatemala');
    expect(text).toContain('Fit Me Matte');
    expect(text).toContain('Q196.00');
    expect(el.querySelector('img[alt="Comprobante de pago del cliente"]')?.getAttribute('src')).toBe(RECEIPT.url);
  });

  it('con pago pendiente no se puede preparar ni enviar y se explica por qué', async () => {
    await open(makeOrder({ paymentReceipt: RECEIPT }));
    expect(el.textContent).toContain('Confirma el pago para poder preparar y enviar');
    expect(buttons('Marcar como')).toHaveLength(0);
  });

  it('no permite confirmar el pago sin comprobante ni referencia', async () => {
    await open(makeOrder());
    expect(button('Confirmar pago').disabled).toBe(true);
    expect(el.textContent).toContain('Necesitas el comprobante del cliente o una referencia de pago.');

    const reference = el.querySelector('#payment-reference') as HTMLInputElement;
    reference.value = 'DEP-998877';
    reference.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(button('Confirmar pago').disabled).toBe(false);
  });

  it('confirma el pago (con referencia) tras la confirmación del diálogo', async () => {
    await open(makeOrder({ paymentReceipt: RECEIPT }));
    const reference = el.querySelector('#payment-reference') as HTMLInputElement;
    reference.value = '  DEP-1  ';
    reference.dispatchEvent(new Event('input'));
    button('Confirmar pago').click();
    harness.detectChanges();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    http.expectNone(`${url}/${ID}/payment-state`);

    (dialog.querySelector('.modal-action button.btn-success') as HTMLButtonElement).click();
    const request = http.expectOne(`${url}/${ID}/payment-state`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ paymentState: 'PAGO_REALIZADO', paymentReference: 'DEP-1' });
    request.flush({ ok: true, order: paid({ paymentReference: 'DEP-1' }) });
    await tick();

    expect(dialog.open).toBe(false);
    expect(el.textContent).toContain('Pago confirmado');
    expect(el.textContent).toContain('Referencia: DEP-1');
    // Ahora sí se puede avanzar el envío.
    expect(button('Marcar como Preparando')).toBeDefined();
  });

  it('un doble clic en confirmar no envía dos solicitudes', async () => {
    await open(makeOrder({ paymentReceipt: RECEIPT }));
    button('Confirmar pago').click();
    harness.detectChanges();
    const confirm = el.querySelector('dialog .modal-action button.btn-success') as HTMLButtonElement;
    confirm.click();
    confirm.click();
    const requests = http.match(`${url}/${ID}/payment-state`);
    expect(requests).toHaveLength(1);
    requests[0].flush({ ok: true, order: paid() });
    await tick();
  });

  it('si otro administrador ya resolvió el pago, muestra el conflicto y recarga el estado real', async () => {
    await open(makeOrder({ paymentReceipt: RECEIPT }));
    button('Confirmar pago').click();
    harness.detectChanges();
    (el.querySelector('dialog .modal-action button.btn-success') as HTMLButtonElement).click();
    http
      .expectOne(`${url}/${ID}/payment-state`)
      .flush({ ok: false, msg: 'El pedido ya está pagado.' }, { status: 409, statusText: 'x' });
    await tick();
    expect(el.querySelector('dialog [role="alert"]')?.textContent).toContain('El pedido ya está pagado.');
    http.expectOne(`${url}/${ID}`).flush({ ok: true, order: paid() });
    await settle();
    expect(el.textContent).toContain('Pago confirmado');
    expect(button('Confirmar pago')).toBeUndefined();
  });

  it('cancelar un pedido sin pagar envía el motivo y deja el pedido cancelado', async () => {
    await open(makeOrder());
    button('Cancelar pedido').click();
    harness.detectChanges();
    const reason = el.querySelector('#action-reason') as HTMLTextAreaElement;
    reason.value = 'Cliente no respondió';
    reason.dispatchEvent(new Event('input'));
    (el.querySelector('dialog .modal-action button.btn-error') as HTMLButtonElement).click();

    const request = http.expectOne(`${url}/${ID}/payment-state`);
    expect(request.request.body).toEqual({ paymentState: 'CANCELADO', reason: 'Cliente no respondió' });
    request.flush({
      ok: true,
      order: makeOrder({ paymentState: 'CANCELADO', orderState: 'CANCELADO', cancellationReason: 'Cliente no respondió', canCancel: false }),
    });
    await tick();
    expect(el.textContent).toContain('Motivo: Cliente no respondió');
    expect(button('Cancelar pedido')).toBeUndefined();
    expect(button('Reembolsar pedido')).toBeUndefined();
  });

  it('avanza un producto un solo paso a la vez (nunca salta ni retrocede)', async () => {
    await open(paid());
    expect(button('Marcar como Preparando')).toBeDefined();
    expect(buttons('Marcar como Enviado')).toHaveLength(0);
    button('Marcar como Preparando').click();

    const request = http.expectOne(`${url}/${ID}/shipping-status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ items: [{ itemId: makeItem().id, shippingStatus: 'PROCESSING' }] });
    request.flush({
      ok: true,
      order: paid({ orderState: 'EN_PROCESO', items: [makeItem({ shippingStatus: 'PROCESSING' })] }),
    });
    await tick();
    expect(button('Marcar como Enviado')).toBeDefined();
    expect(buttons('Marcar como Preparando')).toHaveLength(0);
  });

  it('un producto entregado ya no ofrece más acciones', async () => {
    await open(paid({ orderState: 'COMPLETADO', items: [makeItem({ shippingStatus: 'DELIVERED' })] }));
    expect(buttons('Marcar como')).toHaveLength(0);
  });

  it('con varios productos permite avanzar uno solo o todos juntos si están en el mismo paso', async () => {
    const two = [makeItem({ id: 'a', title: 'Labial' }), makeItem({ id: 'b', title: 'Rubor' })];
    await open(paid({ items: two }));
    expect(button('Marcar todos como Preparando')).toBeDefined();
    button('Marcar todos como Preparando').click();
    const request = http.expectOne(`${url}/${ID}/shipping-status`);
    expect(request.request.body.items).toEqual([
      { itemId: 'a', shippingStatus: 'PROCESSING' },
      { itemId: 'b', shippingStatus: 'PROCESSING' },
    ]);
    request.flush({
      ok: true,
      order: paid({
        orderState: 'EN_PROCESO',
        items: [makeItem({ id: 'a', shippingStatus: 'PROCESSING' }), makeItem({ id: 'b', shippingStatus: 'PROCESSING' })],
      }),
    });
    await tick();

    // Avanzar solo uno deja el pedido mixto: ya no hay acción "todos".
    buttons('Marcar como Enviado')[0].click();
    http.expectOne(`${url}/${ID}/shipping-status`).flush({
      ok: true,
      order: paid({
        orderState: 'PARCIALMENTE_ENVIADO',
        items: [makeItem({ id: 'a', shippingStatus: 'SHIPPED' }), makeItem({ id: 'b', shippingStatus: 'PROCESSING' })],
      }),
    });
    await tick();
    expect(el.textContent).toContain('Enviado parcialmente');
    expect(buttons('Marcar todos como')).toHaveLength(0);
  });

  it('una transición inválida del servidor se muestra y no cambia el estado en pantalla', async () => {
    await open(paid());
    button('Marcar como Preparando').click();
    http
      .expectOne(`${url}/${ID}/shipping-status`)
      .flush({ ok: false, msg: 'No se puede pasar el producto de Preparando a Entregado.' }, { status: 409, statusText: 'x' });
    await tick();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se puede pasar el producto');
    http.expectOne(`${url}/${ID}`).flush({ ok: true, order: paid() });
    await settle();
    expect(button('Marcar como Preparando')).toBeDefined();
  });

  it('permite reembolsar un pedido pagado sin productos enviados', async () => {
    await open(paid());
    button('Reembolsar pedido').click();
    harness.detectChanges();
    (el.querySelector('dialog .modal-action button.btn-error') as HTMLButtonElement).click();
    const request = http.expectOne(`${url}/${ID}/payment-state`);
    expect(request.request.body).toEqual({ paymentState: 'REEMBOLSADO', reason: undefined });
    request.flush({
      ok: true,
      order: makeOrder({ paymentState: 'REEMBOLSADO', orderState: 'REEMBOLSADO', canCancel: false }),
    });
    await tick();
    expect(el.textContent).toContain('Reembolsado');
    expect(button('Reembolsar pedido')).toBeUndefined();
  });

  it('con productos ya enviados no ofrece reembolso y lo explica', async () => {
    await open(paid({ orderState: 'ENVIADO', items: [makeItem({ shippingStatus: 'SHIPPED' })] }));
    expect(button('Reembolsar pedido')).toBeUndefined();
    expect(el.textContent).toContain('requiere un proceso de devolución');
  });

  it('un pedido inexistente o un acceso denegado muestra el error del servidor', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/admin/orders/${ID}`, OrderAdminPageComponent);
    http.expectOne(`${url}/${ID}`).flush({ ok: false, msg: 'Pedido no encontrado' }, { status: 404, statusText: 'x' });
    el = harness.routeNativeElement!;
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Pedido no encontrado');
  });

  it('no tiene violaciones de accesibilidad detectables con axe', async () => {
    await open(makeOrder({ paymentReceipt: RECEIPT }));
    const result = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
