import { DashboardResponse, ReportData, ReportResponse } from '../interfaces/report.interface';

/** Reporte de ventas con la forma exacta del backend (octubre 2026: 7 pedidos, 4 cobrados). */
export function makeSalesReport(overrides: Partial<ReportData> = {}): ReportData {
  return {
    key: 'sales',
    title: 'Reporte de ventas',
    fileBase: 'reporte-ventas-2026-10-01-a-2026-10-31',
    filters: [
      { label: 'Período', value: '01/10/2026 al 31/10/2026' },
      { label: 'Estado de pago', value: 'Todos' },
      { label: 'Estado del pedido', value: 'Todos' },
      { label: 'Cliente', value: 'Todos' },
    ],
    notes: ['Pedido cobrado: pago confirmado y no cancelado ni reembolsado.'],
    kpis: [
      { key: 'orders', label: 'Pedidos del período', value: 7, type: 'int' },
      { key: 'collectedOrders', label: 'Ventas cobradas', value: 4, type: 'int' },
      { key: 'revenue', label: 'Ingresos cobrados', value: 1077.25, type: 'money' },
      { key: 'averageTicket', label: 'Ticket promedio', value: 269.31, type: 'money' },
    ],
    breakdowns: [
      {
        key: 'byPayment',
        title: 'Por estado de pago',
        columns: [
          { key: 'label', header: 'Estado', type: 'text' },
          { key: 'orders', header: 'Pedidos', type: 'int' },
          { key: 'amount', header: 'Monto', type: 'money' },
        ],
        rows: [
          { label: 'Pago pendiente', orders: 1, amount: 100.25 },
          { label: 'Pago confirmado', orders: 4, amount: 1077.25 },
        ],
        totals: { label: 'Totales', orders: 5, amount: 1177.5 },
      },
    ],
    columns: [
      { key: 'orderCode', header: 'Pedido', type: 'text' },
      { key: 'createdAt', header: 'Fecha', type: 'datetime' },
      { key: 'customerName', header: 'Cliente', type: 'text' },
      { key: 'units', header: 'Unidades', type: 'int' },
      { key: 'total', header: 'Total', type: 'money' },
      { key: 'collected', header: 'Ingreso cobrado', type: 'money' },
    ],
    rows: [
      {
        orderCode: 'LUM-TEST-000004',
        createdAt: '2026-11-01T05:59:59.999Z', // 31/10/2026 23:59 en Guatemala
        customerName: 'Alicia Pérez',
        units: 3,
        total: 176.5,
        collected: 176.5,
      },
      {
        orderCode: 'LUM-TEST-000003',
        createdAt: '2026-10-01T06:00:00.000Z', // 01/10/2026 00:00 en Guatemala
        customerName: 'Alicia Pérez',
        units: 3,
        total: 275.5,
        collected: 275.5,
      },
    ],
    rowCount: 7,
    totals: { orderCode: 'Totales', units: 13, total: 1527.5, collected: 1077.25 },
    ...overrides,
  };
}

export function makeReportResponse(
  report: ReportData = makeSalesReport(),
  overrides: Partial<ReportResponse> = {},
): ReportResponse {
  return {
    ok: true,
    report,
    count: report.rowCount,
    limit: 20,
    offset: 0,
    pages: Math.ceil(report.rowCount / 20),
    ...overrides,
  };
}

export function makeDashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    ok: true,
    timezone: 'America/Guatemala',
    generatedAt: '2026-10-24T17:15:00.000Z',
    today: '2026-10-24',
    period: {
      key: 'month',
      label: 'Este mes',
      startDate: '2026-10-01',
      endDate: '2026-10-24',
      text: '01/10/2026 al 24/10/2026',
    },
    sales: { orders: 7, collectedOrders: 4, revenue: 1077.25, averageTicket: 269.31, units: 10, completedOrders: 2 },
    current: {
      pendingPayment: 3,
      awaitingVerification: 1,
      toPrepare: 2,
      inPreparation: 1,
      shipped: 1,
      lowStock: 2,
      outOfStock: 1,
      lowStockThreshold: 5,
      customers: 12,
    },
    lowestStock: [
      { id: '500000000000000000000001', title: 'Rubor Rosa Suave', stock: 0 },
      { id: '500000000000000000000002', title: 'Labial Rojo Intenso', stock: 3 },
    ],
    topProducts: [
      { id: '500000000000000000000003', title: 'Base Fit Matte', units: 4, revenue: 400 },
      { id: '500000000000000000000002', title: 'Labial Rojo Intenso', units: 3, revenue: 151.5 },
    ],
    ...overrides,
  };
}
