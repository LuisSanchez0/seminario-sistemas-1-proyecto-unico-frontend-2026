import axe from 'axe-core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ReportsAdminPageComponent } from './reports-admin-page.component';
import { ReportService } from '../../services/report.service';
import { makeReportResponse, makeSalesReport } from '../../testing/report.fixtures';
import { esGtProviders } from '../../../orders/testing/locale';
import { environment } from '../../../../environments/environment';

const reportUrl = (type: string) => `${environment.baseUrl}/admin/reports/${type}`;
const exportUrl = (type: string) => `${reportUrl(type)}/export`;
const OCT = 'startDate=2026-10-01&endDate=2026-10-31';

describe('ReportsAdminPageComponent (reportes del panel)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/reports/:type', component: ReportsAdminPageComponent }]),
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
  async function open(path = `/admin/reports/sales?${OCT}`) {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(path, ReportsAdminPageComponent);
    el = harness.routeNativeElement!;
    http.expectOne(`${environment.baseUrl}/brands`).flush({
      ok: true,
      brands: [{ id: '5f0000000000000000000001', name: "L'Oréal", slug: 'loreal', state: true }],
    });
  }
  const report = (type: string, match: (params: URLSearchParams) => boolean = () => true): TestRequest =>
    http.expectOne((req) => req.url === reportUrl(type) && match(new URLSearchParams(req.params.toString())));
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
  const type = (id: string, value: string) => {
    const field = el.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
  };

  it('muestra KPIs, desgloses, detalle y totales del servidor con formato de quetzales y hora de Guatemala', async () => {
    await open();
    const request = report('sales');
    expect(request.request.params.get('startDate')).toBe('2026-10-01');
    expect(request.request.params.get('endDate')).toBe('2026-10-31');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('offset')).toBe('0');
    request.flush(makeReportResponse());
    await settle();

    const text = el.textContent!;
    expect(el.querySelector('h1')?.textContent).toContain('Reportes');
    expect(text).toContain('Reporte de ventas');
    const summary = Array.from(el.querySelectorAll('dl[aria-label="Filtros aplicados"] > div')).map((row) => `${row.querySelector('dt')!.textContent!.trim()} ${row.querySelector('dd')!.textContent!.trim()}`);
    expect(summary).toEqual(['Período: 01/10/2026 al 31/10/2026', 'Estado de pago: Todos', 'Estado del pedido: Todos', 'Cliente: Todos']);
    // KPI y total salen tal cual del backend (los mismos números del PDF y del Excel).
    const kpis = Array.from(el.querySelectorAll('ul[aria-label="Indicadores del reporte"] li')).map((li) => Array.from(li.querySelectorAll('p')).map((p) => p.textContent!.trim()).join(' '));
    expect(kpis).toContain('Ingresos cobrados Q1,077.25');
    expect(kpis).toContain('Ventas cobradas 4');
    expect(text).toContain('Por estado de pago');
    const detail = Array.from(el.querySelectorAll('table')).find((t) => t.textContent!.includes('LUM-TEST-000004'))!;
    const headers = Array.from(detail.querySelectorAll('thead th')).map((th) => th.textContent!.trim());
    expect(headers).toEqual(['Pedido', 'Fecha', 'Cliente', 'Unidades', 'Total', 'Ingreso cobrado']);
    expect(detail.querySelector('tbody')!.textContent).toContain('31/10/2026 23:59');
    expect(detail.querySelector('tbody')!.textContent).toContain('01/10/2026 00:00');
    const totals = detail.querySelector('tfoot')!.textContent!.replace(/\s+/g, ' ');
    expect(totals).toContain('Totales del reporte');
    expect(totals).toContain('13');
    expect(totals).toContain('Q1,527.50');
    expect(totals).toContain('Q1,077.25');
    expect(text).toContain('Mostrando 1 a 2 de 7');
    expect(text).toContain('Definiciones');
  });

  it('semántica de tabla: título, encabezados con scope, primera columna como encabezado de fila y región enfocable', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    const detail = Array.from(el.querySelectorAll('table')).find((t) => t.textContent!.includes('LUM-TEST-000004'))!;
    expect(detail.querySelector('caption')?.textContent).toContain('Detalle del reporte de ventas');
    expect(Array.from(detail.querySelectorAll('thead th')).every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(detail.querySelector('tbody th')?.getAttribute('scope')).toBe('row');
    const region = detail.closest('[role="region"]')!;
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toContain('Detalle del reporte de ventas');
  });

  it('los filtros se aplican en el servidor: consulta con los nuevos filtros y los refleja en la URL', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();

    type('filter-paymentState', 'PAGO_REALIZADO');
    type('filter-orderState', 'ENVIADO');
    type('filter-customer', ' carolina ');
    type('filter-startDate', '2026-10-05');
    type('filter-endDate', '2026-10-20');
    button('Aplicar filtros').click();
    await tick();

    const request = report('sales', (p) => p.get('paymentState') === 'PAGO_REALIZADO');
    expect(request.request.params.get('orderState')).toBe('ENVIADO');
    expect(request.request.params.get('customer')).toBe('carolina');
    expect(request.request.params.get('startDate')).toBe('2026-10-05');
    expect(request.request.params.get('endDate')).toBe('2026-10-20');
    expect(request.request.params.get('offset')).toBe('0');
    request.flush(makeReportResponse(makeSalesReport({ rowCount: 0, rows: [], totals: null })));
    await settle();
    expect(TestBed.inject(Router).url).toContain('paymentState=PAGO_REALIZADO');
    expect(el.textContent).toContain('No se encontraron registros para los filtros seleccionados.');
  });

  it('cada reporte ofrece solo sus filtros soportados', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    const idsOf = () => Array.from(el.querySelectorAll('form[aria-label="Filtros del reporte"] [id^="filter-"]')).map((node) => node.id);
    expect(idsOf()).toEqual(['filter-startDate', 'filter-endDate', 'filter-paymentState', 'filter-orderState', 'filter-customer']);

    await harness.navigateByUrl('/admin/reports/inventory', ReportsAdminPageComponent);
    report('inventory').flush(makeReportResponse(makeSalesReport({ key: 'inventory', title: 'Reporte de inventario', rowCount: 0, rows: [], totals: null, kpis: [], breakdowns: [] })));
    await settle();
    expect(idsOf()).toEqual(['filter-category', 'filter-brand', 'filter-search', 'filter-stockStatus', 'filter-lowStockThreshold']);
    expect(el.querySelector('#filter-brand')?.textContent).toContain("L'Oréal");
  });

  it('cambiar de pestaña consulta el reporte correspondiente y marca la pestaña activa', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    expect(el.querySelector('nav[aria-label="Tipo de reporte"] a[aria-current="page"]')?.textContent?.trim()).toBe('Ventas');
    (el.querySelector('a[href="/admin/reports/products"]') as HTMLAnchorElement).click();
    await tick();
    const request = report('products');
    expect(request.request.params.get('order')).toBe('top');
    request.flush(makeReportResponse(makeSalesReport({ key: 'products', title: 'Reporte de productos', rows: [], rowCount: 0, totals: null })));
    await settle();
    expect(el.querySelector('nav[aria-label="Tipo de reporte"] a[aria-current="page"]')?.textContent?.trim()).toBe('Productos');
    expect(el.textContent).toContain('Reporte de productos');
  });

  it('la paginación pide la página correcta y los totales siguen siendo los de todo el filtro', async () => {
    await open(`/admin/reports/sales?${OCT}&page=2`);
    const request = report('sales');
    expect(request.request.params.get('offset')).toBe('20');
    request.flush(makeReportResponse(makeSalesReport({ rowCount: 45 }), { offset: 20, pages: 3 }));
    await settle();
    expect(el.textContent).toContain('Mostrando 21 a 22 de 45');
    expect(el.querySelector('nav[aria-label="Paginación"] [aria-current="page"]')?.textContent?.trim()).toBe('2');
    const detail = Array.from(el.querySelectorAll('table')).find((t) => t.textContent!.includes('LUM-TEST-000004'))!;
    expect(detail.querySelector('tfoot')?.textContent).toContain('Q1,077.25');
  });

  it('exporta PDF con los filtros aplicados, bloquea los botones mientras genera y descarga el archivo', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    const save = vi.spyOn(TestBed.inject(ReportService), 'save').mockImplementation(() => undefined);

    expect(button('Exportar PDF').disabled).toBe(false);
    expect(button('Exportar Excel').disabled).toBe(false);
    button('Exportar PDF').click();
    await tick();

    const request = http.expectOne((req) => req.url === exportUrl('sales'));
    expect(request.request.params.get('format')).toBe('pdf');
    expect(request.request.params.get('startDate')).toBe('2026-10-01');
    expect(request.request.params.get('endDate')).toBe('2026-10-31');
    expect(request.request.params.has('limit')).toBe(false); // todas las filas, no la página visible
    expect(request.request.params.has('offset')).toBe(false);
    // Mientras genera: ambos botones deshabilitados, texto de carga y doble clic ignorado.
    expect(button('Generando PDF').disabled).toBe(true);
    expect(button('Generando PDF').getAttribute('aria-busy')).toBe('true');
    expect(button('Exportar Excel').disabled).toBe(true);
    button('Generando PDF').click();
    button('Exportar Excel').click();
    http.expectNone((req) => req.url === exportUrl('sales'));

    request.flush(new Blob(['%PDF']), {
      headers: { 'Content-Disposition': 'attachment; filename="reporte-ventas-2026-10-01-a-2026-10-31.pdf"' },
    });
    await tick();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].fileName).toBe('reporte-ventas-2026-10-01-a-2026-10-31.pdf');
    expect(button('Exportar PDF').disabled).toBe(false);
    expect(button('Exportar Excel').disabled).toBe(false);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('reporte-ventas-2026-10-01-a-2026-10-31.pdf');
  });

  it('exporta Excel con los filtros del reporte activo', async () => {
    await open(`/admin/reports/sales?${OCT}&paymentState=PAGO_REALIZADO`);
    report('sales').flush(makeReportResponse());
    await settle();
    vi.spyOn(TestBed.inject(ReportService), 'save').mockImplementation(() => undefined);
    button('Exportar Excel').click();
    await tick();
    const request = http.expectOne((req) => req.url === exportUrl('sales'));
    expect(request.request.params.get('format')).toBe('xlsx');
    expect(request.request.params.get('paymentState')).toBe('PAGO_REALIZADO');
    request.flush(new Blob(['PK']));
    await tick();
    expect(button('Exportar Excel').disabled).toBe(false);
  });

  it('tras aplicar filtros, el archivo se exporta con los filtros nuevos (no con los anteriores)', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    type('filter-startDate', '2026-10-24');
    type('filter-endDate', '2026-10-24');
    type('filter-paymentState', 'PAGO_REALIZADO');
    button('Aplicar filtros').click();
    await tick();
    report('sales', (p) => p.get('paymentState') === 'PAGO_REALIZADO').flush(makeReportResponse());
    await settle();
    vi.spyOn(TestBed.inject(ReportService), 'save').mockImplementation(() => undefined);
    button('Exportar PDF').click();
    await tick();
    const request = http.expectOne((req) => req.url === exportUrl('sales'));
    expect(request.request.params.get('startDate')).toBe('2026-10-24');
    expect(request.request.params.get('endDate')).toBe('2026-10-24');
    expect(request.request.params.get('paymentState')).toBe('PAGO_REALIZADO');
    request.flush(new Blob(['%PDF']));
    await tick();
  });

  it('un error de exportación se muestra con el mensaje seguro del servidor y el botón deja de cargar', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    const save = vi.spyOn(TestBed.inject(ReportService), 'save').mockImplementation(() => undefined);
    button('Exportar PDF').click();
    await tick();
    http
      .expectOne((req) => req.url === exportUrl('sales'))
      .flush(new Blob([JSON.stringify({ ok: false, msg: 'No se pudo exportar el reporte' })]), { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo exportar el reporte');
    });
    expect(save).not.toHaveBeenCalled();
    expect(button('Exportar PDF').disabled).toBe(false);
    expect(button('Exportar PDF').textContent).not.toContain('Generando');
    expect(button('Exportar Excel').disabled).toBe(false);
  });

  it('sin filas no se puede exportar y se explica por qué', async () => {
    await open();
    report('sales').flush(makeReportResponse(makeSalesReport({ rowCount: 0, rows: [], totals: null })));
    await settle();
    expect(button('Exportar PDF').disabled).toBe(true);
    expect(button('Exportar Excel').disabled).toBe(true);
    expect(el.textContent).toContain('No hay datos para exportar.');
  });

  it('muestra el error del servidor al cargar y permite reintentar', async () => {
    await open();
    report('sales').flush({ ok: false, msg: 'Acceso restringido a administradores' }, { status: 401, statusText: 'x' });
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Acceso restringido a administradores');
    button('Reintentar').click();
    await tick();
    report('sales').flush(makeReportResponse());
    await settle();
    expect(el.textContent).toContain('Reporte de ventas');
  });

  it('un tipo de reporte desconocido en la URL vuelve a Ventas sin pedir el reporte dos veces', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/admin/reports/hack?${OCT}`, ReportsAdminPageComponent);
    el = harness.routeNativeElement!;
    http.expectOne(`${environment.baseUrl}/brands`).flush({ ok: true, brands: [] });
    await tick();
    report('sales').flush(makeReportResponse()); // una sola petición, con los filtros conservados
    await settle();
    expect(TestBed.inject(Router).url).toBe(`/admin/reports/sales?${OCT}`);
    expect(el.textContent).toContain('Reporte de ventas');
  });

  it('no deja aplicar un rango de fechas invertido ni uno incompleto', async () => {
    await open();
    report('sales').flush(makeReportResponse());
    await settle();
    type('filter-startDate', '2026-10-31');
    type('filter-endDate', '2026-10-01');
    harness.detectChanges();
    expect(el.textContent).toContain('La fecha inicial no puede ser posterior a la final.');
    expect(button('Aplicar filtros').disabled).toBe(true);
    type('filter-startDate', '');
    harness.detectChanges();
    expect(el.textContent).toContain('Indica la fecha inicial y la fecha final.');
    http.expectNone((req) => req.url === reportUrl('sales'));
  });

  it('no tiene violaciones de accesibilidad detectables con axe (con datos y vacío)', async () => {
    await open();
    report('sales').flush(makeReportResponse(makeSalesReport(), { pages: 3 }));
    await settle();
    const rules = { 'color-contrast': { enabled: false }, region: { enabled: false } };
    expect((await axe.run(el, { rules })).violations.map((v) => v.id)).toEqual([]);

    await harness.navigateByUrl(`/admin/reports/sales?${OCT}&customer=nadie`, ReportsAdminPageComponent);
    report('sales', (p) => p.get('customer') === 'nadie').flush(makeReportResponse(makeSalesReport({ rowCount: 0, rows: [], totals: null })));
    await settle();
    expect((await axe.run(el, { rules })).violations.map((v) => v.id)).toEqual([]);
  });
});
