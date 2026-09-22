import { Component, Input } from '@angular/core';

@Component({
  selector: 'success-alert',
  imports: [],
  templateUrl: './success-alert.component.html'
})
export class SuccessAlertComponent {
  @Input() success: string = '';
}
