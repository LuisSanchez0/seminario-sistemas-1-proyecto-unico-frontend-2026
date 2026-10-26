import { defaultFilters, filtersFromParams, guatemalaToday } from './report-filter-fields';

const params = (values: Record<string, string>) => (key: string) => values[key] ?? null;

describe('filtros de reportes', () => {
  it('"hoy" es el día de Guatemala (UTC-6), no el de UTC', () => {
    // 01/11 05:30 UTC es todavía 31/10 23:30 en Guatemala.
    expect(guatemalaToday(new Date('2026-11-01T05:30:00.000Z'))).toBe('2026-10-31');
    expect(guatemalaToday(new Date('2026-11-01T06:00:00.000Z'))).toBe('2026-11-01');
    expect(guatemalaToday(new Date('2026-10-24T03:00:00.000Z'))).toBe('2026-10-23');
  });

  it('el período predeterminado es el mes en curso hasta hoy y el inventario no tiene fechas', () => {
    const now = new Date('2026-10-24T17:00:00.000Z');
    expect(defaultFilters('sales', now)).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-24' });
    expect(defaultFilters('products', now)).toMatchObject({ startDate: '2026-10-01', order: 'top' });
    expect(defaultFilters('inventory', now)).toEqual({ category: '', brand: '', search: '', stockStatus: 'all', lowStockThreshold: '' });
    expect(defaultFilters('customers', now)).toMatchObject({ endDate: '2026-10-24', repeatOnly: '' });
  });

  it('solo expone los filtros que cada reporte soporta', () => {
    const now = new Date('2026-10-24T17:00:00.000Z');
    expect(Object.keys(defaultFilters('sales', now))).toEqual(['startDate', 'endDate', 'paymentState', 'orderState', 'customer']);
    expect(Object.keys(defaultFilters('customers', now))).toEqual(['startDate', 'endDate', 'customer', 'repeatOnly']);
    expect(Object.keys(defaultFilters('inventory', now))).not.toContain('startDate');
  });

  it('lee los filtros de la URL y descarta valores inválidos', () => {
    const now = new Date('2026-10-24T17:00:00.000Z');
    const filters = filtersFromParams(
      'sales',
      params({ startDate: '2026-09-01', endDate: 'ayer', paymentState: 'HACK', orderState: 'ENVIADO', customer: ' ana ' }),
      now,
    );
    // La fecha final inválida se reemplaza por la predeterminada (hoy); la inicial válida se respeta.
    expect(filters).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-10-24',
      paymentState: '',
      orderState: 'ENVIADO',
      customer: 'ana',
    });
    const inventory = filtersFromParams('inventory', params({ stockStatus: 'low', lowStockThreshold: '9999999', brand: 'no-es-id', category: 'LABIOS' }));
    expect(inventory).toMatchObject({ stockStatus: 'low', lowStockThreshold: '', brand: '', category: 'LABIOS' });
    expect(filtersFromParams('customers', params({ repeatOnly: 'true' }), now)['repeatOnly']).toBe('true');
    expect(filtersFromParams('customers', params({ repeatOnly: 'quizá' }), now)['repeatOnly']).toBe('');
  });

  it('el reporte de productos solo ofrece estados de pedido que cuentan como venta', () => {
    const now = new Date('2026-10-24T17:00:00.000Z');
    expect(filtersFromParams('products', params({ orderState: 'CANCELADO' }), now)['orderState']).toBe('');
    expect(filtersFromParams('products', params({ orderState: 'COMPLETADO' }), now)['orderState']).toBe('COMPLETADO');
  });
});
