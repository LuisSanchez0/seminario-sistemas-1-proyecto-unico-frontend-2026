import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
// import {
//   ORDER_STATE_LABELS,
//   OrderState,
//   PAYMENT_STATE_LABELS,
//   PaymentState,
// } from '../../../sell/interfaces/sell.interface';

export type SearchType = 'customerName' | 'orderCode';

// export interface AdminFiltersState {
//   searchType: SearchType;
//   searchTerm: string;
//   paymentState: PaymentState | '';
//   orderState: OrderState | '';
//   startDate: string;
//   endDate: string;
// }

@Component({
  selector: 'app-sell-admin-filters',
  standalone: true,
  imports: [],
  templateUrl: './sell-admin-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellAdminFiltersComponent {
  // readonly applyFilters = output<AdminFiltersState>();
  // readonly clearFilters = output<void>();

  // // ── Local UI state ────────────────────────────────────────────────────────
  // readonly searchType      = signal<SearchType>('orderCode');
  // readonly searchTerm      = signal('');
  // readonly paymentState    = signal<PaymentState | ''>('');
  // readonly orderState      = signal<OrderState | ''>('');
  // readonly startDateValue  = signal('');
  // readonly endDateValue    = signal('');
  // readonly dateError       = signal<string | null>(null);

  // // ── Static options for selects ────────────────────────────────────────────
  // readonly searchTypeOptions: { value: SearchType; label: string }[] = [
  //   { value: 'orderCode',    label: 'Código de pedido' },
  //   { value: 'customerName', label: 'Nombre del cliente' },
  // ];

  // readonly paymentStateOptions: { value: PaymentState; label: string }[] =
  //   (Object.entries(PAYMENT_STATE_LABELS) as [PaymentState, string][]).map(
  //     ([value, label]) => ({ value, label }),
  //   );

  // readonly orderStateOptions: { value: OrderState; label: string }[] =
  //   (Object.entries(ORDER_STATE_LABELS) as [OrderState, string][]).map(
  //     ([value, label]) => ({ value, label }),
  //   );

  // get searchPlaceholder(): string {
  //   return this.searchType() === 'orderCode'
  //     ? 'Ej. PRO-20260505-KX0IL7…'
  //     : 'Ej. Juan García…';
  // }

  // // ── Event handlers ────────────────────────────────────────────────────────

  // onSearchTypeChange(event: Event): void {
  //   this.searchType.set((event.target as HTMLSelectElement).value as SearchType);
  // }

  // onSearchTermInput(event: Event): void {
  //   this.searchTerm.set((event.target as HTMLInputElement).value);
  // }

  // onPaymentStateChange(event: Event): void {
  //   this.paymentState.set((event.target as HTMLSelectElement).value as PaymentState | '');
  // }

  // onOrderStateChange(event: Event): void {
  //   this.orderState.set((event.target as HTMLSelectElement).value as OrderState | '');
  // }

  // onStartDateChange(event: Event): void {
  //   this.startDateValue.set((event.target as HTMLInputElement).value);
  //   this.dateError.set(null);
  // }

  // onEndDateChange(event: Event): void {
  //   this.endDateValue.set((event.target as HTMLInputElement).value);
  //   this.dateError.set(null);
  // }

  // onApply(): void {
  //   const start = this.startDateValue().trim();
  //   const end   = this.endDateValue().trim();

  //   if ((start && !end) || (!start && end)) {
  //     this.dateError.set('Si introduces una fecha, ambas son requeridas.');
  //     return;
  //   }

  //   if (start && end && start > end) {
  //     this.dateError.set('La fecha de inicio no puede ser mayor a la fecha fin.');
  //     return;
  //   }

  //   this.dateError.set(null);
  //   this.applyFilters.emit({
  //     searchType:   this.searchType(),
  //     searchTerm:   this.searchTerm(),
  //     paymentState: this.paymentState(),
  //     orderState:   this.orderState(),
  //     startDate:    start,
  //     endDate:      end,
  //   });
  // }

  // onClear(): void {
  //   this.searchType.set('orderCode');
  //   this.searchTerm.set('');
  //   this.paymentState.set('');
  //   this.orderState.set('');
  //   this.startDateValue.set('');
  //   this.endDateValue.set('');
  //   this.dateError.set(null);
  //   this.clearFilters.emit();
  // }
}
