import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextConfirmationId = 0;
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="modal" [attr.aria-labelledby]="titleId" (cancel)="onCancel($event)">
      <div class="modal-box max-h-[85dvh] overflow-y-auto">
        <h2 [id]="titleId" class="text-xl font-bold">{{ title() }}</h2>
        <p class="py-4">{{ message() }}</p>
        @if (error()) {
          <p role="alert" class="alert alert-error">{{ error() }}</p>
        }
        <div class="modal-action flex-wrap">
          <button type="button" class="btn" [disabled]="busy()" (click)="close()" autofocus>
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-error"
            [disabled]="busy()"
            (click)="confirmed.emit()"
          >
            @if (busy()) {
              <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
            }
            Eliminar
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly titleId = `confirmation-title-${nextConfirmationId++}`;
  title = input('Confirmar eliminación');
  message = input('');
  busy = input(false);
  error = input('');
  confirmed = output();
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  open(): void {
    this.dialog().nativeElement.showModal();
  }
  close(): void {
    this.dialog().nativeElement.close();
  }
  onCancel(event: Event): void {
    if (this.busy()) event.preventDefault();
  }
}
