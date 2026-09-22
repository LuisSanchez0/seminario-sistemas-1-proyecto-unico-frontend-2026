import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-checkout-empty-address-state',
  standalone: true,
  imports: [],
  templateUrl: './checkout-empty-address-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutEmptyAddressStateComponent {
  /** Emits when the user clicks the "Add address" CTA. */
  addClicked = output<void>();
}
