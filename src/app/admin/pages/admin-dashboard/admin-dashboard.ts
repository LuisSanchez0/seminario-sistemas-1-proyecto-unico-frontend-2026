import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { EMPTY, Subject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// import {
//   ApexAxisChartSeries,
//   ApexChart,
//   ApexDataLabels,
//   ApexGrid,
//   ApexLegend,
//   ApexNonAxisChartSeries,
//   ApexPlotOptions,
//   ApexResponsive,
//   ApexTooltip,
//   ApexXAxis,
//   ApexYAxis,
//   NgApexchartsModule,
// } from 'ng-apexcharts';

import { StatsService } from '../../services/stats.service';
import {
  DashboardStats,
  DashboardStatsResponse,
  DepartmentStat,
  ProductStat,
} from '../../interfaces/stats.interface';

// ─── Chart option types ───────────────────────────────────────────────────────

// type BarChartOptions = {
//   series: ApexAxisChartSeries;
//   chart: ApexChart;
//   xaxis: ApexXAxis;
//   yaxis: ApexYAxis;
//   dataLabels: ApexDataLabels;
//   plotOptions: ApexPlotOptions;
//   colors: string[];
//   tooltip: ApexTooltip;
//   grid: ApexGrid;
// };

// type DonutChartOptions = {
//   series: ApexNonAxisChartSeries;
//   chart: ApexChart;
//   labels: string[];
//   colors: string[];
//   dataLabels: ApexDataLabels;
//   legend: ApexLegend;
//   tooltip: ApexTooltip;
//   plotOptions: ApexPlotOptions;
//   responsive: ApexResponsive[];
// };

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = ['#2563eb', '#4f46e5', '#7c3aed', '#0891b2', '#059669'];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getProductName(p: ProductStat): string {
  return p.title ?? p.slug ?? 'Producto';
}

function getProductValue(p: ProductStat): number {
  return p.totalSold ?? 0;
}

function getDepartmentValue(d: DepartmentStat): number {
  return d.totalSales ?? 0;
}

/**
 * Maps raw backend response to the normalized DashboardStats model.
 * Canonical fields (new backend) take priority; ?? 0 / ?? [] ensure no blanks.
 */
function normalizeDashboardStats(r: DashboardStatsResponse): DashboardStats {
  return {
    commonUsersCount: r.commonUsersCount ?? 0,
    validSalesCount:  r.validSalesCount  ?? 0,
    systemRevenue:    r.systemRevenue    ?? 0,
    topSellingProducts:  r.topSellingProducts  ?? [],
    leastSellingProducts: r.leastSellingProducts ?? [],
    topDepartments:   r.topDepartments   ?? [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly refresh$ = new Subject<void>();

  readonly skeletonKpi    = [1, 2, 3, 4];
  readonly skeletonCharts = [1, 2, 3];

  stats     = signal<DashboardStats | null>(null);
  isLoading = signal(false);
  error     = signal<string | null>(null);

  topProduct = computed<ProductStat | null>(
    () => this.stats()?.topSellingProducts?.[0] ?? null,
  );

  topDepartment = computed<DepartmentStat | null>(
    () => this.stats()?.topDepartments?.[0] ?? null,
  );

  // ─── Chart computed signals ─────────────────────────────────────────────────

  // topProductsChart = computed<BarChartOptions>(() => {
  //   const products = this.stats()?.topSellingProducts ?? [];
  //   return {
  //     series: [{ name: 'Unidades vendidas', data: products.map(getProductValue) }],
  //     chart: { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'inherit' },
  //     plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '65%' } },
  //     xaxis: {
  //       categories: products.map(getProductName),
  //       labels: { style: { colors: '#64748b', fontSize: '11px' } },
  //       axisBorder: { show: false },
  //       axisTicks: { show: false },
  //     },
  //     yaxis: { labels: { style: { colors: '#475569', fontSize: '11px' } } },
  //     colors: [PALETTE[0]],
  //     dataLabels: { enabled: false },
  //     grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  //     tooltip: { y: { formatter: (val: number) => `${val} uds.` } },
  //   };
  // });

  // leastProductsChart = computed<BarChartOptions>(() => {
  //   const products = this.stats()?.leastSellingProducts ?? [];
  //   return {
  //     series: [{ name: 'Unidades vendidas', data: products.map(getProductValue) }],
  //     chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
  //     plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '55%' } },
  //     xaxis: {
  //       categories: products.map(getProductName),
  //       labels: { style: { colors: '#64748b', fontSize: '11px' }, rotate: -20 },
  //       axisBorder: { show: false },
  //       axisTicks: { show: false },
  //     },
  //     yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' } } },
  //     colors: ['#f59e0b'],
  //     dataLabels: { enabled: false },
  //     grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  //     tooltip: { y: { formatter: (val: number) => `${val} uds.` } },
  //   };
  // });

  // departmentsChart = computed<DonutChartOptions>(() => {
  //   const departments = this.stats()?.topDepartments ?? [];
  //   return {
  //     series: departments.map(getDepartmentValue),
  //     chart: { type: 'donut', height: 340, fontFamily: 'inherit' },
  //     labels: departments.map(d => d.department),
  //     colors: PALETTE,
  //     dataLabels: { enabled: true, style: { fontFamily: 'inherit', fontSize: '11px' } },
  //     legend: { position: 'bottom', fontFamily: 'inherit', fontSize: '13px', offsetY: 8 },
  //     tooltip: { y: { formatter: (val: number) => `${val} pedidos` } },
  //     plotOptions: { pie: { donut: { size: '62%' } } },
  //     responsive: [
  //       { breakpoint: 480, options: { chart: { height: 280 }, legend: { position: 'bottom' } } },
  //     ],
  //   };
  // });

  // ─── Data loading ───────────────────────────────────────────────────────────

  constructor() {
    this.refresh$
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.statsService.getDashboardStats().pipe(
            tap(raw => console.log('[Dashboard] raw response:', raw)),
            map(normalizeDashboardStats),
            tap(normalized => console.log('[Dashboard] normalized stats:', normalized)),
            catchError(err => {
              console.error('[Dashboard] load error:', err);
              this.error.set('No pudimos cargar las estadísticas del dashboard.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(data => {
        this.stats.set(data);
        this.isLoading.set(false);
      });
  }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.refresh$.next();
  }

  getTopProductValue(): number {
    const p = this.topProduct();
    return p ? getProductValue(p) : 0;
  }
}
