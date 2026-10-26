import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { fileNameFromDisposition, ReportExportError, ReportService } from './report.service';

const base = `${environment.baseUrl}/admin`;

describe('ReportService', () => {
  let service: ReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('pide el reporte con filtros y paginación, sin enviar valores vacíos', () => {
    service
      .getReport('sales', { startDate: '2026-10-01', endDate: '2026-10-31', customer: '', paymentState: 'PAGO_REALIZADO' }, { limit: 20, offset: 40 })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${base}/reports/sales`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('startDate')).toBe('2026-10-01');
    expect(request.request.params.get('paymentState')).toBe('PAGO_REALIZADO');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('offset')).toBe('40');
    expect(request.request.params.has('customer')).toBe(false);
    request.flush({});
  });

  it('el panel solo manda fechas en el período personalizado', () => {
    service.getDashboard('week', { startDate: '2026-10-01', endDate: '2026-10-02' }).subscribe();
    const week = http.expectOne((req) => req.url === `${base}/dashboard`);
    expect(week.request.params.get('period')).toBe('week');
    expect(week.request.params.has('startDate')).toBe(false);
    week.flush({});

    service.getDashboard('custom', { startDate: '2026-10-01', endDate: '2026-10-02' }).subscribe();
    const custom = http.expectOne((req) => req.url === `${base}/dashboard`);
    expect(custom.request.params.get('startDate')).toBe('2026-10-01');
    expect(custom.request.params.get('endDate')).toBe('2026-10-02');
    custom.flush({});
  });

  it('exporta con los mismos filtros, sin paginación y devuelve el archivo con el nombre del servidor', () => {
    let file: { blob: Blob; fileName: string } | undefined;
    service
      .exportReport('sales', 'xlsx', { startDate: '2026-10-01', endDate: '2026-10-31', orderState: '' })
      .subscribe((value) => (file = value));
    const request = http.expectOne((req) => req.url === `${base}/reports/sales/export`);
    expect(request.request.responseType).toBe('blob');
    expect(request.request.params.get('format')).toBe('xlsx');
    expect(request.request.params.get('startDate')).toBe('2026-10-01');
    expect(request.request.params.has('limit')).toBe(false);
    expect(request.request.params.has('offset')).toBe(false);
    expect(request.request.params.has('orderState')).toBe(false);
    request.flush(new Blob(['xlsx']), {
      headers: {
        'Content-Disposition':
          `attachment; filename="reporte-ventas-2026-10-01-a-2026-10-31.xlsx"; filename*=UTF-8''reporte-ventas-2026-10-01-a-2026-10-31.xlsx`,
      },
    });
    expect(file?.fileName).toBe('reporte-ventas-2026-10-01-a-2026-10-31.xlsx');
    expect(file?.blob.size).toBe(4);
  });

  it('traduce el cuerpo Blob de un error del servidor a un mensaje seguro', async () => {
    let error: unknown;
    service.exportReport('sales', 'pdf', {}).subscribe({ error: (e) => (error = e) });
    http
      .expectOne((req) => req.url === `${base}/reports/sales/export`)
      .flush(new Blob([JSON.stringify({ ok: false, msg: 'El rango de fechas no es válido' })]), { status: 400, statusText: 'Bad Request' });
    await vi.waitFor(() => expect(error).toBeInstanceOf(ReportExportError));
    expect((error as Error).message).toBe('El rango de fechas no es válido');
  });

  it('usa un mensaje genérico cuando el error no trae JSON y distingue permisos y red', async () => {
    const messages: string[] = [];
    for (const [status, body] of [
      [500, new Blob(['<html>stack trace</html>'])],
      [401, new Blob([''])],
      [0, new Blob([''])],
    ] as const) {
      messages.push(
        await new Promise<string>((resolve) => {
          service.exportReport('sales', 'pdf', {}).subscribe({ error: (e: Error) => resolve(e.message) });
          http.expectOne((req) => req.url === `${base}/reports/sales/export`).flush(body, { status, statusText: 'x' });
        }),
      );
    }
    expect(messages[0]).toBe('No se pudo exportar el reporte. Inténtalo de nuevo.');
    expect(messages[0]).not.toContain('stack');
    expect(messages[1]).toBe('No tienes permiso para exportar reportes.');
    expect(messages[2]).toContain('No se pudo conectar');
  });

  it('un archivo vacío cuenta como error en lugar de descargar nada', async () => {
    let error: unknown;
    service.exportReport('inventory', 'pdf', {}).subscribe({ error: (e) => (error = e) });
    http.expectOne((req) => req.url === `${base}/reports/inventory/export`).flush(new Blob([]));
    await vi.waitFor(() => expect(error).toBeInstanceOf(ReportExportError));
  });

  it('save() descarga con un <a download> y libera la URL', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:fake');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const clicked: Array<{ download: string; href: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href });
    });
    service.save({ blob: new Blob(['x']), fileName: 'inventario-2026-10-24.pdf' });
    expect(clicked).toEqual([{ download: 'inventario-2026-10-24.pdf', href: 'blob:fake' }]);
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(1500);
    expect(revoke).toHaveBeenCalledWith('blob:fake');
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe('fileNameFromDisposition', () => {
  it('prefiere filename* y decodifica', () => {
    expect(fileNameFromDisposition(`attachment; filename="a.pdf"; filename*=UTF-8''reporte%20ni%C3%B1os.pdf`, 'x.pdf')).toBe('reporte niños.pdf');
  });
  it('quita rutas y caracteres peligrosos', () => {
    expect(fileNameFromDisposition('attachment; filename="../../etc/passwd"', 'x.pdf')).toBe('....etcpasswd');
    expect(fileNameFromDisposition(null, 'x.pdf')).toBe('x.pdf');
    expect(fileNameFromDisposition('attachment', 'reporte.xlsx')).toBe('reporte.xlsx');
  });
});
