import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormUtils } from '../../../utils/form-utils';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { apiErrorMessage } from '../../../shared/services/notification.service';
import { PasswordRecoveryService } from '../../services/password-recovery.service';

@Component({
  selector: 'app-restore-password-page',
  imports: [ReactiveFormsModule, RouterLink, ErrorAlertComponent],
  templateUrl: './restore-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestorePasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PasswordRecoveryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private resetToken = '';
  private cooldownTimer?: ReturnType<typeof setInterval>;
  private focusTimer?: ReturnType<typeof setTimeout>;
  readonly step = signal<'request' | 'verify' | 'reset'>('request');
  readonly loading = signal(false);
  readonly errors = signal<string[]>([]);
  readonly notice = signal('');
  readonly cooldown = signal(0);
  readonly emailForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly codeForm = this.fb.nonNullable.group({ code: ['', [Validators.required, Validators.pattern(FormUtils.codePattern)]] });
  readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(4)]],
    confirmPassword: ['', Validators.required],
  }, { validators: FormUtils.isFieldOneEqualFieldTwo('newPassword', 'confirmPassword') });

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearInterval(this.cooldownTimer);
      clearTimeout(this.focusTimer);
      this.resetToken = '';
    });
  }
  private focus(selector: string) {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => this.element.nativeElement.querySelector<HTMLElement>(selector)?.focus());
  }
  private startCooldown(seconds: number) {
    clearInterval(this.cooldownTimer);
    this.cooldown.set(Math.max(1, seconds));
    this.cooldownTimer = setInterval(() => {
      this.cooldown.update(value => Math.max(0, value - 1));
      if (!this.cooldown()) clearInterval(this.cooldownTimer);
    }, 1000);
  }
  private submit<T>(request: Observable<T>, success: (response: T) => void) {
    this.errors.set([]);
    this.notice.set('');
    this.loading.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: success,
      error: (error: unknown) => {
        const fallback = error instanceof HttpErrorResponse && error.status === 0
          ? 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.'
          : 'No se pudo completar la solicitud. Intenta de nuevo más tarde.';
        this.errors.set([error instanceof HttpErrorResponse && error.status >= 500 ? fallback : apiErrorMessage(error, fallback)]);
        if (error instanceof HttpErrorResponse && error.status === 429) {
          this.startCooldown(Number(error.headers.get('Retry-After')) || 30);
        }
        this.focus('[role="alert"]');
      },
    });
  }
  requestCode() {
    if (this.loading() || (this.step() === 'verify' && this.cooldown())) return;
    this.emailForm.controls.email.setValue(this.emailForm.controls.email.value.trim().toLowerCase());
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid) { this.errors.set(['Ingresa un correo electrónico válido.']); return; }
    this.submit(this.service.request(this.emailForm.getRawValue().email), response => {
      this.resetToken = '';
      this.codeForm.reset();
      this.step.set('verify');
      this.notice.set(response.msg);
      this.startCooldown(response.retryAfter || 30);
      this.focus('#code');
    });
  }
  verifyCode() {
    if (this.loading()) return;
    this.codeForm.markAllAsTouched();
    if (this.codeForm.invalid) { this.errors.set(['El código debe tener 8 dígitos.']); return; }
    this.submit(this.service.verify(this.emailForm.getRawValue().email, this.codeForm.getRawValue().code), response => {
      this.resetToken = response.resetToken;
      this.codeForm.reset();
      this.step.set('reset');
      this.notice.set('Código verificado. Tienes 5 minutos para cambiar tu contraseña.');
      this.focus('#newPassword');
    });
  }
  resetPassword() {
    if (this.loading()) return;
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      this.errors.set([this.passwordForm.hasError('passwordsNotEqual') ? 'Las contraseñas no coinciden.' : 'La nueva contraseña debe tener al menos 4 caracteres.']);
      return;
    }
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    this.submit(this.service.reset(this.resetToken, newPassword, confirmPassword), () => {
      this.resetToken = '';
      this.passwordForm.reset();
      void this.router.navigate(['/auth/login'], { queryParams: { reset: 'success' } });
    });
  }
  back() {
    if (this.loading()) return;
    this.resetToken = '';
    this.passwordForm.reset();
    this.codeForm.reset();
    this.errors.set([]);
    this.notice.set('');
    this.step.set('request');
    this.focus('#recoveryEmail');
  }
}
