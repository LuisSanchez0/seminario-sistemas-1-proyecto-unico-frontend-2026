import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Address, CreateAddressPayload } from '../../../../interfaces/addresses.interface';

const FIELD_LABELS: Record<string, string> = {
  department:   'El departamento',
  municipality: 'El municipio',
  full_address: 'La dirección completa',
  phoneNumber:  'El número de teléfono',
};

@Component({
  selector: 'app-checkout-address-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './checkout-address-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutAddressDialogComponent {
  private readonly fb = inject(FormBuilder);

  isOpen     = input<boolean>(false);
  editAddress = input<Address | null>(null);

  /**
   * Emits the form payload on save.
   * The parent is responsible for calling the correct service method
   * (create or update) based on the dialog mode.
   */
  addressSaved = output<CreateAddressPayload>();

  closed = output<void>();

  // ── Mode helpers ───────────────────────────────────────────────────────────

  readonly isEditMode = computed(() => this.editAddress() !== null);

  readonly dialogTitle = computed(() =>
    this.isEditMode() ? 'Editar dirección de envío' : 'Agregar nueva dirección',
  );

  readonly saveBtnLabel = computed(() =>
    this.isEditMode() ? 'Actualizar dirección' : 'Guardar dirección',
  );

  // ── Form ───────────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    department:   ['', [Validators.required, Validators.minLength(2)]],
    municipality: ['', [Validators.required, Validators.minLength(2)]],
    street:       [''],
    full_address: ['', [Validators.required, Validators.minLength(5)]],
    phoneNumber:  ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()+]{7,20}$/)]],
    is_default:   [false],
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;

      const addr = this.editAddress();

      if (addr) {
        this.form.reset({
          department:   addr.department,
          municipality: addr.municipality,
          street:       addr.street ?? '',
          full_address: addr.full_address,
          phoneNumber:  addr.phoneNumber,
          is_default:   addr.is_default,
        });
      } else {
        this.form.reset({ is_default: false });
      }
    });
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) this.closed.emit();
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  isFieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  getFieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl?.errors || !ctrl.touched) return null;

    if (ctrl.errors['required'])   return `${FIELD_LABELS[name] ?? 'Este campo'} es obligatorio.`;
    if (ctrl.errors['minlength'])  return 'Debe tener al menos 2 caracteres.';
    if (ctrl.errors['pattern'])    return 'Ingresa un número de teléfono válido (ej. +502 4567-8901).';

    return 'Valor no válido.';
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: CreateAddressPayload = {
      department:   v.department!.trim(),
      municipality: v.municipality!.trim(),
      street:       v.street?.trim() || undefined,
      full_address: v.full_address!.trim(),
      phoneNumber:  v.phoneNumber!.trim(),
      is_default:   v.is_default ?? false,
    };

    this.addressSaved.emit(payload);
  }

  onClose(): void {
    this.closed.emit();
  }
}
