import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  ORDER_STATE_LABELS,
  ORDER_STATES,
  PAYMENT_STATE_LABELS,
  PAYMENT_STATES,
} from '../../../orders/interfaces/order.interface';

export interface OrderAdminFilterValues {
  orderCode: string;
  customer: string;
  paymentState: string;
  orderState: string;
  startDate: string;
  endDate: string;
}

export const EMPTY_ORDER_FILTERS: OrderAdminFilterValues = {
  orderCode: '',
  customer: '',
  paymentState: '',
  orderState: '',
  startDate: '',
  endDate: '',
};

@Component({
  selector: 'app-order-admin-filters',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form
      class="card bg-base-100 border border-base-300 p-5 space-y-4"
      [formGroup]="form"
      (ngSubmit)="submit()"
      aria-label="Filtros de pedidos"
    >
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <label for="filter-order-code" class="block font-medium mb-2">Código de pedido</label>
          <input
            id="filter-order-code"
            type="search"
            class="input input-bordered w-full"
            placeholder="LUM-…"
            maxlength="40"
            formControlName="orderCode"
          />
        </div>
        <div>
          <label for="filter-customer" class="block font-medium mb-2">Cliente</label>
          <input
            id="filter-customer"
            type="search"
            class="input input-bordered w-full"
            placeholder="Nombre o correo"
            maxlength="80"
            formControlName="customer"
          />
        </div>
        <div>
          <label for="filter-payment" class="block font-medium mb-2">Estado de pago</label>
          <select id="filter-payment" class="select select-bordered w-full" formControlName="paymentState">
            <option value="">Todos</option>
            @for (state of paymentStates; track state) {
              <option [value]="state">{{ paymentLabels[state] }}</option>
            }
          </select>
        </div>
        <div>
          <label for="filter-order-state" class="block font-medium mb-2">Estado del pedido</label>
          <select id="filter-order-state" class="select select-bordered w-full" formControlName="orderState">
            <option value="">Todos</option>
            @for (state of orderStates; track state) {
              <option [value]="state">{{ orderLabels[state] }}</option>
            }
          </select>
        </div>
        <div>
          <label for="filter-start" class="block font-medium mb-2">Desde</label>
          <input id="filter-start" type="date" class="input input-bordered w-full" formControlName="startDate" />
        </div>
        <div>
          <label for="filter-end" class="block font-medium mb-2">Hasta</label>
          <input id="filter-end" type="date" class="input input-bordered w-full" formControlName="endDate" />
        </div>
      </div>
      @if (dateRangeInvalid()) {
        <p role="alert" class="text-error text-sm">La fecha inicial no puede ser posterior a la final.</p>
      }
      <div class="flex flex-wrap gap-3">
        <button type="submit" class="btn btn-primary" [disabled]="dateRangeInvalid()">Aplicar filtros</button>
        <button type="button" class="btn" (click)="clear()">Limpiar</button>
      </div>
    </form>
  `,
})
export class OrderAdminFiltersComponent {
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Filtros vigentes (vienen de la URL); el formulario se sincroniza con ellos. */
  readonly values = input<OrderAdminFilterValues>(EMPTY_ORDER_FILTERS);
  readonly applied = output<OrderAdminFilterValues>();
  readonly cleared = output();

  readonly paymentStates = PAYMENT_STATES;
  readonly orderStates = ORDER_STATES;
  readonly paymentLabels = PAYMENT_STATE_LABELS;
  readonly orderLabels = ORDER_STATE_LABELS;

  readonly form = this.fb.group({
    orderCode: '',
    customer: '',
    paymentState: '',
    orderState: '',
    startDate: '',
    endDate: '',
  });

  constructor() {
    effect(() => this.form.reset(this.values()));
  }

  dateRangeInvalid(): boolean {
    const { startDate, endDate } = this.form.getRawValue();
    return !!startDate && !!endDate && startDate > endDate;
  }

  submit(): void {
    if (this.dateRangeInvalid()) return;
    const raw = this.form.getRawValue();
    this.applied.emit({ ...raw, orderCode: raw.orderCode.trim(), customer: raw.customer.trim() });
  }

  clear(): void {
    this.form.reset(EMPTY_ORDER_FILTERS);
    this.cleared.emit();
  }
}
