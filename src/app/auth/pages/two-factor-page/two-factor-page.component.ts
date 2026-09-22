import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormUtils } from '../../../utils/form-utils';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { I18nPluralPipe, NgClass } from '@angular/common';
import { SuccessAlertComponent } from '../../../shared/components/success-alert/success-alert.component';

@Component({
  selector: 'app-two-factor-page',
  imports: [
    ErrorAlertComponent,
    ReactiveFormsModule,
    I18nPluralPipe,
    NgClass,
    SuccessAlertComponent,
  ],
  templateUrl: './two-factor-page.component.html',
})
export class TwoFactorPageComponent {
  constructor() {
    effect(() => {
      this.onSendCode();
    });
  }

  fb = inject(FormBuilder);
  hasError = signal(false);
  isPosting = signal(false);
  isSended = signal(false);
  isEnable = signal(true);
  timer = signal<number | null>(0);
  errores: string[] = [];
  formUtils = FormUtils;

  powerClasses = computed(() => {
    const base = [
      'mt-3',
      'w-75',
      'justify-center',
      'rounded-md',
      'px-3',
      'py-1.5',
      'text-sm',
      'leading-6',
      'font-semibold',
      'shadow-xs',
    ];

    const enabled = [
      'bg-indigo-600',
      'text-white',
      'hover:bg-indigo-500',
      'focus-visible:outline-2',
      'focus-visible:outline-offset-2',
      'focus-visible:outline-indigo-600',
    ];

    const disabled = [
      'bg-gray-300',
      'text-gray-500',
      'cursor-not-allowed',
      'hover:bg-gray-300',
      'focus-visible:outline-2',
      'focus-visible:outline-offset-2',
      'focus-visible:outline-gray-300',
    ];

    return [...base, ...(this.isEnable() ? enabled : disabled)].join(' ');
  });

  authService = inject(AuthService);
  router = inject(Router);

  twoFactorForm = this.fb.group({
    code: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(8),
        Validators.pattern(FormUtils.codePattern),
      ],
    ],
  });

  onSubmit() {
    this.errores = [];
    this.twoFactorForm.markAllAsTouched();

    if (this.twoFactorForm.invalid) {
      const fields = ['code'];

      fields.forEach((field) => {
        if (this.formUtils.isValidField(this.twoFactorForm, field)) {
          const error = this.formUtils.getFieldError(this.twoFactorForm, field);
          if (error) this.errores.push(error);
        }
      });

      this.hasError.set(true);
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
      return;
    }
    const { code = '' } = this.twoFactorForm.value;

    this.authService.validate2FA(code!).subscribe((isValid) => {
      if (isValid) {
        this.router.navigateByUrl('/');
        return;
      }
      this.hasError.set(true);
      this.errores.push(
        'El código ingresado es incorrecto, ingresalo de nuevo'
      );
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
    });
  }

  onSendCode() {
    this.errores = [];
    this.authService.sendCode('2fa').subscribe((sended) => {
      if (sended) {
        this.isSended.set(true);
        setTimeout(() => {
          this.isSended.set(false);
        }, 4000);
        return;
      }
      this.hasError.set(true);
      this.errores.push('Error en el servidor, contacte a administración');
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
    });
  }

  errorMapping: { [key: string]: string } = {
    '=0': 'Haz click para volver a enviar el correo',
    '=1': 'Vuelve a generar el código en # segundo',
    other: 'Vuelve a generar el código en # segundos',
  };

  enableButton() {
    this.timer.set(30);
    this.isEnable.set(false);
    this.onSendCode();
    const interval = setInterval(() => {
      const current = this.timer();
      if (current! > 0) {
        this.timer.set(current! - 1);
      } else {
        clearInterval(interval);
        this.isEnable.set(true);
      }
    }, 1000);
    this.timer.set(30);
  }

  onCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
  }
}
