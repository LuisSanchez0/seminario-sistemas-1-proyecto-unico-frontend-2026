import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { CurrencyPipe, DatePipe } from '@angular/common';
//import { SellService } from '../../../sell/services/sell.service';
import { SellFinishedService } from '../../services/sell-finished.service';
//import { AddressesService } from '../../../store-front/services/addresses.service';
import { NotificationService } from '../../../shared/services/notification.service';
// import {
//   AdminUpdateProductShippingItem,
//   BuyerUser,
//   buildShippingTimeline,
//   OrderState,
//   ORDER_STATE_LABELS,
//   PaymentState,
//   PAYMENT_STATE_LABELS,
//   Sell,
//   SellProduct,
//   SHIPPING_STATUS_LABELS,
//   SHIPPING_STATUS_STEPS,
//   ShippingAddressObject,
//   ShippingStatus,
//   ShippingTimelineStep,
// } from '../../../sell/interfaces/sell.interface';
import { Product } from '../../../products/interfaces/product.interface';

// function isAddressObject(
//   value: ShippingAddressObject | string,
// ): value is ShippingAddressObject {
//   return typeof value === 'object' && value !== null && 'department' in value;
// }

export type FinalizeStep =
  | 'idle'
  | 'completing-order'
  | 'creating'
  | 'uploading-invoice'
  | 'uploading-guide'
  | 'sending-email'
  | 'done';

interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
}

@Component({
  selector: 'app-sell-admin-page',
  standalone: true,
  templateUrl: './sell-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellAdminPageComponent {
  // private readonly route = inject(ActivatedRoute);
  // private readonly router = inject(Router);
  // private readonly sellService = inject(SellService);
  // private readonly sellFinishedService = inject(SellFinishedService);
  // private readonly notifications = inject(NotificationService);
  // private readonly addressesService = inject(AddressesService);

  // readonly sellId = this.route.snapshot.paramMap.get('id') ?? '';

  // // ── Shipping address resolution ───────────────────────────────────────────────
  // readonly shippingAddress        = signal<ShippingAddressObject | null>(null);
  // readonly shippingAddressLoading = signal(false);
  // readonly shippingAddressError   = signal<string | null>(null);

  // constructor() {
  //   effect(() => {
  //     const s = this.sell();
  //     if (s) this.resolveShippingAddress(s);
  //   });
  // }

  // private resolveShippingAddress(sell: Sell): void {
  //   const addr = sell.shippingAddress;

  //   if (!addr) {
  //     this.shippingAddress.set(null);
  //     return;
  //   }

  //   if (isAddressObject(addr)) {
  //     this.shippingAddress.set(addr);
  //     return;
  //   }

  //   if (this.shippingAddressLoading()) return;

  //   this.shippingAddressLoading.set(true);
  //   this.shippingAddressError.set(null);

  //   this.addressesService.getAddressById(addr).subscribe({
  //     next: (address) => {
  //       this.shippingAddressLoading.set(false);
  //       this.shippingAddress.set(address);
  //     },
  //     error: () => {
  //       this.shippingAddressLoading.set(false);
  //       // The address endpoint filters by owner; admin may lack permission.
  //       this.shippingAddressError.set('No pudimos cargar la dirección de envío.');
  //     },
  //   });
  // }

  // // ── Sell data ────────────────────────────────────────────────────────────────
  // readonly sellResource = rxResource({
  //   stream: (): Observable<Sell | null> =>
  //     this.sellService.getSellByIdAdmin(this.sellId).pipe(map((r) => r.sell)),
  //   defaultValue: null as Sell | null,
  // });

  // // ── Loading states ────────────────────────────────────────────────────────────
  // readonly updatingPayment    = signal(false);
  // readonly updatingOrderState = signal(false);
  // /** Set of per-line keys that are currently being updated. */
  // readonly updatingLineIds    = signal<Set<string>>(new Set());
  // readonly bulkUpdating       = signal(false);
  // readonly downloadingLogoId  = signal<string | null>(null);

  // // ── Boleta modal state ────────────────────────────────────────────────────────
  // readonly boletaModalOpen = signal(false);

  // openBoletaModal(): void  { this.boletaModalOpen.set(true);  }
  // closeBoletaModal(): void { this.boletaModalOpen.set(false); }

  // // ── Finalize modal state ──────────────────────────────────────────────────────
  // readonly finalizeModalOpen = signal(false);
  // readonly finalizeStep = signal<FinalizeStep>('idle');
  // readonly finalizeStepError = signal<string | null>(null);
  // readonly invoicePdfFile = signal<File | null>(null);
  // readonly shippingGuideFile = signal<File | null>(null);

  // // ── Confirmation dialog ───────────────────────────────────────────────────────
  // readonly confirmDialog = signal<ConfirmDialogState>({
  //   visible: false,
  //   title: '',
  //   message: '',
  //   confirmLabel: 'Confirmar',
  //   confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white',
  //   onConfirm: () => {},
  // });

  // // ── Computed ──────────────────────────────────────────────────────────────────
  // readonly sell = computed<Sell | null>(() => this.sellResource.value() ?? null);

  // readonly buyerName = computed<string>(() => {
  //   const u = this.sell()?.buyerUser;
  //   if (!u || typeof u === 'string') return 'Cliente no disponible';
  //   const b = u as BuyerUser;
  //   return b.fullName ?? b.name ?? b.email ?? 'Cliente no disponible';
  // });

  // readonly buyerEmail = computed<string>(() => {
  //   const u = this.sell()?.buyerUser;
  //   if (!u || typeof u === 'string') return '—';
  //   return (u as BuyerUser).email ?? '—';
  // });

  // readonly isPaymentDone = computed(
  //   () => this.sell()?.paymentState === 'PAGO_REALIZADO',
  // );

  // readonly isCancelledOrRefunded = computed(() => {
  //   const os = this.sell()?.orderState;
  //   return os === 'CANCELADO' || os === 'REEMBOLSADO';
  // });

  // readonly controlsDisabled = computed(
  //   () => !this.isPaymentDone() || this.isCancelledOrRefunded(),
  // );

  // readonly allProductsShipped = computed(() => {
  //   const products = this.sell()?.products ?? [];
  //   return (
  //     products.length > 0 &&
  //     products.every((p) => p.shippingStatus === 'SHIPPED')
  //   );
  // });

  // readonly canFinalize = computed(() => {
  //   const sell = this.sell();
  //   if (!sell) return false;
  //   const blockedStates: string[] = ['COMPLETADO', 'CANCELADO', 'REEMBOLSADO'];
  //   if (blockedStates.includes(sell.orderState ?? '')) return false;
  //   if (!this.isPaymentDone()) return false;
  //   return (
  //     sell.products.length > 0 &&
  //     sell.products.every((p) => p.shippingStatus === 'SHIPPED')
  //   );
  // });

  // readonly hasNit = computed(() => !!this.sell()?.nit);

  // readonly finalizeCanSubmit = computed(() => {
  //   if (this.finalizeStep() !== 'idle') return false;
  //   if (!this.shippingGuideFile()) return false;
  //   if (this.hasNit() && !this.invoicePdfFile()) return false;
  //   return true;
  // });

  // // ── Constants ─────────────────────────────────────────────────────────────────
  // /** All steps — used for timeline display only. */
  // readonly statusSteps = SHIPPING_STATUS_STEPS;

  // /**
  //  * Steps available for manual admin selection.
  //  * DELIVERED is intentionally excluded: it is reached only via "Finalizar venta",
  //  * which marks all products DELIVERED and the order COMPLETADO atomically.
  //  */
  // readonly manualStatusSteps: ShippingStatus[] = SHIPPING_STATUS_STEPS.filter(
  //   (s) => s !== 'DELIVERED',
  // );

  // // ── Label / badge helpers ─────────────────────────────────────────────────────
  // getStatusLabel(status: ShippingStatus): string {
  //   return SHIPPING_STATUS_LABELS[status];
  // }

  // getPaymentLabel(state: PaymentState | undefined): string {
  //   if (!state) return '—';
  //   return PAYMENT_STATE_LABELS[state];
  // }

  // getOrderLabel(state: OrderState | undefined): string {
  //   if (!state) return '—';
  //   return ORDER_STATE_LABELS[state] ?? state;
  // }

  // getLogoLocationLabel(loc: string | undefined): string {
  //   const labels: Record<string, string> = {
  //     LEFT_CHEST:     'Pecho izquierdo',
  //     RIGHT_CHEST:    'Pecho derecho',
  //     RIGHT_SHOULDER: 'Hombro derecho',
  //     SLEEVES:        'Mangas',
  //     UPPER_BACK:     'Espalda superior',
  //     CENTER_CAP:     'Centro de gorra',
  //     NO_LOGO:        'Sin logo',
  //   };
  //   return loc ? (labels[loc] ?? loc) : '—';
  // }

  // getPaymentBadgeClass(state: PaymentState | undefined): string {
  //   switch (state) {
  //     case 'PAGO_REALIZADO': return 'bg-emerald-100 text-emerald-700 ring-emerald-200/60';
  //     case 'CANCELADO':      return 'bg-rose-100 text-rose-700 ring-rose-200/60';
  //     case 'REEMBOLSADO':    return 'bg-slate-100 text-slate-600 ring-slate-200/60';
  //     default:               return 'bg-amber-100 text-amber-700 ring-amber-200/60';
  //   }
  // }

  // getOrderBadgeClass(state: OrderState | undefined): string {
  //   switch (state) {
  //     case 'COMPLETADO':           return 'bg-emerald-100 text-emerald-700 ring-emerald-200/60';
  //     case 'CANCELADO':            return 'bg-rose-100 text-rose-700 ring-rose-200/60';
  //     case 'REEMBOLSADO':          return 'bg-slate-100 text-slate-600 ring-slate-200/60';
  //     case 'EN_PROCESO':           return 'bg-blue-100 text-blue-700 ring-blue-200/60';
  //     case 'ENVIADO':              return 'bg-sky-100 text-sky-700 ring-sky-200/60';
  //     case 'PARCIALMENTE_ENVIADO': return 'bg-violet-100 text-violet-700 ring-violet-200/60';
  //     default:                     return 'bg-amber-100 text-amber-700 ring-amber-200/60';
  //   }
  // }

  // getShippingBadgeClass(status: ShippingStatus): string {
  //   switch (status) {
  //     case 'DELIVERED':  return 'bg-green-100 text-green-700 ring-green-200/60';
  //     case 'SHIPPED':    return 'bg-blue-100 text-blue-700 ring-blue-200/60';
  //     case 'PROCESSING': return 'bg-amber-100 text-amber-700 ring-amber-200/60';
  //     default:           return 'bg-gray-100 text-gray-600 ring-gray-200/60';
  //   }
  // }

  // // ── Product helpers ────────────────────────────────────────────────────────────
  // getProductTitle(product: string | Product): string {
  //   return typeof product === 'string' ? product : product.title;
  // }

  // getProductImage(product: string | Product): string | null {
  //   if (typeof product === 'string') return null;
  //   return product.images?.[0]?.url ?? null;
  // }

  // /**
  //  * Returns the product-line document ID used for logo download.
  //  * The logo download endpoint uses the subdocument _id, NOT the product id.
  //  */
  // getLineItemId(p: SellProduct): string {
  //   return p.id ?? p._id ?? '';
  // }

  // /**
  //  * Extracts the product catalog ID from a sell line.
  //  * Used for shipping-status updates (backend matches by productId + size).
  //  * Handles both populated objects and plain ObjectId strings.
  //  */
  // getProductId(p: SellProduct): string {
  //   const prod = p.product;
  //   if (typeof prod === 'string') return prod;
  //   return (prod as any)._id ?? (prod as any).id ?? '';
  // }

  // /**
  //  * Stable key for per-line loading state.
  //  * Falls back to "productId-size-index" when the line has no _id.
  //  */
  // getLineKey(p: SellProduct, index: number): string {
  //   return p.id ?? p._id ?? `${this.getProductId(p)}-${p.size}-${index}`;
  // }

  // /** Used by @for track to avoid stale DOM reuse between product rows. */
  // getLineTrackId(p: SellProduct, index: number): string {
  //   return this.getLineKey(p, index);
  // }

  // private setLineUpdating(key: string, active: boolean): void {
  //   this.updatingLineIds.update((set) => {
  //     const next = new Set(set);
  //     active ? next.add(key) : next.delete(key);
  //     return next;
  //   });
  // }

  // isUpdatingLine(p: SellProduct, index: number): boolean {
  //   return this.updatingLineIds().has(this.getLineKey(p, index));
  // }

  // getTimeline(p: SellProduct): ShippingTimelineStep[] {
  //   return buildShippingTimeline(p);
  // }

  // hasLogo(p: SellProduct): boolean {
  //   return !!(p.imgLogo?.key || p.imgLogo?.url);
  // }

  // trackByIndex(index: number): number {
  //   return index;
  // }

  // // ── Payment state update ──────────────────────────────────────────────────────
  // onUpdatePaymentState(newState: PaymentState): void {
  //   const sell = this.sell();
  //   if (!sell || sell.paymentState === newState) return;

  //   const isDanger = newState === 'CANCELADO' || newState === 'REEMBOLSADO';

  //   if (isDanger) {
  //     this.openConfirm({
  //       title:
  //         newState === 'CANCELADO'
  //           ? 'Cancelar pago'
  //           : 'Reembolsar pago',
  //       message:
  //         newState === 'CANCELADO'
  //           ? '¿Seguro que deseas marcar el pago como CANCELADO? Esta acción afectará el estado del pedido.'
  //           : '¿Seguro que deseas marcar el pago como REEMBOLSADO? Confirma que el reembolso ya fue procesado.',
  //       confirmLabel:
  //         newState === 'CANCELADO' ? 'Sí, cancelar pago' : 'Sí, reembolsar',
  //       confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white',
  //       onConfirm: () => this.executePaymentUpdate(newState),
  //     });
  //   } else {
  //     this.executePaymentUpdate(newState);
  //   }
  // }

  // private executePaymentUpdate(paymentState: PaymentState): void {
  //   this.updatingPayment.set(true);
  //   this.sellService.updateAdminPaymentState(this.sellId, paymentState).subscribe({
  //     next: () => {
  //       this.updatingPayment.set(false);
  //       this.sellResource.reload();
  //       this.notifications.success(
  //         'Estado de pago actualizado',
  //         `Pago marcado como "${this.getPaymentLabel(paymentState)}".`,
  //       );
  //     },
  //     error: (err: unknown) => {
  //       this.updatingPayment.set(false);
  //       this.notifications.error('Error al actualizar pago', this.extractMsg(err));
  //     },
  //   });
  // }

  // // ── Order state: cancel / refund ──────────────────────────────────────────────
  // onCancelOrder(): void {
  //   this.openConfirm({
  //     title: 'Cancelar venta',
  //     message:
  //       '¿Seguro que deseas cancelar esta venta? El estado del pedido cambiará a CANCELADO.',
  //     confirmLabel: 'Sí, cancelar venta',
  //     confirmClass: 'bg-rose-600 hover:bg-rose-700 text-white',
  //     onConfirm: () => this.executeOrderStateUpdate('CANCELADO'),
  //   });
  // }

  // onRefundOrder(): void {
  //   this.openConfirm({
  //     title: 'Marcar como reembolsada',
  //     message:
  //       '¿Seguro que deseas marcar esta venta como REEMBOLSADA? Confirma que el reembolso ya fue procesado externamente.',
  //     confirmLabel: 'Sí, marcar como reembolsada',
  //     confirmClass: 'bg-slate-700 hover:bg-slate-800 text-white',
  //     onConfirm: () => this.executeOrderStateUpdate('REEMBOLSADO'),
  //   });
  // }

  // private executeOrderStateUpdate(orderState: 'CANCELADO' | 'REEMBOLSADO'): void {
  //   this.updatingOrderState.set(true);
  //   this.sellService.updateAdminOrderState(this.sellId, orderState).subscribe({
  //     next: () => {
  //       this.updatingOrderState.set(false);
  //       this.sellResource.reload();
  //       this.notifications.success(
  //         'Estado del pedido actualizado',
  //         `Pedido marcado como "${this.getOrderLabel(orderState)}".`,
  //       );
  //     },
  //     error: (err: unknown) => {
  //       this.updatingOrderState.set(false);
  //       this.notifications.error('Error al actualizar pedido', this.extractMsg(err));
  //     },
  //   });
  // }

  // // ── Individual product shipping status ────────────────────────────────────────
  // /**
  //  * @param index  Position of this line in currentSell.products (from @for $index).
  //  *               Used to build a stable per-line loading key.
  //  */
  // onStatusChange(productLine: SellProduct, newStatus: ShippingStatus, index: number): void {
  //   // The shipping-status endpoint matches by productId + size, NOT by lineItemId.
  //   const productId = this.getProductId(productLine);

  //   if (!productId) {
  //     this.notifications.error('Error', 'No se pudo identificar el producto de esta línea.');
  //     return;
  //   }

  //   const key = this.getLineKey(productLine, index);
  //   this.setLineUpdating(key, true);

  //   this.sellService
  //     .updateAdminProductShippingStatus(this.sellId, {
  //       productId,
  //       size: productLine.size,
  //       shippingStatus: newStatus,
  //     })
  //     .subscribe({
  //       next: (res) => {
  //         this.setLineUpdating(key, false);
  //         this.sellResource.reload();
  //         this.notifications.success(
  //           'Estado actualizado',
  //           `Estado cambiado a "${this.getStatusLabel(newStatus)}".`,
  //         );
  //       },
  //       error: (err: unknown) => {
  //         this.setLineUpdating(key, false);
  //         const msg = this.extractMsg(err);
  //         if (msg.toLowerCase().includes('ya se encuentra en ese estado')) {
  //           this.notifications.info('Sin cambios', 'El artículo ya se encuentra en ese estado.');
  //           return;
  //         }
  //         this.notifications.error('Error al actualizar', msg);
  //       },
  //     });
  // }

  // // ── Bulk product status ────────────────────────────────────────────────────────
  // onBulkStatusChange(targetStatus: ShippingStatus): void {
  //   const sell = this.sell();
  //   if (!sell?.products?.length) return;

  //   const label = this.getStatusLabel(targetStatus);

  //   this.openConfirm({
  //     title: `Actualizar todos: "${label}"`,
  //     message: `¿Deseas marcar todos los artículos de este pedido como "${label}"? Este cambio afectará a todos los productos a la vez.`,
  //     confirmLabel: 'Sí, actualizar todos',
  //     confirmClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  //     onConfirm: () => this.executeBulkUpdate(sell.products, targetStatus),
  //   });
  // }

  // private executeBulkUpdate(
  //   products: SellProduct[],
  //   targetStatus: ShippingStatus,
  // ): void {
  //   const items: AdminUpdateProductShippingItem[] = products.map((p) => ({
  //     productId:      this.getProductId(p),
  //     size:           p.size,
  //     shippingStatus: targetStatus,
  //   }));

  //   const invalid = items.some((item) => !item.productId);
  //   if (invalid) {
  //     this.notifications.error(
  //       'Error de identificadores',
  //       'No se pudo identificar uno o más productos. Recarga la página e intenta de nuevo.',
  //     );
  //     return;
  //   }

  //   this.bulkUpdating.set(true);
  //   this.sellService
  //     .updateAdminProductShippingStatus(this.sellId, { items })
  //     .subscribe({
  //       next: () => {
  //         this.bulkUpdating.set(false);
  //         this.sellResource.reload();
  //         this.notifications.success(
  //           'Actualización masiva completada',
  //           `Todos los artículos marcados como "${this.getStatusLabel(targetStatus)}".`,
  //         );
  //       },
  //       error: (err: unknown) => {
  //         this.bulkUpdating.set(false);
  //         this.notifications.error('Error en actualización masiva', this.extractMsg(err));
  //       },
  //     });
  // }

  // // ── Logo download ──────────────────────────────────────────────────────────────
  // onDownloadLogo(productLine: SellProduct): void {
  //   const lineItemId = this.getLineItemId(productLine);
  //   if (!lineItemId) return;

  //   this.downloadingLogoId.set(lineItemId);
  //   this.sellService
  //     .downloadProductLogoWithHeaders(this.sellId, lineItemId)
  //     .subscribe({
  //       next: (response) => {
  //         this.downloadingLogoId.set(null);
  //         const blob = response.body!;
  //         let filename = 'logo-producto.png';

  //         const disposition = response.headers.get('Content-Disposition');
  //         if (disposition) {
  //           const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  //           if (match?.[1]) {
  //             filename = match[1].replace(/['"]/g, '');
  //           }
  //         }

  //         const url = URL.createObjectURL(blob);
  //         const a   = document.createElement('a');
  //         a.href     = url;
  //         a.download = filename;
  //         a.click();
  //         URL.revokeObjectURL(url);
  //         this.notifications.success('Logo descargado', filename);
  //       },
  //       error: (err: unknown) => {
  //         this.downloadingLogoId.set(null);
  //         this.notifications.error('Error al descargar logo', this.extractMsg(err));
  //       },
  //     });
  // }

  // // ── Finalize sell modal ────────────────────────────────────────────────────────
  // openFinalizeModal(): void {
  //   this.finalizeStep.set('idle');
  //   this.finalizeStepError.set(null);
  //   this.invoicePdfFile.set(null);
  //   this.shippingGuideFile.set(null);
  //   this.finalizeModalOpen.set(true);
  // }

  // closeFinalizeModal(): void {
  //   if (this.finalizeStep() !== 'idle') return;
  //   this.finalizeModalOpen.set(false);
  // }

  // onInvoicePdfChange(event: Event): void {
  //   const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  //   this.invoicePdfFile.set(file);
  // }

  // onShippingGuideChange(event: Event): void {
  //   const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  //   this.shippingGuideFile.set(file);
  // }

  // onSubmitFinalize(): void {
  //   if (!this.finalizeCanSubmit()) return;

  //   this.finalizeStepError.set(null);

  //   // Step 1: finalize atomically on the backend:
  //   //   PATCH /api/sells/admin/:id/finalize
  //   //   → orderState = COMPLETADO, all products shippingStatus = DELIVERED
  //   this.finalizeStep.set('completing-order');
  //   this.sellService.finalizeSellAdmin(this.sellId).subscribe({
  //     next: () => {
  //       // Reload the sell resource immediately so the UI reflects
  //       // COMPLETADO + DELIVERED while documentation upload proceeds.
  //       this.sellResource.reload();
  //       this.startDocumentationFlow();
  //     },
  //     error: (err: unknown) => {
  //       const msg = this.extractMsg(err);
  //       this.finalizeStepError.set(
  //         msg || 'No se pudo finalizar la venta. Intenta de nuevo.',
  //       );
  //       this.finalizeStep.set('idle');
  //     },
  //   });
  // }

  // private startDocumentationFlow(): void {
  //   // Step 2: create the SellFinished documentation record.
  //   this.finalizeStep.set('creating');

  //   this.sellFinishedService
  //     .createSellFinished(this.sellId)
  //     .subscribe({
  //       next: (res) => this.runUploadsAndEmail(res.sellFinished.id),
  //       error: (err: unknown) => {
  //         const msg = this.extractMsg(err);
  //         const isExists =
  //           msg.toLowerCase().includes('already exists') ||
  //           msg.toLowerCase().includes('ya existe');

  //         if (isExists) {
  //           this.sellFinishedService.getSellFinishedBySellId(this.sellId).subscribe({
  //             next: (res) => this.runUploadsAndEmail(res.sellFinished.id),
  //             error: (err2: unknown) => {
  //               this.finalizeStepError.set(this.extractMsg(err2));
  //               this.finalizeStep.set('idle');
  //             },
  //           });
  //         } else {
  //           this.finalizeStepError.set(msg);
  //           this.finalizeStep.set('idle');
  //         }
  //       },
  //     });
  // }

  // private runUploadsAndEmail(sellFinishedId: string): void {
  //   const invoicePdf    = this.invoicePdfFile();
  //   const shippingGuide = this.shippingGuideFile()!;

  //   // Validate MIME types before touching the network
  //   if (this.hasNit() && invoicePdf) {
  //     if (invoicePdf.type !== 'application/pdf') {
  //       this.finalizeStepError.set('Factura PDF: el archivo debe ser un PDF (application/pdf).');
  //       this.finalizeStep.set('idle');
  //       return;
  //     }
  //   }

  //   const allowedGuideTypes = ['image/jpeg', 'image/png', 'image/webp'];
  //   if (!allowedGuideTypes.includes(shippingGuide.type)) {
  //     this.finalizeStepError.set('Guía de envío: el archivo debe ser una imagen JPG, PNG o WebP.');
  //     this.finalizeStep.set('idle');
  //     return;
  //   }

  //   const uploadGuideAndEmail = () => {
  //     this.finalizeStep.set('uploading-guide');
  //     this.sellFinishedService.uploadShippingGuide(sellFinishedId, shippingGuide).subscribe({
  //       next: () => this.sendEmail(sellFinishedId),
  //       error: (err: unknown) => {
  //         this.finalizeStepError.set(`Guía de envío: ${this.extractMsg(err)}`);
  //         this.finalizeStep.set('idle');
  //       },
  //     });
  //   };

  //   if (this.hasNit() && invoicePdf) {
  //     this.finalizeStep.set('uploading-invoice');
  //     this.sellFinishedService.uploadInvoicePdf(sellFinishedId, invoicePdf).subscribe({
  //       next: () => uploadGuideAndEmail(),
  //       error: (err: unknown) => {
  //         this.finalizeStepError.set(`Factura PDF: ${this.extractMsg(err)}`);
  //         this.finalizeStep.set('idle');
  //       },
  //     });
  //   } else {
  //     uploadGuideAndEmail();
  //   }
  // }

  // private sendEmail(sellFinishedId: string): void {
  //   this.finalizeStep.set('sending-email');
  //   this.sellFinishedService.sendEmail(sellFinishedId).subscribe({
  //     next: () => {
  //       this.finalizeStep.set('done');
  //       // Reload sell detail so COMPLETADO + DELIVERED states are visible.
  //       this.sellResource.reload();
  //       this.notifications.success(
  //         'Venta finalizada',
  //         'Documentación enviada correctamente al cliente.',
  //         5000,
  //       );
  //       setTimeout(() => {
  //         this.router.navigate(['/admin/sells']);
  //       }, 2000);
  //     },
  //     error: (err: unknown) => {
  //       this.finalizeStepError.set(`Envío de email: ${this.extractMsg(err)}`);
  //       this.finalizeStep.set('idle');
  //     },
  //   });
  // }

  // // ── Confirmation dialog ────────────────────────────────────────────────────────
  // private openConfirm(opts: Omit<ConfirmDialogState, 'visible'>): void {
  //   this.confirmDialog.set({ visible: true, ...opts });
  // }

  // closeConfirm(): void {
  //   this.confirmDialog.update((s) => ({ ...s, visible: false }));
  // }

  // onConfirmAction(): void {
  //   const action = this.confirmDialog().onConfirm;
  //   this.closeConfirm();
  //   action();
  // }

  // // ── Finalize step helpers ─────────────────────────────────────────────────────
  // /**
  //  * Returns true if `candidate` step is already past in the finalize pipeline,
  //  * meaning the current step comes after it.
  //  */
  // isStepDone(currentStep: FinalizeStep, candidate: string): boolean {
  //   const order: FinalizeStep[] = [
  //     'idle',
  //     'completing-order',
  //     'creating',
  //     'uploading-invoice',
  //     'uploading-guide',
  //     'sending-email',
  //     'done',
  //   ];
  //   const currentIdx  = order.indexOf(currentStep);
  //   const candidateIdx = order.indexOf(candidate as FinalizeStep);
  //   return candidateIdx < currentIdx;
  // }

  // // ── Utility ───────────────────────────────────────────────────────────────────
  // private extractMsg(err: unknown): string {
  //   const e = err as {
  //     error?: { msg?: string; message?: string; error?: string } | string;
  //     message?: string;
  //     statusText?: string;
  //   };

  //   // When Express serves no matching route and Angular's dev server (or a CDN)
  //   // returns index.html, HttpClient fails to parse it as JSON and puts the
  //   // SyntaxError message in e.error.message / e.message.
  //   const rawMsg =
  //     (typeof e?.error === 'object' ? e.error?.message : undefined) ??
  //     e?.message ?? '';
  //   if (
  //     typeof rawMsg === 'string' &&
  //     (rawMsg.startsWith('Unexpected token') || rawMsg.includes('<!DOCTYPE'))
  //   ) {
  //     return 'El servidor respondió con HTML en lugar de JSON. Revisa que la URL del endpoint sea correcta.';
  //   }

  //   if (typeof e?.error === 'object') {
  //     const msg = e.error?.msg ?? e.error?.message ?? e.error?.error;
  //     if (msg) return msg;
  //   }

  //   return e?.message ?? e?.statusText ?? 'Ocurrió un error inesperado';
  // }
}
