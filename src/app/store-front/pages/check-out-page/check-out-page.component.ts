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
import { catchError, map, of, switchMap, finalize, throwError } from 'rxjs';
import { StoreFront } from '../../services/store-front';
import { AddressesService } from '../../services/addresses.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
} from '../../interfaces/addresses.interface';
import { ProductService } from '../../../products/services/product.service';

import { CheckoutAddressSelectorComponent } from './components/checkout-address-selector/checkout-address-selector.component';
import { CheckoutPaymentCardComponent } from './components/checkout-payment-card/checkout-payment-card.component';
import { CheckoutOrderSummaryComponent } from './components/checkout-order-summary/checkout-order-summary.component';

// ── Local error discriminants ──────────────────────────────────────────────────

/** Error thrown when the sell was already created but one or more uploads failed. */
interface UploadFailureError {
  isSellCreated: true;
  msg: string;
  originalError?: unknown;
}

/** Error thrown when sell + uploads succeeded but the confirmation email failed. */
interface EmailFailureError {
  isEmailFailure: true;
  msg: string;
  originalError?: unknown;
}

/** Error thrown by the backend during sell creation. */
interface SellCreationError {
  error?: { msg?: string };
}

function isUploadFailureError(err: unknown): err is UploadFailureError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isSellCreated' in err &&
    (err as UploadFailureError).isSellCreated === true
  );
}

function isEmailFailureError(err: unknown): err is EmailFailureError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isEmailFailure' in err &&
    (err as EmailFailureError).isEmailFailure === true
  );
}

/** Returns true when the backend rejects the email because it was already sent. */
function isDuplicateEmailError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('ya fue enviado') || lower.includes('already sent');
}

/** Valid NIT: "CF" (case-insensitive) OR digits with optional hyphen and digit/K suffix. */
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
  readonly boletaFile = signal<File | null>(null);

  // ── Checkout state ─────────────────────────────────────────────────────────

  readonly isCreatingSell = signal(false);
  readonly checkoutError = signal<string | null>(null);
  readonly checkoutSuccess = signal(false);

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
      !this.isCreatingSell() &&
      !this.isSaving() &&
      this.cartStore.cartLineCount() > 0 &&
      this.selectedAddress() !== null &&
      this.boletaFile() !== null &&
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
    this.boletaFile.set(event?.file ?? null);
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
    const boletaFile = this.boletaFile();

    if (!address) {
      this.notifications.error('Dirección requerida', 'Selecciona una dirección de envío.');
      return;
    }

    if (cartItems.length === 0) {
      this.notifications.error('Carrito vacío', 'Agrega productos al carrito antes de continuar.');
      return;
    }

    if (!boletaFile) {
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

    if (this.isCreatingSell()) return;
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

    this.isCreatingSell.set(true);
    this.checkoutError.set(null);

    

    // this.sellService
    //   .createSell(payload)
    //   .pipe(
    //     switchMap((response) => {
    //       const sell = response.sell;
    //       const sellId = sell.id;

    //       return this.sellService.uploadSellBoleta(sellId, boletaFile).pipe(
    //         catchError((uploadErr) =>
    //           throwError((): UploadFailureError => ({
    //             isSellCreated: true,
    //             msg: 'La venta fue creada, pero hubo un error subiendo las imágenes.',
    //             originalError: uploadErr,
    //           })),
    //         ),
    //         switchMap(() =>
    //           this.sellService.sendConfirmationEmail(sellId).pipe(
    //             catchError((emailErr) => {
    //               const backendMsg: string = (emailErr as SellCreationError)?.error?.msg ?? '';
    //               // Duplicate email → treat as success; the sell already has its email.
    //               if (isDuplicateEmailError(backendMsg)) {
    //                 return of<SendConfirmationEmailResponse>({ ok: true, msg: backendMsg });
    //               }
    //               return throwError((): EmailFailureError => ({
    //                 isEmailFailure: true,
    //                 msg: 'La venta fue creada correctamente, pero no se pudo enviar el correo de confirmación.',
    //                 originalError: emailErr,
    //               }));
    //             }),
    //           ),
    //         ),
    //         map((): Sell => sell),
    //       );
    //     }),
    //     finalize(() => this.isCreatingSell.set(false)),
    //     takeUntilDestroyed(this.destroyRef),
    //   )
    //   .subscribe({
    //     next: (sell: Sell) => {
    //       this.productService.clearProductsCache();
    //       this.cartStore.clearCart();
    //       this.checkoutSuccess.set(true);
    //       const orderRef = sell.orderCode ?? sell.id;
    //       this.notifications.success(
    //         '¡Pedido registrado!',
    //         `Tu pedido fue creado exitosamente. Código de orden: ${orderRef}`,
    //       );
    //       this.router.navigate(['/my-orders', sell.id]);
    //     },
    //     error: (err: unknown) => {
    //       if (isEmailFailureError(err)) {
    //         // Sell + uploads are OK; only the email step failed.
    //         // Do NOT clear the cart — the sell exists and can be reprocessed.
    //         this.checkoutError.set(err.msg);
    //         this.notifications.error('Error al enviar correo', err.msg);
    //       } else if (isUploadFailureError(err)) {
    //         this.checkoutError.set(err.msg);
    //         this.notifications.error('Error al subir imágenes', err.msg);
    //       } else {
    //         const msg =
    //           (err as SellCreationError)?.error?.msg ??
    //           'Ocurrió un error al procesar tu pedido. Intenta nuevamente.';
    //         this.checkoutError.set(msg);
    //         this.notifications.error('Error al procesar pedido', msg);
    //       }
    //     },
    //   });
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
