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
import { CurrencyPipe, DatePipe } from '@angular/common';
import { SellService } from '../../../sell/services/sell.service';
import {
  buildShippingTimeline,
  LogoLocation,
  ORDER_STATE_LABELS,
  OrderState,
  PAYMENT_STATE_LABELS,
  PaymentState,
  Sell,
  SHIPPING_STATUS_LABELS,
  SHIPPING_STATUS_STEPS,
  SellProduct,
  ShippingAddressObject,
  ShippingStatus,
  ShippingTimelineStep,
} from '../../../sell/interfaces/sell.interface';
import { Product } from '../../../products/interfaces/product.interface';
import { AddressesService } from '../../services/addresses.service';

function isAddressObject(
  value: ShippingAddressObject | string,
): value is ShippingAddressObject {
  return typeof value === 'object' && value !== null && 'department' in value;
}

const LOGO_LOCATION_LABELS: Record<LogoLocation, string> = {
  LEFT_CHEST: 'Pecho izquierdo',
  RIGHT_CHEST: 'Pecho derecho',
  RIGHT_SHOULDER: 'Hombro derecho',
  SLEEVES: 'Mangas',
  UPPER_BACK: 'Espalda superior',
  CENTER_CAP: 'Centro (gorra)',
  NO_LOGO: 'Sin logo',
};

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './order-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly sellService = inject(SellService);
  private readonly addressesService = inject(AddressesService);

  readonly sellId = this.route.snapshot.paramMap.get('sellId') ?? '';

  readonly sellResource = rxResource({
    stream: (): Observable<Sell | null> =>
      this.sellService
        .getSellById(this.sellId)
        .pipe(map((r) => r.sell)),
    defaultValue: null as Sell | null,
  });

  // ── Shipping address resolution ───────────────────────────────────────────────
  readonly shippingAddress        = signal<ShippingAddressObject | null>(null);
  readonly shippingAddressLoading = signal(false);
  readonly shippingAddressError   = signal<string | null>(null);

  constructor() {
    // Use untracked() so that signal reads inside resolveShippingAddress
    // (e.g. shippingAddressLoading) do not get tracked by this effect,
    // which would cause unintended re-runs and potential infinite loops.
    effect(() => {
      const s = this.sellResource.value();
      untracked(() => {
        if (s) this.resolveShippingAddress(s);
      });
    });
  }

  private resolveShippingAddress(sell: Sell): void {
    const addr = sell.shippingAddress;

    if (!addr) {
      this.shippingAddress.set(null);
      return;
    }

    if (isAddressObject(addr)) {
      this.shippingAddress.set(addr);
      return;
    }

    // Guard against duplicate in-flight requests.
    if (this.shippingAddressLoading()) return;

    this.shippingAddressLoading.set(true);
    this.shippingAddressError.set(null);

    this.addressesService.getAddressById(addr).subscribe({
      next: (address) => {
        this.shippingAddressLoading.set(false);
        this.shippingAddress.set(address);
      },
      error: () => {
        this.shippingAddressLoading.set(false);
        this.shippingAddressError.set('No pudimos cargar la dirección de envío.');
      },
    });
  }

  getTimeline(productLine: SellProduct): ShippingTimelineStep[] {
    return buildShippingTimeline(productLine);
  }

  getShippingProgress(product: SellProduct): number {
    const idx = SHIPPING_STATUS_STEPS.indexOf(product.shippingStatus);
    const step = idx >= 0 ? idx : 0;
    return ((step + 1) / SHIPPING_STATUS_STEPS.length) * 100;
  }

  getProductTitle(product: string | Product): string {
    if (typeof product === 'string') return 'Producto';
    return product.title;
  }

  getProductImage(product: string | Product): string | null {
    if (typeof product === 'string') return null;
    return product.images?.[0]?.url ?? null;
  }

  getStatusLabel(status: ShippingStatus): string {
    return SHIPPING_STATUS_LABELS[status];
  }

  getStatusBadgeClass(status: ShippingStatus): string {
    switch (status) {
      case 'DELIVERED':  return 'bg-green-100 text-green-700';
      case 'SHIPPED':    return 'bg-blue-100 text-blue-700';
      case 'PROCESSING': return 'bg-amber-100 text-amber-700';
      default:           return 'bg-gray-100 text-gray-600';
    }
  }

  getStatusBarClass(status: ShippingStatus): string {
    switch (status) {
      case 'DELIVERED':  return 'bg-green-500';
      case 'SHIPPED':    return 'bg-blue-500';
      case 'PROCESSING': return 'bg-amber-500';
      default:           return 'bg-indigo-600';
    }
  }

  getLogoLocationLabel(location: LogoLocation | undefined): string {
    if (!location) return 'Sin logo';
    return LOGO_LOCATION_LABELS[location];
  }

  hasLogo(product: SellProduct): boolean {
    return !!product.logoLocation && product.logoLocation !== 'NO_LOGO';
  }

  getPaymentStateLabel(state: PaymentState | undefined): string {
    if (!state) return '—';
    return PAYMENT_STATE_LABELS[state] ?? state;
  }

  getOrderStateLabel(state: OrderState | undefined): string {
    if (!state) return '—';
    return ORDER_STATE_LABELS[state] ?? state;
  }

  getPaymentStateBadge(state: PaymentState | undefined): string {
    switch (state) {
      case 'PAGO_REALIZADO':    return 'bg-green-100 text-green-700 ring-green-200';
      case 'EN_ESPERA_DE_PAGO': return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'CANCELADO':         return 'bg-red-100 text-red-700 ring-red-200';
      case 'REEMBOLSADO':       return 'bg-purple-100 text-purple-700 ring-purple-200';
      default:                  return 'bg-gray-100 text-gray-600 ring-gray-200';
    }
  }

  getOrderStateBadge(state: OrderState | undefined): string {
    switch (state) {
      case 'COMPLETADO':           return 'bg-green-100 text-green-700 ring-green-200';
      case 'ENVIADO':              return 'bg-blue-100 text-blue-700 ring-blue-200';
      case 'EN_PROCESO':           return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'PARCIALMENTE_ENVIADO': return 'bg-sky-100 text-sky-700 ring-sky-200';
      case 'CANCELADO':            return 'bg-red-100 text-red-700 ring-red-200';
      case 'REEMBOLSADO':          return 'bg-purple-100 text-purple-700 ring-purple-200';
      default:                     return 'bg-gray-100 text-gray-600 ring-gray-200';
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
