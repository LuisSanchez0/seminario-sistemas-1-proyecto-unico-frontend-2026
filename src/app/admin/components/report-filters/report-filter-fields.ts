import {
  ORDER_STATE_LABELS,
  ORDER_STATES,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATES,
} from '../../../orders/interfaces/order.interface';
import { PRODUCT_CATEGORY_OPTIONS } from '../../../products/interfaces/product.interface';
import { ReportFilterValues, ReportType } from '../../interfaces/report.interface';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  kind: 'date' | 'text' | 'select' | 'checkbox' | 'number';
  options?: readonly FilterOption[];
  /** Los selects de marca se llenan con el catálogo real. */
  brands?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  hint?: string;
}

const ALL = { value: '', label: 'Todos' };
const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>): FilterOption[] =>
  values.map((value) => ({ value, label: labels[value] }));

/** Solo los pedidos válidos cuentan como venta en el reporte de productos. */
const SALE_ORDER_STATES = ORDER_STATES.filter((state) => state !== 'CANCELADO' && state !== 'REEMBOLSADO');

const START: FilterField = { key: 'startDate', label: 'Desde', kind: 'date' };
const END: FilterField = { key: 'endDate', label: 'Hasta', kind: 'date' };
const CATEGORY: FilterField = {
  key: 'category',
  label: 'Categoría',
  kind: 'select',
  options: [{ value: '', label: 'Todas' }, ...PRODUCT_CATEGORY_OPTIONS],
};
const BRAND: FilterField = { key: 'brand', label: 'Marca', kind: 'select', brands: true };

/** Solo los filtros que el backend sabe aplicar a cada reporte; el servidor valida y filtra. */
export const FILTER_FIELDS: Record<ReportType, readonly FilterField[]> = {
  sales: [
    START,
    END,
    { key: 'paymentState', label: 'Estado de pago', kind: 'select', options: [ALL, ...toOptions(PAYMENT_STATES, PAYMENT_STATE_LABELS)] },
    { key: 'orderState', label: 'Estado del pedido', kind: 'select', options: [ALL, ...toOptions(ORDER_STATES, ORDER_STATE_LABELS)] },
    { key: 'customer', label: 'Cliente', kind: 'text', placeholder: 'Nombre o correo' },
  ],
  products: [
    START,
    END,
    CATEGORY,
    BRAND,
    { key: 'search', label: 'Producto', kind: 'text', placeholder: 'Nombre del producto' },
    { key: 'orderState', label: 'Estado del pedido', kind: 'select', options: [{ value: '', label: 'Todos los cobrados' }, ...toOptions(SALE_ORDER_STATES, ORDER_STATE_LABELS)] },
    {
      key: 'order',
      label: 'Orden',
      kind: 'select',
      options: [
        { value: 'top', label: 'Más vendidos primero' },
        { value: 'least', label: 'Menos vendidos primero' },
      ],
    },
  ],
  inventory: [
    CATEGORY,
    BRAND,
    { key: 'search', label: 'Producto', kind: 'text', placeholder: 'Nombre del producto' },
    {
      key: 'stockStatus',
      label: 'Estado de stock',
      kind: 'select',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'ok', label: 'Disponible' },
        { value: 'low', label: 'Stock bajo' },
        { value: 'out', label: 'Agotado' },
      ],
    },
    { key: 'lowStockThreshold', label: 'Stock bajo hasta (unidades)', kind: 'number', min: 1, max: 1000, hint: 'Por defecto 5.' },
  ],
  customers: [
    START,
    END,
    { key: 'customer', label: 'Cliente', kind: 'text', placeholder: 'Nombre o correo' },
    { key: 'repeatOnly', label: 'Solo clientes recurrentes', kind: 'checkbox' },
  ],
};

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Hoy en Guatemala (AAAA-MM-DD), no en la zona del navegador ni en UTC. */
export function guatemalaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Valores por defecto: el mes en curso (hora de Guatemala) para reportes con período. */
export function defaultFilters(type: ReportType, now: Date = new Date()): ReportFilterValues {
  const today = guatemalaToday(now);
  const values: ReportFilterValues = {};
  for (const field of FILTER_FIELDS[type]) values[field.key] = '';
  if ('startDate' in values) {
    values['startDate'] = `${today.slice(0, 8)}01`;
    values['endDate'] = today;
  }
  if (type === 'inventory') values['stockStatus'] = 'all';
  if (type === 'products') values['order'] = 'top';
  return values;
}

/** Filtros efectivos desde la URL: se descartan valores inválidos y se completan con los predeterminados. */
export function filtersFromParams(
  type: ReportType,
  get: (key: string) => string | null,
  now: Date = new Date(),
): ReportFilterValues {
  const defaults = defaultFilters(type, now);
  const result: ReportFilterValues = {};
  for (const field of FILTER_FIELDS[type]) {
    const raw = (get(field.key) ?? '').trim();
    let value = raw;
    if (field.kind === 'date' && !DATE_RE.test(raw)) value = '';
    if (field.kind === 'number' && !/^\d{1,4}$/.test(raw)) value = '';
    if (field.kind === 'checkbox' && raw !== 'true') value = '';
    if (field.kind === 'select' && field.options && !field.options.some((option) => option.value === raw)) value = '';
    if (field.key === 'brand' && !/^[a-f\d]{24}$/i.test(raw)) value = '';
    if (field.kind === 'text') value = raw.slice(0, 80);
    result[field.key] = value || defaults[field.key];
  }
  // Un período siempre necesita ambas fechas.
  if ('startDate' in result && (!result['startDate'] || !result['endDate'])) {
    result['startDate'] = defaults['startDate'];
    result['endDate'] = defaults['endDate'];
  }
  return result;
}
