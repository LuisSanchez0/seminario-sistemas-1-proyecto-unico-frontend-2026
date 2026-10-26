import axe from 'axe-core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RestorePasswordPageComponent } from './restore-password-page.component';
import { LoginPageComponent } from '../login-page/login-page.component';
import { environment } from '../../../../environments/environment';

const url = `${environment.baseUrl}/auth/password`;
describe('Password recovery', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<RestorePasswordPageComponent>;
  let page: RestorePasswordPageComponent;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([
      { path: 'auth/login', component: LoginPageComponent },
      { path: 'auth/restore', component: RestorePasswordPageComponent },
    ])] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RestorePasswordPageComponent); page = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => { http.verify(); fixture.destroy(); });
  function request() {
    page.emailForm.setValue({ email: 'recovery@example.com' }); page.requestCode();
    http.expectOne(`${url}/request`).flush({ ok: true, msg: 'Si la cuenta existe, enviaremos un código de recuperación.', retryAfter: 30 });
    fixture.detectChanges();
  }
  function verify() {
    request(); page.codeForm.setValue({ code: '12345678' }); page.verifyCode();
    http.expectOne(`${url}/verify`).flush({ ok: true, resetToken: 'a'.repeat(64), expiresIn: 300 }); fixture.detectChanges();
  }
  it('login link navigates to the real recovery route', async () => {
    const login = TestBed.createComponent(LoginPageComponent); login.detectChanges();
    const link = login.nativeElement.querySelector('a[href="/auth/restore"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('¿Olvidaste tu contraseña?'); link.click(); await login.whenStable();
    expect(TestBed.inject(Router).url).toBe('/auth/restore'); login.destroy();
  });
  it.each(['', 'invalid'])('rejects invalid identifier %s', email => {
    page.emailForm.setValue({ email }); page.requestCode(); http.expectNone(`${url}/request`);
    expect(page.errors()[0]).toContain('correo electrónico válido');
  });
  it('normalizes identifier, shows safe message, and disables duplicate requests during loading', () => {
    page.emailForm.setValue({ email: ' RECOVERY@EXAMPLE.COM ' }); page.requestCode(); page.requestCode(); fixture.detectChanges();
    expect(page.loading()).toBe(true); expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    const pending = http.expectOne(`${url}/request`); expect(pending.request.body.email).toBe('recovery@example.com');
    pending.flush({ ok: true, msg: 'Si la cuenta existe, enviaremos un código de recuperación.', retryAfter: 30 });
    expect(page.step()).toBe('verify'); expect(page.loading()).toBe(false); expect(page.notice()).toContain('Si la cuenta existe');
  });
  it.each(['', '123', 'abcdefgh'])('rejects invalid code %s', code => {
    request(); page.codeForm.setValue({ code }); page.verifyCode(); http.expectNone(`${url}/verify`);
    expect(page.errors()[0]).toContain('8 dígitos');
  });
  it.each(['Código enviado es incorrecto. Intentos restantes: 4', 'Código inválido o expirado', 'Demasiados intentos. Espera 15 minutos'])('renders code error: %s', msg => {
    request(); page.codeForm.setValue({ code: '12345678' }); page.verifyCode();
    http.expectOne(`${url}/verify`).flush({ ok: false, msg }, { status: 400, statusText: 'Bad Request' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(msg);
    expect(page.step()).toBe('verify'); expect(page.loading()).toBe(false);
  });
  it('enforces resend cooldown and allows resend afterwards', () => {
    request(); page.requestCode(); http.expectNone(`${url}/request`); page.cooldown.set(0); page.requestCode();
    http.expectOne(`${url}/request`).flush({ ok: true, msg: 'Si la cuenta existe', retryAfter: 30 }); expect(page.cooldown()).toBe(30);
  });
  it('handles rate-limit retry-after', () => {
    page.emailForm.setValue({ email: 'recovery@example.com' }); page.requestCode();
    http.expectOne(`${url}/request`).flush({ msg: 'Demasiadas solicitudes' }, { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '60' } });
    expect(page.cooldown()).toBe(60); expect(page.errors()).toEqual(['Demasiadas solicitudes']);
  });
  it.each([['', ''], ['abc', 'abc'], ['abcd', 'different']])('rejects empty/short/mismatched passwords', (newPassword, confirmPassword) => {
    verify(); page.passwordForm.setValue({ newPassword, confirmPassword }); page.resetPassword();
    http.expectNone(`${url}/reset`); expect(page.errors().length).toBe(1);
  });
  it('resets using memory-only authorization and redirects to login', async () => {
    verify(); page.passwordForm.setValue({ newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' }); page.resetPassword();
    const pending = http.expectOne(`${url}/reset`);
    expect(pending.request.body).toEqual({ resetToken: 'a'.repeat(64), newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' });
    expect(localStorage.length).toBe(0); expect(page.loading()).toBe(true);
    pending.flush({ ok: true, msg: 'Contraseña actualizada' }); await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/auth/login?reset=success');
    expect(page.passwordForm.getRawValue().newPassword).toBe('');
  });
  it('shows expired reset authorization and supports restarting', () => {
    verify(); page.passwordForm.setValue({ newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' }); page.resetPassword();
    http.expectOne(`${url}/reset`).flush({ msg: 'La autorización de recuperación expiró' }, { status: 400, statusText: 'Bad Request' });
    expect(page.errors()[0]).toContain('expiró'); page.back(); expect(page.step()).toBe('request');
    expect(page.passwordForm.getRawValue().newPassword).toBe('');
  });
  it('hides server internals and allows retry', () => {
    page.emailForm.setValue({ email: 'recovery@example.com' }); page.requestCode();
    http.expectOne(`${url}/request`).flush({ msg: 'internal secret stack' }, { status: 500, statusText: 'Server Error' });
    expect(page.errors()[0]).not.toContain('secret'); expect(page.loading()).toBe(false);
  });
  it('shows authoritative backend password-policy validation', () => {
    verify(); page.passwordForm.setValue({ newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' }); page.resetPassword();
    http.expectOne(`${url}/reset`).flush({ errors: [{ msg: 'La nueva contraseña debe tener al menos 4 caracteres' }] }, { status: 400, statusText: 'Bad Request' });
    expect(page.errors()[0]).toContain('al menos 4 caracteres');
  });
  it('shows a network error', () => {
    page.emailForm.setValue({ email: 'recovery@example.com' }); page.requestCode();
    http.expectOne(`${url}/request`).error(new ProgressEvent('error'));
    expect(page.errors()[0]).toContain('conexión');
  });
  it.each(['request', 'verify', 'reset'])('has accessible controls at %s step', async step => {
    if (step === 'verify') request(); if (step === 'reset') verify(); fixture.detectChanges();
    const result = await axe.run(fixture.nativeElement, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map(v => v.id)).toEqual([]);
  });
});
