import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

/** Datos de la cuenta que recibe las transferencias (configurados en el entorno). */
@Component({
  selector: 'app-payment-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-xl border border-gray-200 bg-white p-5" aria-label="Datos para transferencia">
      <p class="text-sm font-semibold text-gray-900">Transferencia o depósito bancario</p>

      @if (hasAccount()) {
        <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          @if (account.bank) {
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Banco</dt>
              <dd class="mt-0.5 font-semibold text-gray-900">{{ account.bank }}</dd>
            </div>
          }
          @if (account.accountType) {
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">
                Tipo de cuenta
              </dt>
              <dd class="mt-0.5 font-semibold text-gray-900">{{ account.accountType }}</dd>
            </div>
          }
          @if (account.holder) {
            <div class="col-span-2">
              <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Nombre</dt>
              <dd class="mt-0.5 font-semibold text-gray-900">{{ account.holder }}</dd>
            </div>
          }
          <div class="col-span-2 rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200">
            <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">
              Número de cuenta
            </dt>
            <dd class="mt-1 flex items-center justify-between gap-3">
              <span class="break-all font-mono text-lg font-bold text-gray-900">
                {{ account.accountNumber }}
              </span>
              <button
                type="button"
                (click)="copy()"
                class="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {{ copied() ? 'Copiado' : 'Copiar' }}
              </button>
            </dd>
          </div>
        </dl>
        <p class="mt-3 text-xs leading-relaxed text-gray-600">
          Indica el código de tu pedido como referencia y sube tu comprobante. Confirmaremos tu
          pago manualmente.
        </p>
      } @else {
        <p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          Los datos de la cuenta para transferir te los confirmará la tienda. Puedes realizar tu
          pedido y subir el comprobante cuando hayas pagado.
        </p>
      }
    </section>
  `,
})
export class PaymentAccountComponent {
  readonly account = environment.paymentAccount;
  readonly hasAccount = computed(() => this.account.accountNumber.trim() !== '');
  readonly copied = signal(false);

  copy(): void {
    navigator.clipboard
      ?.writeText(this.account.accountNumber)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      })
      .catch(() => {
        // El portapapeles puede no estar disponible (HTTP o navegador antiguo).
      });
  }
}
