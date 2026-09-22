import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';


@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './order-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPage {
  
}
