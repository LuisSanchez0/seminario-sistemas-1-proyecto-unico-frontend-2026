import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
// import {
//   BuyerUser,
//   ORDER_STATE_LABELS,
//   OrderState,
//   PAYMENT_STATE_LABELS,
//   PaymentState,
//   Sell,
//   ShippingAddressObject,
// } from '../../../sell/interfaces/sell.interface';

@Component({
  selector: 'app-sell-admin-card',
  standalone: true,
  templateUrl: './sell-admin-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellAdminCardComponent {
  // readonly sell = input.required<Sell>();
  // readonly manage = output<string>();

  // readonly buyerName = computed<string>(() => {
  //   const user = this.sell().buyerUser;
  //   if (!user || typeof user === 'string') return 'Cliente no disponible';
  //   const u = user as BuyerUser;
  //   return u.fullName ?? u.name ?? u.email ?? 'Cliente no disponible';
  // });

  // readonly shippingAddressSummary = computed<string>(() => {
  //   const addr = this.sell().shippingAddress;
  //   if (!addr) return 'Dirección no disponible';
  //   if (typeof addr === 'string') return addr || 'Dirección no disponible';
  //   const obj = addr as ShippingAddressObject;
  //   const line1 = [obj.municipality, obj.department].filter(Boolean).join(', ');
  //   return line1 || obj.full_address || 'Dirección no disponible';
  // });

  // readonly shippingPhone = computed<string | null>(() => {
  //   const addr = this.sell().shippingAddress;
  //   if (!addr || typeof addr === 'string') return null;
  //   return (addr as ShippingAddressObject).phoneNumber ?? null;
  // });

  // readonly shippingFullAddress = computed<string | null>(() => {
  //   const addr = this.sell().shippingAddress;
  //   if (!addr || typeof addr === 'string') return null;
  //   return (addr as ShippingAddressObject).full_address ?? null;
  // });

  // readonly orderStateLabel = computed<string>(() => {
  //   const state = this.sell().orderState;
  //   if (!state) return '—';
  //   return ORDER_STATE_LABELS[state as OrderState] ?? state;
  // });

  // readonly paymentStateLabel = computed<string>(() => {
  //   const state = this.sell().paymentState;
  //   if (!state) return '—';
  //   return PAYMENT_STATE_LABELS[state as PaymentState] ?? state;
  // });

  // readonly orderStateClass = computed<string>(() => {
  //   switch (this.sell().orderState) {
  //     case 'COMPLETADO':            return 'bg-emerald-100 text-emerald-700 ring-emerald-200/60';
  //     case 'CANCELADO':             return 'bg-rose-100 text-rose-700 ring-rose-200/60';
  //     case 'REEMBOLSADO':           return 'bg-slate-100 text-slate-600 ring-slate-200/60';
  //     case 'EN_PROCESO':            return 'bg-blue-100 text-blue-700 ring-blue-200/60';
  //     case 'ENVIADO':               return 'bg-sky-100 text-sky-700 ring-sky-200/60';
  //     case 'PARCIALMENTE_ENVIADO':  return 'bg-violet-100 text-violet-700 ring-violet-200/60';
  //     default:                      return 'bg-amber-100 text-amber-700 ring-amber-200/60';
  //   }
  // });

  // readonly paymentStateClass = computed<string>(() => {
  //   switch (this.sell().paymentState) {
  //     case 'PAGO_REALIZADO': return 'bg-emerald-100 text-emerald-700 ring-emerald-200/60';
  //     case 'CANCELADO':      return 'bg-rose-100 text-rose-700 ring-rose-200/60';
  //     case 'REEMBOLSADO':    return 'bg-slate-100 text-slate-600 ring-slate-200/60';
  //     default:               return 'bg-amber-100 text-amber-700 ring-amber-200/60';
  //   }
  // });

  // readonly displayDate = computed<string | null>(() => {
  //   return this.sell().createdAt ?? this.sell().date ?? null;
  // });

  // onManage(): void {
  //   this.manage.emit(this.sell().id);
  // }
}
