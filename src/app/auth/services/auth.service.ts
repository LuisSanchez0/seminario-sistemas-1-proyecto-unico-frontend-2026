import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

import { catchError, map, Observable, of, tap } from 'rxjs';

import { User } from '../interfaces/user.interface';
import { environment } from '../../../environments/environment.development';
import { AuthResponse, Error } from '../interfaces/auth-response.interface';

type AuthStatus =
  | 'checking'
  | 'twofactor'
  | 'authenticated'
  | 'not-authenticated';

const baseURL = environment.baseUrl;

declare const google: any;
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _authStatus = signal<AuthStatus>('checking');
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(localStorage.getItem('token'));

  private _userTmp = signal<User | null>(null);
  private _tokenTmp = signal<string | null>(null);

  private http = inject(HttpClient);

  //!Este se dispara tan pronto el servicio se dispare una vez
  checkStatusResource = rxResource({
    stream: () => this.checkStatus(),
  });

  authStatus = computed<AuthStatus>(() => {
    if (this._authStatus() === 'checking') return 'checking';

    if (this._authStatus() === 'twofactor') return 'twofactor';

    if (this._user()) {
      return 'authenticated';
    }

    return 'not-authenticated';
  });

  user = computed<User | null>(() => this._user());
  userTmp = computed<User | null>(() => this._userTmp());

  token = computed<string | null>(() => this._token());
  tokenTmp = computed<string | null>(() => this._tokenTmp());

  isAdmin = computed<boolean>(() => this._user()?.role === 'ADMIN_ROLE' ? true : false);

  clientId = computed<string>(
    () =>
      '900828438923-uvgb51t15a6rs8um0b2lhf2a7i27ocgl.apps.googleusercontent.com'
  );

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${baseURL}/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((resp) => {
          this.handleAuthSuccess(resp);
        }),
        catchError((err: any) => this.handleAuthError(err))
      );
  }

  register(
    email: string,
    name: string,
    password: string
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${baseURL}/auth/register`, {
        email,
        name,
        password,
      })
      .pipe(
        tap((resp) => {
          this.handleRegisterSuccess(resp);
        }),
        catchError((error: any) => this.handleCommonError(error))
      );
  }

  validateEmail(email: string): Observable<Boolean> {
    const params = new HttpParams().set('email', email);
    return this.http
      .get<Error>(`${baseURL}/auth/validate-email`, { params })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  checkStatus(): Observable<boolean> {
    const token = localStorage.getItem('token');

    if (!token) {
      this.logout();
      return of(false);
    }

    return this.http.get<AuthResponse>(`${baseURL}/auth/check-status`).pipe(
      tap((resp) => {
        if (resp.ok) {
          this.handleAuthSuccess(resp);
        } else {
          this.logout();
        }
      }),
      map((resp) => resp.ok),
      catchError((error: any) => this.handleAuthError(error))
    );
  }

  logout() {
    this._user.set(null);
    this._token.set(null);
    this._authStatus.set('not-authenticated');

    localStorage.removeItem('token');

    if (this._user()?.google) {
      google.accounts.id.disableAutoSelect();
    }
  }

  cleanTmp() {
    this._userTmp.set(null);
    this._tokenTmp.set(null);
    this._authStatus.set('not-authenticated');

    localStorage.removeItem('token');
  }

  sendCode(type: string): Observable<boolean> {
    return this.http
      .post<AuthResponse>(`${baseURL}/auth/request-code`, {
        email: this.user()?.email || this.userTmp()?.email,
        type,
      })
      .pipe(
        map((resp) => resp.ok),
        catchError((err: any) => of(false))
      );
  }

  validate2FA(code: string): Observable<boolean> {
    return this.http
      .post<AuthResponse>(`${baseURL}/auth/2fa/verify`, {
        email: this.user()?.email || this.userTmp()?.email,
        code,
      })
      .pipe(
        tap((resp) => {
          this.handleUserVerified(resp);
        }),
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  promptGoogleSignIn(): Observable<AuthResponse> {
    return new Observable<AuthResponse>((observer) => {
      const supportsFedCM = 'FedCM' in window;

      google.accounts.id.initialize({
        client_id: this.clientId(),
        callback: (response: any) => {
          const id_token = response.credential;
          this.loginWithGoogle(id_token).subscribe((resp) => {
            observer.next(resp);
            observer.complete();
          });
        },
        ...(supportsFedCM ? { use_fedcm_for_prompt: true } : {}),
      });

      google.accounts.id.prompt();
    });
  }

  private loginWithGoogle(id_token: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${baseURL}/auth/google-sign-in`, { id_token })
      .pipe(
        tap((resp) => {
          this.handleAuthSuccess(resp);
        }),
        catchError((error: any) => this.handleAuthError(error))
      );
  }

  private handleAuthSuccess({ token, user }: AuthResponse) {
    this._user.set(user);
    this._authStatus.set('authenticated');
    this._token.set(token);

    localStorage.setItem('token', token);
  }

  private handleRegisterSuccess(resp: AuthResponse) {
    this._authStatus.set('twofactor');
    this._userTmp.set(resp.user);
    this._tokenTmp.set(resp.token);
  }

  private handleUserVerified({ token, user }: AuthResponse) {
    this._authStatus.set('authenticated');
    this._user.set(user);
    this._token.set(this.tokenTmp());

    localStorage.setItem('token', this.token()!);

    //!Reiniciamos los otros datos
    this._userTmp.set(null);
    this._tokenTmp.set(null);
  }

  private handleAuthError(error: any) {
    this.logout();
    return of(error);
  }

  private handleCommonError(error: any) {
    this.cleanTmp();
    return of(error);
  }
}
