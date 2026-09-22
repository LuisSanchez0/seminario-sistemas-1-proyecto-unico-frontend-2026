import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';

const ACCOUNT_NUMBER = '967954744';

@Component({
  selector: 'app-checkout-payment-card',
  standalone: true,
  imports: [],
  templateUrl: './checkout-payment-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPaymentCardComponent {
  /**
   * Base64 receipt image managed by the parent container.
   * Null when no image has been uploaded.
   */
  receiptImage = input<string | null>(null);

  /** Emits the selected file (with its base64 preview) when a new image is chosen, or null to clear. */
  receiptChange = output<{ base64: string; file: File } | null>();

  readonly copied = signal(false);
  readonly accountNumber = ACCOUNT_NUMBER;

  copyAccountNumber(): void {
    navigator.clipboard
      .writeText(this.accountNumber)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      })
      .catch(() => {
        // Clipboard API may be unavailable (non-HTTPS, old browser)
      });
  }

  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const base64 = await this._fileToBase64(file);
    this.receiptChange.emit({ base64, file });

    // Reset the input so the same file can be re-selected after removal
    input.value = '';
  }

  removeReceipt(): void {
    this.receiptChange.emit(null);
  }

  private _fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
