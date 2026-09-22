import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-cart-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './empty-cart-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyCartStateComponent {}
