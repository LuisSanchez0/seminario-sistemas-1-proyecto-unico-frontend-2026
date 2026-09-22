import { Component, input } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { FormUtils } from '../../../utils/form-utils';

@Component({
  selector: 'form-error-label',
  imports: [],
  host: { class: 'block' },
  templateUrl: './form-error-label.component.html',
})
export class FormErrorLabelComponent {
  control = input.required<AbstractControl>();
  name = input.required<string>();

  get errorMessage() {
    const errors: ValidationErrors = this.control().errors || {};

    return this.control().touched && Object.keys(errors).length > 0
      ? this.name() + FormUtils.getTextError(errors)
      : null;
  }
}
