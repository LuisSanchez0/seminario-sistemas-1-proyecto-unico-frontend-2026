import axe from 'axe-core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OrdersAdminPageComponent } from './orders-admin-page.component';
import { makeSummary } from '../../../orders/testing/order.fixtures';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const url = `${environment.baseUrl}/orders/admin`;
const empty = { ok: true, count: 0, pages: 0, orders: [] };

describe('OrdersAdminPageComponent (lista de pedidos)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/orders', component: OrdersAdminPageComponent }]),
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
  async function open(query = '') {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/admin/orders${query}`, OrdersAdminPageComponent);
    el = harness.routeNativeElement!;
  }
  const list = (match: (params: URLSearchParams) => boolean = () => true) =>
    http.expectOne((req) => {
      if (req.url !== url) return false;
      const params = new URLSearchParams(req.params.toString());
      return match(params);
    });
  const submit = async () => {
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Aplicar filtros')) as HTMLButtonElement).click();
    await tick();
  };
  const type = (id: string, value: string) => {
    const field = el.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
  };

  it('lista pedidos con cliente, total, estados y enlace al detalle (tabla y tarjetas)', async () => {
    await open();
    list().flush({ ok: true, count: 1, pages: 1, orders: [makeSummary({ paymentState: 'PAGO_REALIZADO', orderState: 'EN_PROCESO' })] });
    await settle();
    const text = el.textContent!;
    expect(text).toContain('LUM-20261024-ABC123');
    expect(text).toContain('Ana López');
    expect(text).toContain('ana@example.com');
    expect(text).toContain('Q196.00');
    expect(text).toContain('Pago confirmado');
    expect(text).toContain('Preparando');
    expect(text).toContain('1 pedido');
    // La misma fila existe en la tabla (md+) y en la tarjeta (móvil).
    expect(el.querySelectorAll('a[href="/admin/orders/700000000000000000000001"]').length).toBeGreaterThanOrEqual(2);
  });

  it('pide la primera página de 10 sin filtros', async () => {
    await open();
    const request = list();
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('offset')).toBe('0');
    expect(request.request.params.has('orderCode')).toBe(false);
    request.flush(empty);
    await settle();
    expect(el.textContent).toContain('Todavía no hay pedidos.');
  });

  it('aplica filtros de código, cliente, pago, estado y fechas y los refleja en la URL', async () => {
    await open();
    list().flush(empty);
    await settle();

    type('filter-order-code', 'LUM-2026');
    type('filter-customer', 'ana');
    type('filter-payment', 'PAGO_REALIZADO');
    type('filter-order-state', 'ENVIADO');
    type('filter-start', '2026-10-01');
    type('filter-end', '2026-10-31');
    await submit();

    const request = list((p) => p.get('orderCode') === 'LUM-2026');
    expect(request.request.params.get('customer')).toBe('ana');
    expect(request.request.params.get('paymentState')).toBe('PAGO_REALIZADO');
    expect(request.request.params.get('orderState')).toBe('ENVIADO');
    expect(request.request.params.get('startDate')).toBe('2026-10-01');
    expect(request.request.params.get('endDate')).toBe('2026-10-31');
    expect(request.request.params.get('offset')).toBe('0');
    request.flush(empty);
    await settle();

    const router = TestBed.inject(Router);
    expect(router.url).toContain('orderCode=LUM-2026');
    expect(router.url).toContain('paymentState=PAGO_REALIZADO');
    expect(el.textContent).toContain('No hay pedidos que coincidan con los filtros.');
  });

  it('leer los filtros desde la URL restaura el formulario y la consulta', async () => {
    await open('?paymentState=EN_ESPERA_DE_PAGO&customer=ana&page=3');
    const request = list((p) => p.get('paymentState') === 'EN_ESPERA_DE_PAGO');
    expect(request.request.params.get('customer')).toBe('ana');
    expect(request.request.params.get('offset')).toBe('20');
    request.flush({ ok: true, count: 25, pages: 3, orders: [makeSummary()] });
    await settle();
    expect((el.querySelector('#filter-payment') as HTMLSelectElement).value).toBe('EN_ESPERA_DE_PAGO');
    expect((el.querySelector('#filter-customer') as HTMLInputElement).value).toBe('ana');
    expect(el.querySelector('nav[aria-label="Paginación"] [aria-current="page"]')?.textContent?.trim()).toBe('3');
  });

  it('ignora valores inválidos en la URL en lugar de enviarlos al servidor', async () => {
    await open('?paymentState=HACK&orderState=%27%3B--&startDate=ayer');
    const request = list();
    for (const key of ['paymentState', 'orderState', 'startDate']) {
      expect(request.request.params.has(key)).toBe(false);
    }
    request.flush(empty);
    await settle();
  });

  it('no deja aplicar un rango de fechas invertido', async () => {
    await open();
    list().flush(empty);
    await settle();
    type('filter-start', '2026-10-31');
    type('filter-end', '2026-10-01');
    harness.detectChanges();
    expect(el.textContent).toContain('La fecha inicial no puede ser posterior a la final.');
    expect((Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Aplicar filtros')) as HTMLButtonElement).disabled).toBe(true);
    http.expectNone((req) => req.url === url);
  });

  it('"Limpiar" quita todos los filtros y vuelve a consultar sin ellos', async () => {
    await open('?customer=ana');
    list((p) => p.get('customer') === 'ana').flush(empty);
    await settle();
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Limpiar') as HTMLButtonElement).click();
    await tick();
    const request = list((p) => !p.has('customer'));
    request.flush(empty);
    await settle();
    expect((el.querySelector('#filter-customer') as HTMLInputElement).value).toBe('');
  });

  it('muestra el error del servidor (p. ej. 401 no administrador) y permite reintentar', async () => {
    await open();
    list().flush({ ok: false, msg: 'Acceso restringido a administradores' }, { status: 401, statusText: 'x' });
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Acceso restringido a administradores');
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
    await tick();
    list().flush({ ok: true, count: 1, pages: 1, orders: [makeSummary()] });
    await settle();
    expect(el.textContent).toContain('LUM-20261024-ABC123');
  });

  it('un cliente eliminado se muestra sin romper la fila', async () => {
    await open();
    list().flush({ ok: true, count: 1, pages: 1, orders: [makeSummary({ buyer: null })] });
    await settle();
    expect(el.textContent).toContain('Cliente eliminado');
  });

  it('no tiene violaciones de accesibilidad detectables con axe', async () => {
    await open();
    list().flush({ ok: true, count: 1, pages: 2, orders: [makeSummary()] });
    await settle();
    const result = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
