import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../shared/services/notification.service';
import { guatemalaToday } from '../../components/report-filters/report-filter-fields';
import { DASHBOARD_PERIODS, DashboardPeriod } from '../../interfaces/report.interface';
import { ReportService } from '../../services/report.service';

/** Definición de cada indicador: se muestra en pantalla para que nadie interprete mal una cifra. */
export const DASHBOARD_DEFINITIONS: ReadonlyArray<{ name: string; text: string }> = [
  { name: 'Pedidos del período', text: 'Pedidos recibidos en el período, en cualquier estado. Fecha: la del pedido, en hora de Guatemala.' },
  { name: 'Ventas cobradas', text: 'Pedidos con pago confirmado que no están cancelados ni reembolsados.' },
  { name: 'Ingresos cobrados', text: 'Suma del total (productos + envío) de las ventas cobradas, en quetzales (GTQ). No incluye pagos pendientes, cancelados ni reembolsados.' },
  { name: 'Ticket promedio', text: 'Ingresos cobrados ÷ ventas cobradas.' },
  { name: 'Unidades cobradas', text: 'Unidades de producto de las ventas cobradas.' },
  { name: 'Pedidos entregados', text: 'Pedidos completados cuya fecha de entrega cae en el período.' },
  { name: 'Pendientes ahora', text: 'Foto del momento (no depende del período): pagos por confirmar, pedidos pagados por preparar, en preparación y enviados.' },
  { name: 'Stock bajo / agotado', text: 'Productos activos con existencias entre 1 y el umbral (5 por defecto), o en 0. Se lee directamente de la base de datos.' },
];

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, CurrencyPipe, DecimalPipe, DatePipe],
  templateUrl: './admin-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private readonly reports = inject(ReportService);

  readonly apiErrorMessage = apiErrorMessage;
  readonly periods = DASHBOARD_PERIODS;
  readonly definitions = DASHBOARD_DEFINITIONS;

  readonly period = signal<DashboardPeriod>('month');
  private readonly today = guatemalaToday();
  readonly draftStart = signal(`${this.today.slice(0, 8)}01`);
  readonly draftEnd = signal(this.today);
  /** Rango personalizado ya aplicado (solo cambia al pulsar "Aplicar"). */
  readonly customRange = signal({ startDate: this.draftStart(), endDate: this.draftEnd() });

  readonly rangeError = computed(() => {
    const start = this.draftStart();
    const end = this.draftEnd();
    if (!start || !end) return 'Indica la fecha inicial y la fecha final.';
    if (start > end) return 'La fecha inicial no puede ser posterior a la final.';
    return '';
  });

  readonly dashboard = rxResource({
    params: () => ({ period: this.period(), range: this.customRange() }),
    stream: ({ params }) => this.reports.getDashboard(params.period, params.range),
  });
  readonly data = computed(() => (this.dashboard.hasValue() ? this.dashboard.value() : undefined));

  /** Enlaces a pedidos que reproducen exactamente la cifra mostrada. */
  readonly reportDates = computed(() => {
    const period = this.data()?.period;
    return period ? { startDate: period.startDate, endDate: period.endDate } : {};
  });

  select(period: DashboardPeriod): void {
    this.period.set(period);
  }

  applyRange(): void {
    if (this.rangeError()) return;
    this.customRange.set({ startDate: this.draftStart(), endDate: this.draftEnd() });
  }

  onDate(which: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (which === 'start' ? this.draftStart : this.draftEnd).set(value);
  }
}
