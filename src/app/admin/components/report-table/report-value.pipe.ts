import { formatCurrency, formatDate, formatNumber } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { ReportCell, ReportValueType } from '../../interfaces/report.interface';

/** Guatemala no tiene horario de verano: UTC-6 todo el año. */
export const REPORT_TIME_ZONE = '-0600';

/**
 * Da formato a un valor del reporte igual que el PDF y el Excel (Q1,077.25 · 38.4 % · dd/mm/aaaa hh:mm):
 * el dato ya viene calculado por el servidor, aquí solo se presenta.
 */
@Pipe({ name: 'reportValue' })
export class ReportValuePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: ReportCell, type: ReportValueType): string {
    if (value === null || value === undefined || value === '') return '';
    switch (type) {
      case 'money':
        return formatCurrency(Number(value), this.locale, 'Q', 'GTQ', '1.2-2');
      case 'int':
        return formatNumber(Number(value), this.locale, '1.0-0');
      case 'percent':
        return `${formatNumber(Number(value) * 100, this.locale, '1.1-1')} %`;
      case 'datetime':
        return formatDate(value, 'dd/MM/yyyy HH:mm', this.locale, REPORT_TIME_ZONE);
      default:
        return String(value);
    }
  }
}
