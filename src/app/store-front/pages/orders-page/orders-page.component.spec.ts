import axe from 'axe-core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OrdersPageComponent } from './orders-page.component';
import { makeSummary } from '../../../orders/testing/order.fixtures';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const url = `${environment.baseUrl}/orders/mine`;

describe('OrdersPageComponent (Mis pedidos)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'my-orders', component: OrdersPageComponent }]),
        ...esGtProviders,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function open(query = '') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/my-orders${query}`, OrdersPageComponent);
    return harness;
  }
  /** Responde la petición y deja que el recurso asíncrono (rxResource) termine antes de renderizar. */
  async function settle(harness: RouterTestingHarness) {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  const request = (filter: string, offset = '0') =>
    http.expectOne(
      (req) =>
        req.url === url &&
        req.params.get('filter') === filter &&
        req.params.get('offset') === offset &&
        req.params.get('limit') === '10',
    );

  it('muestra los pedidos del cliente con código, total, estados y aviso de comprobante faltante', async () => {
    const harness = await open();
    request('all').flush({
      ok: true,
      count: 2,
      pages: 1,
      orders: [
        makeSummary(),
        makeSummary({
          id: '700000000000000000000002',
          orderCode: 'LUM-20261023-ZZZ999',
          total: 85.5,
          paymentState: 'PAGO_REALIZADO',
          orderState: 'ENVIADO',
          awaitingReceipt: false,
          canCancel: false,
        }),
      ],
    });
    await settle(harness);
    const text = harness.routeNativeElement!.textContent!;
    expect(text).toContain('LUM-20261024-ABC123');
    expect(text).toContain('Q196.00');
    expect(text).toContain('Pedido recibido');
    expect(text).toContain('Pago pendiente');
    expect(text).toContain('Falta subir tu comprobante');
    expect(text).toContain('Enviado');
    expect(text).toContain('Pago confirmado');
    const links = Array.from(harness.routeNativeElement!.querySelectorAll('a[href^="/my-orders/"]'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/my-orders/700000000000000000000001',
      '/my-orders/700000000000000000000002',
    ]);
  });

  it.each([
    ['in-progress', 'En curso', 'No tienes pedidos en curso.'],
    ['completed', 'Entregados', 'Aún no tienes pedidos entregados.'],
    ['cancelled', 'Cancelados', 'No tienes pedidos cancelados.'],
  ])('el filtro "%s" lo pide al servidor, lo marca activo y tiene su estado vacío', async (filter, label, empty) => {
    const harness = await open(`?filter=${filter}`);
    request(filter).flush({ ok: true, count: 0, pages: 0, orders: [] });
    await settle(harness);
    const el = harness.routeNativeElement!;
    expect(el.textContent).toContain(empty);
    const active = el.querySelector('nav a[aria-current="page"]');
    expect(active?.textContent?.trim()).toBe(label);
  });

  it('un filtro desconocido en la URL cae a "Todos"', async () => {
    const harness = await open('?filter=hack');
    request('all').flush({ ok: true, count: 0, pages: 0, orders: [] });
    await settle(harness);
    expect(harness.routeNativeElement!.textContent).toContain('Aún no tienes pedidos.');
    expect(harness.routeNativeElement!.textContent).toContain('Explorar productos');
  });

  it('cambiar de filtro dispara una nueva consulta', async () => {
    const harness = await open();
    request('all').flush({ ok: true, count: 0, pages: 0, orders: [] });
    await settle(harness);
    const tab = Array.from(harness.routeNativeElement!.querySelectorAll('nav a')).find(
      (a) => a.textContent?.trim() === 'Cancelados',
    ) as HTMLAnchorElement;
    tab.click();
    // Con una petición pendiente la app no está "estable": se deja correr la navegación y se renderiza.
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    request('cancelled').flush({ ok: true, count: 0, pages: 0, orders: [] });
  });

  it('pagina con el parámetro page (offset = (page-1) × 10) y muestra la paginación', async () => {
    const harness = await open('?page=2');
    request('all', '10').flush({ ok: true, count: 15, pages: 2, orders: [makeSummary()] });
    await settle(harness);
    expect(harness.routeNativeElement!.querySelector('nav[aria-label="Paginación"]')).not.toBeNull();
  });

  it('muestra el error del servidor y permite reintentar', async () => {
    const harness = await open();
    request('all').flush({ ok: false, msg: 'Error al obtener tus pedidos' }, { status: 500, statusText: 'x' });
    await settle(harness);
    const el = harness.routeNativeElement!;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Error al obtener tus pedidos');
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    request('all').flush({ ok: true, count: 1, pages: 1, orders: [makeSummary()] });
    await settle(harness);
    expect(el.textContent).toContain('LUM-20261024-ABC123');
  });

  it('no tiene violaciones de accesibilidad detectables con axe', async () => {
    const harness = await open();
    request('all').flush({
      ok: true,
      count: 1,
      pages: 1,
      orders: [makeSummary(), makeSummary({ id: 'x', orderCode: 'LUM-X', orderState: 'COMPLETADO', paymentState: 'PAGO_REALIZADO' })],
    });
    await settle(harness);
    const result = await axe.run(harness.routeNativeElement!, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
