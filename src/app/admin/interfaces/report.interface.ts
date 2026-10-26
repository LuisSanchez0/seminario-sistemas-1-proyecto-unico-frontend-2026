/** Contrato de reportes y panel del backend (`/api/admin`). La pantalla solo muestra lo que el servidor calcula. */

export type ReportType = 'sales' | 'products' | 'inventory' | 'customers';
export type ExportFormat = 'pdf' | 'xlsx';
export type ReportValueType = 'text' | 'int' | 'money' | 'datetime' | 'percent';

export const REPORT_TYPES: readonly ReportType[] = ['sales', 'products', 'inventory', 'customers'];

export const REPORT_LABELS: Record<ReportType, string> = {
  sales: 'Ventas',
  products: 'Productos',
  inventory: 'Inventario',
  customers: 'Clientes',
};

export const REPORT_DESCRIPTIONS: Record<ReportType, string> = {
  sales: 'Pedidos del período con su cobro, envío y estado.',
  products: 'Unidades y ventas por producto en pedidos válidos.',
  inventory: 'Existencias actuales del catálogo activo.',
  customers: 'Compras y recurrencia de clientes en el período.',
};

export interface ReportColumn {
  key: string;
  header: string;
  type: ReportValueType;
  width?: number;
}

export type ReportCell = string | number | null | undefined;
export type ReportRow = Record<string, ReportCell>;

export interface ReportKpi {
  key: string;
  label: string;
  value: number;
  type: ReportValueType;
}

export interface ReportBreakdown {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: ReportRow | null;
}

export interface ReportFilterSummary {
  label: string;
  value: string;
}

export interface ReportData {
  key: ReportType;
  title: string;
  fileBase: string;
  filters: ReportFilterSummary[];
  notes: string[];
  kpis: ReportKpi[];
  breakdowns: ReportBreakdown[];
  columns: ReportColumn[];
  rows: ReportRow[];
  rowCount: number;
  totals: ReportRow | null;
}

export interface ReportResponse {
  ok: boolean;
  report: ReportData;
  count: number;
  limit: number;
  offset: number;
  pages: number;
}

/** Valores del formulario de filtros (siempre texto; vacío = sin filtro). */
export type ReportFilterValues = Record<string, string>;

export interface ExportedFile {
  blob: Blob;
  fileName: string;
}

// ── Panel ────────────────────────────────────────────────────────────────────

export type DashboardPeriod = 'today' | 'week' | 'month' | 'custom';

export const DASHBOARD_PERIODS: ReadonlyArray<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
];

export interface DashboardResponse {
  ok: boolean;
  timezone: string;
  generatedAt: string;
  today: string;
  period: { key: DashboardPeriod; label: string; startDate: string; endDate: string; text: string };
  sales: {
    orders: number;
    collectedOrders: number;
    revenue: number;
    averageTicket: number;
    units: number;
    completedOrders: number;
  };
  current: {
    pendingPayment: number;
    awaitingVerification: number;
    toPrepare: number;
    inPreparation: number;
    shipped: number;
    lowStock: number;
    outOfStock: number;
    lowStockThreshold: number;
    customers: number;
  };
  lowestStock: Array<{ id: string; title: string; stock: number }>;
  topProducts: Array<{ id: string; title: string; units: number; revenue: number }>;
}
