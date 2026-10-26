import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of } from 'rxjs';
import { ProductService } from '../../../products/services/product.service';
import { PaginationService } from '../../../shared/components/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination/pagination.component';
import { apiErrorMessage, NotificationService } from '../../../shared/services/notification.service';
import { ReportFiltersComponent } from '../../components/report-filters/report-filters.component';
import { filtersFromParams } from '../../components/report-filters/report-filter-fields';
import { ReportTableComponent } from '../../components/report-table/report-table.component';
import { ReportValuePipe } from '../../components/report-table/report-value.pipe';
import {
  ExportFormat,
  REPORT_DESCRIPTIONS,
  REPORT_LABELS,
  REPORT_TYPES,
  ReportFilterValues,
  ReportType,
} from '../../interfaces/report.interface';
import { ReportExportError, ReportService } from '../../services/report.service';

const PAGE_SIZE = 20;

const EXPORT_LABELS: Record<ExportFormat, { idle: string; busy: string; name: string }> = {
  pdf: { idle: 'Exportar PDF', busy: 'Generando PDF…', name: 'PDF' },
  xlsx: { idle: 'Exportar Excel', busy: 'Generando Excel…', name: 'Excel' },
};

@Component({
  selector: 'app-reports-admin-page',
  imports: [
    RouterLink,
    ReportFiltersComponent,
    ReportTableComponent,
    ReportValuePipe,
    PaginationComponent,
  ],
  templateUrl: './reports-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsAdminPageComponent {
  private readonly reports = inject(ReportService);
  private readonly products = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pagination = inject(PaginationService);
  private readonly notifications = inject(NotificationService);

  readonly apiErrorMessage = apiErrorMessage;
  readonly types = REPORT_TYPES;
  readonly labels = REPORT_LABELS;
  readonly descriptions = REPORT_DESCRIPTIONS;
  readonly exportLabels = EXPORT_LABELS;
  readonly formats: readonly ExportFormat[] = ['pdf', 'xlsx'];

  /** Tipo de reporte y filtros viven en la URL: se conservan al recargar, volver atrás o compartir. */
  private readonly state = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([params, query]) => {
        const raw = params.get('type') as ReportType;
        const type: ReportType = REPORT_TYPES.includes(raw) ? raw : 'sales';
        return { type, valid: REPORT_TYPES.includes(raw), filters: filtersFromParams(type, (key) => query.get(key)) };
      }),
    ),
  );
  // Con igualdad por valor: una navegación que no cambia nada (p. ej. el redirect de un tipo inválido)
  // no vuelve a pedir el reporte.
  readonly type = computed(() => this.state()?.type ?? 'sales');
  readonly filters = computed<ReportFilterValues>(() => this.state()?.filters ?? {}, {
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  readonly page = this.pagination.currentPage;

  readonly brandsResource = rxResource({
    stream: () => this.products.getBrands().pipe(catchError(() => of([]))),
  });
  readonly brands = computed(() => (this.brandsResource.hasValue() ? this.brandsResource.value() : []));

  readonly reportResource = rxResource({
    params: () => ({ type: this.type(), filters: this.filters(), page: this.page() }),
    stream: ({ params: { type, filters, page } }) =>
      this.reports.getReport(type, filters, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  readonly response = computed(() =>
    this.reportResource.hasValue() ? this.reportResource.value() : undefined,
  );
  /** Evita mostrar el reporte anterior bajo la pestaña nueva mientras llega la respuesta. */
  readonly current = computed(() => {
    const response = this.response();
    return response && response.report.key === this.type() ? response : undefined;
  });

  readonly exporting = signal<ExportFormat | null>(null);
  readonly exportError = signal('');
  readonly exportDone = signal('');
  readonly canExport = computed(
    () => !!this.current() && this.current()!.count > 0 && !this.reportResource.isLoading(),
  );

  constructor() {
    // Un tipo desconocido en la URL vuelve a Ventas.
    effect(() => {
      if (this.state() && !this.state()!.valid) {
        void this.router.navigate(['/admin/reports', 'sales'], { replaceUrl: true, queryParamsHandling: 'preserve' });
      }
    });
    // Si la página pedida ya no existe (p. ej. tras filtrar), se vuelve a la última válida.
    effect(() => {
      const response = this.response();
      if (!this.reportResource.isLoading() && response && this.page() > Math.max(1, response.pages)) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { page: Math.max(1, response.pages) },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  applyFilters(values: ReportFilterValues): void {
    const queryParams: Record<string, string | number | null> = { page: 1 };
    for (const [key, value] of Object.entries(values)) queryParams[key] = value || null;
    this.exportError.set('');
    this.exportDone.set('');
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  export(format: ExportFormat): void {
    if (this.exporting() || !this.canExport()) return;
    this.exporting.set(format);
    this.exportError.set('');
    this.exportDone.set('');
    // Se exporta lo que se ve: mismo tipo y mismos filtros aplicados, sin paginación (todas las filas).
    this.reports.exportReport(this.type(), format, this.filters()).subscribe({
      next: (file) => {
        this.reports.save(file);
        this.exporting.set(null);
        this.exportDone.set(`Se descargó ${file.fileName}.`);
      },
      error: (error: unknown) => {
        const message =
          error instanceof ReportExportError ? error.message : 'No se pudo exportar el reporte.';
        this.exporting.set(null);
        this.exportError.set(message);
        this.notifications.error('No se pudo exportar', message);
      },
    });
  }
}
