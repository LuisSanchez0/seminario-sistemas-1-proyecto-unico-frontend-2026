import axe from 'axe-core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminDashboard } from './admin-dashboard';
import { makeDashboard } from '../../testing/report.fixtures';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const url = `${environment.baseUrl}/admin/dashboard`;

describe('AdminDashboard (panel con datos reales)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'admin/dashboard', component: AdminDashboard }]), ...esGtProviders],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/dashboard', AdminDashboard);
    el = harness.routeNativeElement!;
  });
  afterEach(() => http.verify());

  const dashboard = (match: (params: URLSearchParams) => boolean = () => true) =>
    http.expectOne((req) => req.url === url && match(new URLSearchParams(req.params.toString())));
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  const button = (text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) as HTMLButtonElement;
  const kpi = (name: string) => el.querySelector(`[data-kpi="${name}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  it('carga por defecto el mes en curso y muestra cada KPI con su valor del servidor', async () => {
    const request = dashboard();
    expect(request.request.params.get('period')).toBe('month');
    expect(request.request.params.has('startDate')).toBe(false);
    request.flush(makeDashboard());
    await settle();
    expect(el.textContent).toContain('Este mes: 01/10/2026 al 24/10/2026');
    expect(el.textContent).toContain('hora de Guatemala');
    expect(kpi('orders')).toBe('7');
    expect(kpi('collectedOrders')).toBe('4');
    expect(kpi('revenue')).toBe('Q1,077.25');
    expect(kpi('averageTicket')).toBe('Q269.31');
    expect(kpi('units')).toBe('10');
    expect(kpi('completedOrders')).toBe('2');
    expect(kpi('pendingPayment')).toBe('3');
    expect(kpi('toPrepare')).toBe('2');
    expect(kpi('inPreparation')).toBe('1');
    expect(kpi('shipped')).toBe('1');
    expect(el.textContent).toContain('1 con comprobante');
  });

  it('cambiar de período vuelve a consultar con ese período', async () => {
    dashboard().flush(makeDashboard());
    await settle();
    expect(button('Este mes').getAttribute('aria-pressed')).toBe('true');
    button('Hoy').click();
    harness.detectChanges();
    const request = dashboard((p) => p.get('period') === 'today');
    request.flush(makeDashboard({ period: { key: 'today', label: 'Hoy', startDate: '2026-10-24', endDate: '2026-10-24', text: '24/10/2026' } }));
    await settle();
    expect(button('Hoy').getAttribute('aria-pressed')).toBe('true');
    expect(el.textContent).toContain('Hoy: 24/10/2026');
  });

  it('el período personalizado manda las fechas y no permite un rango invertido', async () => {
    dashboard().flush(makeDashboard());
    await settle();
    button('Personalizado').click();
    harness.detectChanges();
    dashboard((p) => p.get('period') === 'custom').flush(makeDashboard());
    await settle();

    const set = (id: string, value: string) => {
      const input = el.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      harness.detectChanges();
    };
    set('dash-start', '2026-10-20');
    set('dash-end', '2026-10-10');
    expect(el.textContent).toContain('La fecha inicial no puede ser posterior a la final.');
    expect(button('Aplicar').disabled).toBe(true);
    set('dash-end', '2026-10-22');
    expect(button('Aplicar').disabled).toBe(false);
    button('Aplicar').click();
    harness.detectChanges();
    const request = dashboard((p) => p.get('startDate') === '2026-10-20');
    expect(request.request.params.get('endDate')).toBe('2026-10-22');
    request.flush(makeDashboard());
    await settle();
  });

  it('enlaza con pedidos y reportes reproduciendo exactamente la cifra mostrada', async () => {
    dashboard().flush(makeDashboard());
    await settle();
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/admin/orders?paymentState=EN_ESPERA_DE_PAGO');
    expect(hrefs).toContain('/admin/orders?paymentState=PAGO_REALIZADO&orderState=PENDIENTE');
    expect(hrefs).toContain('/admin/orders?paymentState=PAGO_REALIZADO&orderState=EN_PROCESO');
    expect(hrefs).toContain('/admin/reports/sales?startDate=2026-10-01&endDate=2026-10-24');
    expect(hrefs).toContain('/admin/reports/products?startDate=2026-10-01&endDate=2026-10-24');
    expect(hrefs).toContain('/admin/reports/inventory?stockStatus=low');
    expect(hrefs).toContain('/admin/reports/inventory?stockStatus=out');
    expect(hrefs).toContain('/admin/products/500000000000000000000001');
  });

  it('lista el stock más bajo y los más vendidos con cantidades e importes', async () => {
    dashboard().flush(makeDashboard());
    await settle();
    const stock = el.querySelector('ul[aria-label="Productos con menos existencias"]')!.textContent!.replace(/\s+/g, ' ');
    expect(stock).toContain('Rubor Rosa Suave Agotado');
    expect(stock).toContain('Labial Rojo Intenso 3 unidades');
    const top = el.querySelector('ol[aria-label="Productos más vendidos"]')!.textContent!.replace(/\s+/g, ' ');
    expect(top).toContain('Base Fit Matte 4 unidades Q400.00');
    expect(el.textContent).toContain('2 con stock bajo');
    expect(el.textContent).toContain('1 agotados');
  });

  it('muestra estados vacíos coherentes', async () => {
    dashboard().flush(makeDashboard({ lowestStock: [], topProducts: [], sales: { orders: 0, collectedOrders: 0, revenue: 0, averageTicket: 0, units: 0, completedOrders: 0 } }));
    await settle();
    expect(el.textContent).toContain('No hay productos con stock bajo ni agotados.');
    expect(el.textContent).toContain('Todavía no hay ventas cobradas en este período.');
    expect(kpi('revenue')).toBe('Q0.00');
  });

  it('documenta la definición de cada indicador', async () => {
    dashboard().flush(makeDashboard());
    await settle();
    const text = el.querySelector('details')!.textContent!;
    expect(text).toContain('Ingresos cobrados');
    expect(text).toContain('quetzales (GTQ)');
    expect(text).toContain('hora de Guatemala');
  });

  it('muestra el error del servidor y permite reintentar', async () => {
    dashboard().flush({ ok: false, msg: 'No se pudo cargar el panel' }, { status: 500, statusText: 'x' });
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el panel');
    button('Reintentar').click();
    harness.detectChanges();
    dashboard().flush(makeDashboard());
    await settle();
    expect(kpi('revenue')).toBe('Q1,077.25');
  });

  it('no tiene violaciones de accesibilidad detectables con axe', async () => {
    dashboard().flush(makeDashboard());
    await settle();
    const result = await axe.run(el, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
