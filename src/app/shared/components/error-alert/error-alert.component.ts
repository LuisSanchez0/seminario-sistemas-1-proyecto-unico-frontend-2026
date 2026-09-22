import { I18nPluralPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'error-alert',
  imports: [ I18nPluralPipe ],
  templateUrl: './error-alert.component.html',
})
export class ErrorAlertComponent {
  @Input() errors: string[] = [];

  errorMapping: {[ key: string]: string} = {
    '=1'  : '1 error',
    other : '# errores'
  };
}
