import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface RecoveryResponse { ok: boolean; msg: string; retryAfter: number; }
interface VerificationResponse { ok: boolean; resetToken: string; expiresIn: number; }
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.baseUrl}/auth/password`;
  request(email: string) { return this.http.post<RecoveryResponse>(`${this.url}/request`, { email }); }
  verify(email: string, code: string) { return this.http.post<VerificationResponse>(`${this.url}/verify`, { email, code }); }
  reset(resetToken: string, newPassword: string, confirmPassword: string) {
    return this.http.post<{ ok: boolean; msg: string }>(`${this.url}/reset`, { resetToken, newPassword, confirmPassword });
  }
}
