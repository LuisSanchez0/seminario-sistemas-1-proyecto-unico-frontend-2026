import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  input,
  output,
} from '@angular/core';

/**
 * Generic confirmation dialog for destructive or important actions.
 *
 * Currently used for address deletion, but intentionally generic so it
 * can be reused for removing payment references, clearing cart lines, etc.
 *
 * Usage:
 * ```html
 * <app-checkout-confirm-dialog
 *   [isOpen]="isConfirmOpen()"
 *   title="¿Eliminar dirección?"
 *   message="Esta acción eliminará la dirección de tu lista de envío."
 *   [detail]="addressSummary()"
 *   variant="destructive"
 *   confirmLabel="Sí, eliminar"
 *   (confirmed)="onConfirmDelete()"
 *   (closed)="onCancelDelete()"
 * />
 * ```
 */
@Component({
  selector: 'app-checkout-confirm-dialog',
  standalone: true,
  imports: [],
  templateUrl: './checkout-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutConfirmDialogComponent {
  isOpen = input<boolean>(false);

  /** Dialog heading. */
  title = input<string>('¿Confirmar acción?');

  /** Short explanatory sentence shown below the title. */
  message = input<string>('');

  /**
   * Optional one-line detail block — shown in a subtle highlighted box.
   * Use it to display the name/summary of the item being acted upon
   * so the user is sure of what they are confirming.
   */
  detail = input<string | null>(null);

  /** Label for the primary action button. */
  confirmLabel = input<string>('Confirmar');

  /** Label for the secondary cancel button. */
  cancelLabel = input<string>('Cancelar');

  /**
   * Controls the visual style of the confirm button.
   *   'destructive' → red (use for deletions and irreversible actions)
   *   'default'     → indigo (use for neutral confirmations)
   */
  variant = input<'default' | 'destructive'>('default');

  /** Emits when the user clicks the confirm button. */
  confirmed = output<void>();

  /** Emits when the user cancels (button, backdrop click, or Escape). */
  closed = output<void>();

  // ── Derived styles ────────────────────────────────────────────────────────

  readonly confirmButtonClasses = computed(() =>
    this.variant() === 'destructive'
      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
  );

  readonly iconContainerClasses = computed(() =>
    this.variant() === 'destructive'
      ? 'bg-red-100'
      : 'bg-indigo-100'
  );

  readonly iconClasses = computed(() =>
    this.variant() === 'destructive'
      ? 'text-red-600'
      : 'text-indigo-600'
  );

  // ── Keyboard handler ──────────────────────────────────────────────────────

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }
}
