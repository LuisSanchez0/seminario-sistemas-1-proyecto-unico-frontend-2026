import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-summary',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummaryComponent {
  subtotal = input.required<number>();
  total = input.required<number>();
  itemCount = input.required<number>();
  lineCount = input.required<number>();
  /** Gate computed once on the page; never re-derived here. */
  canCheckout = input.required<boolean>();
  blockReason = input<string>('');
  validating = input<boolean>(false);
}
