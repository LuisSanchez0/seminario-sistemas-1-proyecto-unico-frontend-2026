import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
} from '../../../../interfaces/addresses.interface';
import { CheckoutAddressCardComponent } from '../checkout-address-card/checkout-address-card.component';
import { CheckoutEmptyAddressStateComponent } from '../checkout-empty-address-state/checkout-empty-address-state.component';
import { CheckoutAddressDialogComponent } from '../checkout-address-dialog/checkout-address-dialog.component';
import { CheckoutConfirmDialogComponent } from '../checkout-confirm-dialog/checkout-confirm-dialog.component';

@Component({
  selector: 'app-checkout-address-selector',
  standalone: true,
  imports: [
    CheckoutAddressCardComponent,
    CheckoutEmptyAddressStateComponent,
    CheckoutAddressDialogComponent,
    CheckoutConfirmDialogComponent,
  ],
  templateUrl: './checkout-address-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutAddressSelectorComponent {
  addresses         = input.required<Address[]>();
  selectedAddressId = input<string | null>(null);
  isSaving          = input<boolean>(false);

  addressSelect = output<string>();
  addressRemove = output<string>();
  addressAdd    = output<CreateAddressPayload>();
  addressUpdate = output<{ id: string; payload: UpdateAddressPayload }>();

  // ── Add / Edit dialog ──────────────────────────────────────────────────────

  readonly dialogEditAddress = signal<Address | null>(null);
  readonly isDialogOpen      = signal<boolean>(false);

  openAddDialog(): void {
    this.dialogEditAddress.set(null);
    this.isDialogOpen.set(true);
  }

  openEditDialog(address: Address): void {
    this.dialogEditAddress.set(address);
    this.isDialogOpen.set(true);
  }

  onDialogClose(): void {
    this.isDialogOpen.set(false);
    this.dialogEditAddress.set(null);
  }

  onDialogSaved(payload: CreateAddressPayload): void {
    const editTarget = this.dialogEditAddress();

    this.isDialogOpen.set(false);
    this.dialogEditAddress.set(null);

    if (editTarget) {
      this.addressUpdate.emit({ id: editTarget._id, payload });
    } else {
      this.addressAdd.emit(payload);
    }
  }

  // ── Delete confirmation dialog ─────────────────────────────────────────────

  readonly pendingRemoveId = signal<string | null>(null);

  readonly pendingRemoveAddress = computed(() =>
    this.addresses().find((a) => a._id === this.pendingRemoveId()) ?? null,
  );

  readonly pendingRemoveDetail = computed(() => {
    const addr = this.pendingRemoveAddress();
    if (!addr) return null;
    return `${addr.department} · ${addr.municipality} — ${addr.full_address}`;
  });

  readonly isConfirmDialogOpen = computed(() => this.pendingRemoveId() !== null);

  onCardRemoveRequest(id: string): void {
    this.pendingRemoveId.set(id);
  }

  onConfirmDelete(): void {
    const id = this.pendingRemoveId();
    if (id) this.addressRemove.emit(id);
    this.pendingRemoveId.set(null);
  }

  onCancelDelete(): void {
    this.pendingRemoveId.set(null);
  }
}
