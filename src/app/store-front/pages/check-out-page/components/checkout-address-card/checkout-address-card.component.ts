import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Address } from '../../../../interfaces/addresses.interface';

@Component({
  selector: 'app-checkout-address-card',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './checkout-address-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutAddressCardComponent {
  address = input.required<Address>();
  selected = input<boolean>(false);

  select = output<void>();
  edit   = output<void>();
  remove = output<void>();

  readonly cardClasses = computed(() =>
    this.selected()
      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 shadow-sm'
      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
  );
}
