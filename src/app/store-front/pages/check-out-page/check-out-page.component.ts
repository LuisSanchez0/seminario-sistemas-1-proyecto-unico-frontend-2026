import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { StoreFront } from '../../services/store-front';
import { AddressesService } from '../../services/addresses.service';
import { apiErrorMessage, NotificationService } from '../../../shared/services/notification.service';
import {
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
} from '../../interfaces/addresses.interface';
import { ProductService } from '../../../products/services/product.service';
import { OrderService } from '../../../orders/services/order.service';
import { CreateOrderPayload } from '../../../orders/interfaces/order.interface';

import { CheckoutAddressSelectorComponent } from './components/checkout-address-selector/checkout-address-selector.component';
import { CheckoutPaymentCardComponent } from './components/checkout-payment-card/checkout-payment-card.component';
import { CheckoutOrderSummaryComponent } from './components/checkout-order-summary/checkout-order-summary.component';

/** Valid NIT: "CF" (case-insensitive) OR digits with optional hyphen and digit/K suffix. */
function newCheckoutKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const NIT_RE = /^(CF|[0-9]+-?[0-9K])$/i;

@Component({
  selector: 'app-check-out-page',
  imports: [
    RouterLink,
    CheckoutAddressSelectorComponent,
    CheckoutPaymentCardComponent,
    CheckoutOrderSummaryComponent,
  ],
  templateUrl: './check-out-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckOutPageComponent implements OnInit {
  readonly cartStore = inject(StoreFront);
  private readonly addressService = inject(AddressesService);
  private readonly notifications = inject(NotificationService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ── Address state ──────────────────────────────────────────────────────────

  readonly addresses = signal<Address[]>([]);
  readonly selectedAddress = signal<Address | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ── Payment state ──────────────────────────────────────────────────────────

  readonly receiptImageBase64 = signal<string | null>(null);
  readonly receiptFile = signal<File | null>(null);

  // ── Checkout state ─────────────────────────────────────────────────────────

  readonly isPlacingOrder = signal(false);
  readonly checkoutError = signal<string | null>(null);
  /** `true` cuando el error exige revisar el carrito (stock o precios cambiaron). */
  readonly cartNeedsReview = signal(false);

  /**
   * Identifica este intento de checkout. Si la respuesta se pierde y el cliente reintenta, el
   * servidor devuelve el pedido ya creado en vez de duplicarlo.
   */
  private readonly checkoutKey = newCheckoutKey();

  // ── Billing / NIT state ────────────────────────────────────────────────────

  readonly wantsInvoice = signal(false);
  readonly nit = signal('');

  // ── Derived totals ─────────────────────────────────────────────────────────

  readonly subtotal = computed(() => this.cartStore.cartTotal());
  readonly shippingCost = computed(() => this.selectedAddress()?.shipping_cost ?? 0);
  readonly orderTotal = computed(() => this.subtotal() + this.shippingCost());

  // ── NIT validation ─────────────────────────────────────────────────────────

  /** Non-null when the NIT field has content that does not pass validation. */
  readonly nitError = computed<string | null>(() => {
    if (!this.wantsInvoice()) return null;
    const value = this.nit().trim();
    if (value === '') return null; // empty → fallback to CF, not an error
    return NIT_RE.test(value) ? null : 'El NIT solo puede contener letras, números y guiones.';
  });

  // ── Form validity ──────────────────────────────────────────────────────────

  readonly canPlaceOrder = computed(
    () =>
      !this.isPlacingOrder() &&
      !this.isSaving() &&
      this.cartStore.cartLineCount() > 0 &&
      this.selectedAddress() !== null &&
      this.receiptFile() !== null &&
      this.nitError() === null,
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadAddresses();
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  onAddressSelect(id: string): void {
    const found = this.addresses().find((a) => a._id === id) ?? null;
    this.selectedAddress.set(found);
  }

  onAddressAdd(payload: CreateAddressPayload): void {
    this.isSaving.set(true);

    this.addressService
      .createAddress(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.loadAddresses(created._id);
          this.notifications.success(
            'Dirección guardada',
            'La dirección fue agregada correctamente.',
          );
        },
        error: () => {
          this.isSaving.set(false);
          this.notifications.error('Error', 'No se pudo guardar la dirección. Intenta nuevamente.');
        },
      });
  }

  onAddressUpdate({ id, payload }: { id: string; payload: UpdateAddressPayload }): void {
    this.isSaving.set(true);

    this.addressService
      .updateAddress(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.loadAddresses(this.selectedAddress()?._id);
          this.notifications.success('Dirección actualizada', 'Los cambios fueron guardados.');
        },
        error: () => {
          this.isSaving.set(false);
          this.notifications.error(
            'Error',
            'No se pudo actualizar la dirección. Intenta nuevamente.',
          );
        },
      });
  }

  onAddressRemove(id: string): void {
    const currentSelectedId = this.selectedAddress()?._id;
    const wasSelected = currentSelectedId === id;

    if (wasSelected) {
      this.selectedAddress.set(null);
    }

    this.addressService
      .deleteAddress(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadAddresses(),
        error: () => {
          if (wasSelected) {
            const prev = this.addresses().find((a) => a._id === id) ?? null;
            this.selectedAddress.set(prev);
          }
          this.notifications.error(
            'Error',
            'No se pudo eliminar la dirección. Intenta nuevamente.',
          );
        },
      });
  }

  onReceiptChange(event: { base64: string; file: File } | null): void {
    this.receiptImageBase64.set(event?.base64 ?? null);
    this.receiptFile.set(event?.file ?? null);
  }

  onWantsInvoiceChange(checked: boolean): void {
    this.wantsInvoice.set(checked);
    if (!checked) this.nit.set('');
  }

  onNitChange(value: string): void {
    this.nit.set(value);
  }

  onPlaceOrder(): void {
    const address = this.selectedAddress();
    const cartItems = this.cartStore.cartItems();
    const receiptFile = this.receiptFile();

    if (!address) {
      this.notifications.error('Dirección requerida', 'Selecciona una dirección de envío.');
      return;
    }

    if (cartItems.length === 0) {
      this.notifications.error('Carrito vacío', 'Agrega productos al carrito antes de continuar.');
      return;
    }

    if (!receiptFile) {
      this.notifications.error(
        'Comprobante requerido',
        'Sube el comprobante de pago antes de confirmar.',
      );
      return;
    }

    const nitValidationError = this.nitError();
    if (nitValidationError) {
      this.notifications.error('NIT inválido', nitValidationError);
      return;
    }

    if (this.isPlacingOrder()) return;
    if (
      cartItems.some(
        (item) =>
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > item.product.stock,
      )
    ) {
      this.notifications.error('Stock insuficiente', 'Revisa las cantidades de tu carrito.');
      return;
    }

    this.isPlacingOrder.set(true);
    this.checkoutError.set(null);
    this.cartNeedsReview.set(false);

    // Solo se envían ids y cantidades: precios, envío, total y estados los calcula el servidor.
    const payload: CreateOrderPayload = {
      items: cartItems.map((item) => ({ product: item.product.id, quantity: item.quantity })),
      shippingAddress: address._id,
      paymentMethod: 'TRANSFERENCIA',
      nit: this.wantsInvoice() ? this.nit().trim() || 'CF' : 'CF',
      checkoutKey: this.checkoutKey,
    };

    this.orderService
      .createOrder(payload)
      .pipe(
        // Si el comprobante falla el pedido ya existe: no se pierde, el cliente lo reenvía desde el detalle.
        switchMap(({ order }) =>
          this.orderService.uploadPaymentReceipt(order.id, receiptFile).pipe(
            map(() => ({ order, receiptFailed: false })),
            catchError(() => of({ order, receiptFailed: true })),
          ),
        ),
        finalize(() => this.isPlacingOrder.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ order, receiptFailed }) => {
          this.productService.clearProductsCache();
          this.cartStore.clearCart();
          if (receiptFailed) {
            this.notifications.info(
              'Pedido creado',
              'No pudimos subir tu comprobante. Súbelo desde el detalle del pedido.',
              6000,
            );
          } else {
            this.notifications.success('¡Pedido registrado!', `Código de pedido: ${order.orderCode}`);
          }
          void this.router.navigate(['/my-orders', order.id], { queryParams: { placed: 1 } });
        },
        error: (error: { status?: number }) => {
          const message = apiErrorMessage(
            error,
            'Ocurrió un error al procesar tu pedido. Intenta nuevamente.',
          );
          this.checkoutError.set(message);
          // 409: el stock cambió. Se descarta la caché para que el carrito se revalide con datos reales.
          if (error?.status === 409) {
            this.cartNeedsReview.set(true);
            this.productService.clearProductsCache();
          }
          this.notifications.error('No se pudo crear el pedido', message);
        },
      });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private loadAddresses(preserveSelectionId?: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.addressService
      .getAddresses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (addresses) => {
          this.addresses.set(addresses);
          this._resolveSelection(addresses, preserveSelectionId);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las direcciones.');
          this.isLoading.set(false);
        },
      });
  }

  private _resolveSelection(addresses: Address[], preferredId?: string): void {
    if (preferredId) {
      const preferred = addresses.find((a) => a._id === preferredId);
      if (preferred) {
        this.selectedAddress.set(preferred);
        return;
      }
    }

    const current = this.selectedAddress();
    if (current) {
      const stillPresent = addresses.find((a) => a._id === current._id);
      if (stillPresent) {
        this.selectedAddress.set(stillPresent);
        return;
      }
    }

    const next = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
    this.selectedAddress.set(next);
  }
}
