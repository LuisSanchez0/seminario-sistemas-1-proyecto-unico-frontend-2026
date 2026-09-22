import { Component, inject, OnInit, signal } from '@angular/core';
import { FormUtils } from '../../../utils/form-utils';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';

@Component({
  selector: 'app-register-page',
  imports: [ErrorAlertComponent, ReactiveFormsModule],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent implements OnInit {
  ngOnInit(): void {
    FormUtils.initialize(this.authService);
  }

  fb = inject(FormBuilder);
  hasError = signal(false);
  isPosting = signal(false);
  errores: string[] = [];
  formUtils = FormUtils;

  authService = inject(AuthService);
  router = inject(Router);

  registerForm = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.pattern(FormUtils.emailPattern)],
      [FormUtils.checkingServerResponse()],
    ],
    name: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
  });

  onSubmit() {
    this.errores = [];
    this.registerForm.markAllAsTouched();
    
    if (this.registerForm.invalid) {
      const fields = ['email', 'password', 'name'];

      fields.forEach((field) => {
        if (this.formUtils.isValidField(this.registerForm, field)) {
          const error = this.formUtils.getFieldError(this.registerForm, field);
          if (error) this.errores.push(error);
        }
      });

      this.hasError.set(true);
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
      return;
    }
    const { email = '', name = '', password = '' } = this.registerForm.value;

    this.authService
      .register(email!, name!, password!)
      .subscribe((isAuthenticated) => {
        if (isAuthenticated.ok) {
          this.router.navigateByUrl('/auth/twofa');
          return;
        }
        this.hasError.set(true);
        this.errores.push(isAuthenticated.error!.msg);
        setTimeout(() => {
          this.hasError.set(false);
        }, 4000);
      });
  }
}
