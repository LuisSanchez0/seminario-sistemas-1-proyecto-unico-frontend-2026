import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { PaymentAccountComponent } from '../../../../../orders/components/payment-account/payment-account.component';

export const RECEIPT_MAX_BYTES = 8 * 1024 * 1024;
export const RECEIPT_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];

/** Devuelve el motivo por el que un archivo no sirve como comprobante, o `null` si es válido. */
export function receiptFileError(file: File): string | null {
  if (!RECEIPT_TYPES.includes(file.type)) return 'El comprobante debe ser una imagen PNG, JPG o WebP.';
  if (file.size > RECEIPT_MAX_BYTES) return 'El comprobante no puede pesar más de 8 MB.';
  return null;
}

@Component({
  selector: 'app-checkout-payment-card',
  standalone: true,
  imports: [PaymentAccountComponent],
  templateUrl: './checkout-payment-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPaymentCardComponent {
  /** Vista previa en base64 administrada por el contenedor; `null` si no hay imagen. */
  receiptImage = input<string | null>(null);

  /** Emite el archivo elegido (con su vista previa) o `null` para quitarlo. */
  receiptChange = output<{ base64: string; file: File } | null>();

  readonly fileError = signal<string | null>(null);

  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const problem = receiptFileError(file);
    input.value = '';
    this.fileError.set(problem);
    if (problem) return;

    try {
      this.receiptChange.emit({ base64: await this._fileToBase64(file), file });
    } catch {
      this.fileError.set('No se pudo leer el archivo. Intenta con otra imagen.');
    }
  }

  removeReceipt(): void {
    this.fileError.set(null);
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
