import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  private readonly notificationService = inject(NotificationService);

  readonly toasts = this.notificationService.toasts;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
