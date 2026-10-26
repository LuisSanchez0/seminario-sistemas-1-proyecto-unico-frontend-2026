import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardPeriod,
  DashboardResponse,
  ExportedFile,
  ExportFormat,
  ReportFilterValues,
  ReportResponse,
  ReportType,
} from '../interfaces/report.interface';

const baseUrl = `${environment.baseUrl}/admin`;

/** Error de exportación con un mensaje seguro para mostrar al administrador. */
export class ReportExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportExportError';
  }
}

const EXPORT_FALLBACK = 'No se pudo exportar el reporte. Inténtalo de nuevo.';

/** Parámetros HTTP sin valores vacíos. */
function toParams(values: Record<string, string | number | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

/** Con `responseType: 'blob'` el cuerpo del error también llega como Blob: se lee para mostrar el `msg` del servidor. */
async function exportErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof HttpErrorResponse)) return EXPORT_FALLBACK;
  if (error.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  try {
    const body: unknown = error.error;
    const text = body instanceof Blob ? await body.text() : typeof body === 'string' ? body : '';
    const parsed: unknown = text ? JSON.parse(text) : body;
    if (typeof parsed === 'object' && parsed !== null && 'msg' in parsed) {
      const msg = (parsed as { msg: unknown }).msg;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
  } catch {
    // Cuerpo que no es JSON: se usa el mensaje genérico.
  }
  return error.status === 401 || error.status === 403
    ? 'No tienes permiso para exportar reportes.'
    : EXPORT_FALLBACK;
}

/** Nombre sugerido por el servidor (`filename*` o `filename`), sin rutas ni caracteres peligrosos. */
export function fileNameFromDisposition(header: string | null, fallback: string): string {
  let name = '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header ?? '')?.[1];
  if (encoded) {
    try {
      name = decodeURIComponent(encoded);
    } catch {
      name = '';
    }
  }
  if (!name) name = /filename="?([^";]+)"?/i.exec(header ?? '')?.[1] ?? '';
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
  return name || fallback;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  getDashboard(
    period: DashboardPeriod,
    range: { startDate?: string; endDate?: string } = {},
  ): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${baseUrl}/dashboard`, {
      params: toParams({
        period,
        startDate: period === 'custom' ? range.startDate : undefined,
        endDate: period === 'custom' ? range.endDate : undefined,
      }),
    });
  }

  /** Datos en pantalla: una página del detalle, con KPIs y totales de TODO el filtro. */
  getReport(
    type: ReportType,
    filters: ReportFilterValues,
    { limit, offset }: { limit: number; offset: number },
  ): Observable<ReportResponse> {
    return this.http.get<ReportResponse>(`${baseUrl}/reports/${type}`, {
      params: toParams({ ...filters, limit, offset }),
    });
  }

  /** Archivo generado por el backend con los mismos filtros; ignora la paginación y trae todas las filas. */
  exportReport(
    type: ReportType,
    format: ExportFormat,
    filters: ReportFilterValues,
  ): Observable<ExportedFile> {
    return this.http
      .get(`${baseUrl}/reports/${type}/export`, {
        params: toParams({ ...filters, format }),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => {
          if (!response.body || response.body.size === 0) throw new ReportExportError(EXPORT_FALLBACK);
          return {
            blob: response.body,
            fileName: fileNameFromDisposition(
              response.headers.get('Content-Disposition'),
              `reporte-${type}.${format}`,
            ),
          };
        }),
        catchError((error: unknown) =>
          error instanceof ReportExportError
            ? throwError(() => error)
            : from(exportErrorMessage(error)).pipe(
                switchMap((message) => throwError(() => new ReportExportError(message))),
              ),
        ),
      );
  }

  /** Dispara la descarga en el navegador sin abrir nada ni usar rutas arbitrarias. */
  save(file: ExportedFile): void {
    const url = URL.createObjectURL(file.blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = file.fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    this.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
