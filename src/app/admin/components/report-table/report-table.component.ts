import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReportColumn, ReportRow } from '../../interfaces/report.interface';
import { ReportValuePipe } from './report-value.pipe';

/**
 * Tabla genérica guiada por los metadatos de columnas que envía el backend. En pantallas anchas es una
 * tabla con encabezado y totales; en móvil cada fila pasa a tarjeta para no obligar a desplazarse.
 */
@Component({
  selector: 'app-report-table',
  host: { class: 'block' },
  imports: [ReportValuePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Tabla (md+) -->
    <div
      class="hidden md:block card bg-base-100 border border-base-300 overflow-x-auto"
      role="region"
      tabindex="0"
      [attr.aria-label]="'Tabla: ' + caption()"
    >
      <table class="table table-sm">
        <caption class="sr-only">
          {{ caption() }}
        </caption>
        <thead>
          <tr>
            @for (column of columns(); track column.key) {
              <th scope="col" [class.text-right]="isNumeric(column)">{{ column.header }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>
              @for (column of columns(); track column.key; let first = $first) {
                @if (first) {
                  <th scope="row" class="font-medium whitespace-normal">
                    {{ row[column.key] | reportValue: column.type }}
                  </th>
                } @else {
                  <td [class.text-right]="isNumeric(column)" [class.whitespace-nowrap]="isNumeric(column) || column.type === 'datetime'">
                    {{ row[column.key] | reportValue: column.type }}
                  </td>
                }
              }
            </tr>
          }
        </tbody>
        @if (totals(); as totals) {
          <tfoot>
            <tr class="font-semibold bg-base-200">
              @for (column of columns(); track column.key; let first = $first) {
                @if (first) {
                  <th scope="row">{{ totalsLabel() }}</th>
                } @else {
                  <td [class.text-right]="isNumeric(column)" [class.whitespace-nowrap]="isNumeric(column)">
                    {{ totals[column.key] | reportValue: column.type }}
                  </td>
                }
              }
            </tr>
          </tfoot>
        }
      </table>
    </div>

    <!-- Tarjetas (móvil) -->
    <ul class="space-y-3 md:hidden" [attr.aria-label]="caption()">
      @for (row of rows(); track $index) {
        <li class="card bg-base-100 border border-base-300 p-4">
          <p class="font-semibold break-words">{{ row[columns()[0].key] | reportValue: columns()[0].type }}</p>
          <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            @for (column of columns().slice(1); track column.key) {
              @if (row[column.key] !== null && row[column.key] !== undefined && row[column.key] !== '') {
                <dt class="text-base-content/80">{{ column.header }}</dt>
                <dd class="text-right break-words">{{ row[column.key] | reportValue: column.type }}</dd>
              }
            }
          </dl>
        </li>
      }
      @if (totals(); as totals) {
        <li class="card bg-base-200 border border-base-300 p-4">
          <p class="font-semibold">{{ totalsLabel() }}</p>
          <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm font-medium">
            @for (column of columns().slice(1); track column.key) {
              @if (totals[column.key] !== null && totals[column.key] !== undefined && totals[column.key] !== '') {
                <dt>{{ column.header }}</dt>
                <dd class="text-right">{{ totals[column.key] | reportValue: column.type }}</dd>
              }
            }
          </dl>
        </li>
      }
    </ul>
  `,
})
export class ReportTableComponent {
  readonly caption = input.required<string>();
  readonly columns = input.required<ReportColumn[]>();
  readonly rows = input.required<ReportRow[]>();
  readonly totals = input<ReportRow | null>(null);
  readonly totalsLabel = input('Totales');

  isNumeric(column: ReportColumn): boolean {
    return column.type === 'money' || column.type === 'int' || column.type === 'percent';
  }
}
