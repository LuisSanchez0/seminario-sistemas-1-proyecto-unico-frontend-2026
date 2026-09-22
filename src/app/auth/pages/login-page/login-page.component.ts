import { Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  ValueChangeEvent,
} from '@angular/forms';
import { Router } from '@angular/router';

import { FormUtils } from '../../../utils/form-utils';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, ErrorAlertComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent{
  fb = inject(FormBuilder);
  hasError = signal(false);
  isPosting = signal(false);
  errores: string[] = [];
  formUtils = FormUtils;

  authService = inject(AuthService);
  router = inject(Router);

  loginForm = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.pattern(FormUtils.emailPattern)],
    ],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  onSubmit() {
    this.errores = [];
    if (this.loginForm.invalid) {
      if (this.formUtils.isValidField(this.loginForm, 'password')) {
        const error = this.formUtils.getFieldError(this.loginForm, 'password');
        if (error) this.errores.push('La contraseña debe de tener un ' + error);
      }
      if (this.formUtils.isValidField(this.loginForm, 'email')) {
        const error = this.formUtils.getFieldError(this.loginForm, 'email');
        if (error) this.errores.push(error);
      }

      this.hasError.set(true);
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
      return;
    }
    const { email = '', password = '' } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe((isAuthenticated) => {
      if (isAuthenticated.ok) {
        this.router.navigateByUrl('/');
        return;
      }
      this.hasError.set(true);
      this.errores.push(isAuthenticated.error!.msg);
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
    });
  }

  loginWithGoogle() {
    this.errores = [];

    this.authService.promptGoogleSignIn().subscribe((resp) => {
      if (resp.ok) {
        this.router.navigateByUrl('/');
        return;
      }

      this.hasError.set(true);
      this.errores.push(resp.error!.msg);
      setTimeout(() => {
        this.hasError.set(false);
      }, 4000);
    });
  }
}
