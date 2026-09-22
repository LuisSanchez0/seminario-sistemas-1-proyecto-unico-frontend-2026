import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of } from 'rxjs';
import { ProductService } from '../../../products/services/product.service';
import { ProductDetailsComponent } from './product-details/product-details.component';
import { apiErrorMessage } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-product-admin-page',
  imports: [ProductDetailsComponent, RouterLink],
  templateUrl: './product-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAdminPageComponent {
  private route = inject(ActivatedRoute);
  private service = inject(ProductService);
  readonly apiErrorMessage = apiErrorMessage;
  readonly productId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? 'new')),
    { initialValue: 'new' },
  );
  readonly productResource = rxResource({
    params: () => ({ id: this.productId() }),
    stream: ({ params }) =>
      params.id === 'new' ? of(null) : this.service.getProductById(params.id),
  });
}
