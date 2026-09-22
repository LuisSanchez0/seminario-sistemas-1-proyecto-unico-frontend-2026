import { inject } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ValidationErrors } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

async function sleep() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 2500);
  });
}
export class FormUtils {
  private static _authService: AuthService;
  static initialize(authService: AuthService) {
    this._authService = authService;
  }

  static slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Expresiones regulares
  static namePattern = '([a-zA-Z]+) ([a-zA-Z]+)';
  static emailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';
  static codePattern = '^[0-9]{8}$';
  static notOnlySpacesPattern = '^[a-zA-Z0-9]+$';
  static slugPattern = '^[a-z0-9_]+(?:-[a-z0-9_]+)*$';

  static getTextError(errors: ValidationErrors) {
    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':
          return 'ser completado';

        case 'minlength':
          return `tener un valor mínimo de ${errors['minlength'].requiredLength} caracteres.`;

        case 'maxlength':
          return `tener un valor máximo es de ${errors['maxlength'].requiredLength} caracteres.`;

        case 'min':
          return `tener un valor mínimo de ${errors['min'].min}`;

        case 'email':
          return `lucir como un correo electrónico`;

        case 'emailTaken':
          return `usar otro correo, ya que está siendo usado por otro usuario`;

        case 'serverError':
          return `Error interno en el servidor`;

        case 'noStrider':
          return `No se puede usar el username de strider en la app`;
        case 'pattern':
          if (errors['pattern'].requiredPattern === FormUtils.emailPattern) {
            return 'lucir como un correo electrónico';
          }
          if (errors['pattern'].requiredPattern === FormUtils.codePattern) {
            return 'lucir como un código de verificación';
          }
          return 'lucir contra expresión regular';

        default:
          return `Error de validación no controlado ${key}`;
      }
    }

    return null;
  }

  static isValidField(form: FormGroup, fieldName: string): boolean | null {
    return !!form.controls[fieldName].errors && form.controls[fieldName].touched;
  }

  static getFieldError(form: FormGroup, fieldName: string): string | null {
    if (!form.controls[fieldName]) return null;

    const errors = form.controls[fieldName].errors ?? {};

    return `En el campo: ${fieldName}, debe de ${FormUtils.getTextError(errors)}`;
  }

  static isValidFieldInArray(formArray: FormArray, index: number) {
    return formArray.controls[index].errors && formArray.controls[index].touched;
  }

  static getFieldErrorInArray(formArray: FormArray, index: number): string | null {
    if (formArray.controls.length === 0) return null;

    const errors = formArray.controls[index].errors ?? {};

    return FormUtils.getTextError(errors);
  }

  static isFieldOneEqualFieldTwo(field1: string, field2: string) {
    return (formGroup: AbstractControl) => {
      const field1Value = formGroup.get(field1)?.value;
      const field2Value = formGroup.get(field2)?.value;

      return field1Value === field2Value ? null : { passwordsNotEqual: true };
    };
  }

  static checkingServerResponse() {
    return async (control: AbstractControl): Promise<ValidationErrors | null> => {
      const formValue = control.value;

      try {
        const emailExists = await firstValueFrom(this._authService.validateEmail(formValue));

        if (!emailExists) {
          return { emailTaken: true };
        }
      } catch (error) {
        console.error('Error durante la validación del email', error);
        return { serverError: true };
      }
      return null;
    };
  }

  static notStrider(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    return value === 'strider' ? { noStrider: true } : null;
  }
}
