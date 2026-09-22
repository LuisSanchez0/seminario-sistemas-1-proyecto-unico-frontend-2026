import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
//import { SellService } from '../../../sell/services/sell.service';
// import {
//   AdminSellsSearchQuery,
//   ORDER_STATE_LABELS,
//   OrderState,
//   PAYMENT_STATE_LABELS,
//   PaymentState,
//   Sell,
// } from '../../../sell/interfaces/sell.interface';
import {
  //AdminFiltersState,
  SearchType,
  SellAdminFiltersComponent,
} from '../../components/sell-admin-filters/sell-admin-filters.component';
import { SellAdminCardComponent } from '../../components/sell-admin-card/sell-admin-card.component';
import { SellAdminEmptyStateComponent } from '../../components/sell-admin-empty-state/sell-admin-empty-state.component';
import { SellAdminLoadingStateComponent } from '../../components/sell-admin-loading-state/sell-admin-loading-state.component';

/** Pill descriptor shown in the active-filters bar. */
interface FilterPill {
  label: string;
  value: string;
}

@Component({
  selector: 'app-sells-admin-page',
  standalone: true,
  templateUrl: './sells-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellsAdminPageComponent {

}
