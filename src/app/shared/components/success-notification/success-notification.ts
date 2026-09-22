import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'success-notification',
  imports: [],
  standalone: true,
  templateUrl: './success-notification.html',
})
export class SuccessNotification {
  title = input.required<string>();
  description = input.required<string>();

  closed = output<void>();

  onClose() { this.closed.emit(); }
}
