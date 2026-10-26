import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Brand } from '../../../products/interfaces/product.interface';
import { ReportFilterValues, ReportType } from '../../interfaces/report.interface';
import { defaultFilters, FILTER_FIELDS } from './report-filter-fields';

const MAX_RANGE_DAYS = 1830;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/**
 * Formulario de filtros de un reporte. Solo muestra los filtros que el backend aplica y los envía
 * tal cual: el servidor es quien filtra, valida y calcula (la pantalla no filtra datos en el navegador).
 */
@Component({
  selector: 'app-report-filters',
  host: { class: 'block' },
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="card bg-base-100 border border-base-300 p-5 space-y-4"
      [formGroup]="form()"
      (ngSubmit)="submit()"
      aria-label="Filtros del reporte"
    >
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (field of fields(); track field.key) {
          @switch (field.kind) {
            @case ('checkbox') {
              <div class="flex items-end">
                <label class="label cursor-pointer justify-start gap-3 min-h-11">
                  <input type="checkbox" class="checkbox checkbox-primary" [id]="'filter-' + field.key" [checked]="form().controls[field.key].value === 'true'" (change)="toggle(field.key, $event)" />
                  <span class="font-medium">{{ field.label }}</span>
                </label>
              </div>
            }
            @case ('select') {
              <div>
                <label [for]="'filter-' + field.key" class="block font-medium mb-2">{{ field.label }}</label>
                <select [id]="'filter-' + field.key" class="select select-bordered w-full" [formControlName]="field.key">
                  @if (field.brands) {
                    <option value="">Todas</option>
                    @for (brand of brands(); track brand.id) {
                      <option [value]="brand.id">{{ brand.name }}</option>
                    }
                  } @else {
                    @for (option of field.options; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  }
                </select>
              </div>
            }
            @default {
              <div>
                <label [for]="'filter-' + field.key" class="block font-medium mb-2">{{ field.label }}</label>
                <input
                  [id]="'filter-' + field.key"
                  [type]="field.kind === 'text' ? 'search' : field.kind"
                  class="input input-bordered w-full"
                  [attr.placeholder]="field.placeholder ?? null"
                  [attr.min]="field.min ?? null"
                  [attr.max]="field.max ?? null"
                  [attr.maxlength]="field.kind === 'text' ? 80 : null"
                  [attr.inputmode]="field.kind === 'number' ? 'numeric' : null"
                  [attr.aria-describedby]="field.hint ? 'hint-' + field.key : null"
                  [formControlName]="field.key"
                />
                @if (field.hint) {
                  <p [id]="'hint-' + field.key" class="mt-1 text-sm">{{ field.hint }}</p>
                }
              </div>
            }
          }
        }
      </div>
      @if (error(); as message) {
        <p role="alert" class="text-error text-sm">{{ message }}</p>
      }
      <div class="flex flex-wrap gap-3">
        <button type="submit" class="btn btn-primary" [disabled]="!!error()">Aplicar filtros</button>
        <button type="button" class="btn" (click)="clear()">Restablecer</button>
      </div>
    </form>
  `,
})
export class ReportFiltersComponent {
  readonly type = input.required<ReportType>();
  /** Filtros vigentes (vienen de la URL); el formulario se sincroniza con ellos. */
  readonly values = input.required<ReportFilterValues>();
  readonly brands = input<readonly Brand[]>([]);
  readonly applied = output<ReportFilterValues>();

  readonly fields = computed(() => FILTER_FIELDS[this.type()]);
  readonly form = computed(
    () =>
      new FormGroup(
        Object.fromEntries(this.fields().map((field) => [field.key, new FormControl('', { nonNullable: true })])),
      ),
  );

  constructor() {
    effect(() => this.form().reset({ ...defaultFilters(this.type()), ...this.values() }));
  }

  /** Mensaje de validación local (el servidor vuelve a validar todo). */
  error(): string {
    const { startDate, endDate, lowStockThreshold } = this.form().getRawValue();
    if ('startDate' in this.form().controls) {
      if (!startDate || !endDate) return 'Indica la fecha inicial y la fecha final.';
      if (startDate > endDate) return 'La fecha inicial no puede ser posterior a la final.';
      if (dayNumber(endDate) - dayNumber(startDate) > MAX_RANGE_DAYS) return 'El rango de fechas no puede exceder 5 años.';
    }
    if (lowStockThreshold) {
      const number = Number(lowStockThreshold);
      if (!Number.isInteger(number) || number < 1 || number > 1000) return 'El umbral de stock bajo debe ser un entero entre 1 y 1000.';
    }
    return '';
  }

  toggle(key: string, event: Event): void {
    this.form().controls[key].setValue((event.target as HTMLInputElement).checked ? 'true' : '');
  }

  submit(): void {
    if (this.error()) return;
    const raw = this.form().getRawValue();
    this.applied.emit(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value.trim()])));
  }

  clear(): void {
    const defaults = defaultFilters(this.type());
    this.form().reset(defaults);
    this.applied.emit(defaults);
  }
}
