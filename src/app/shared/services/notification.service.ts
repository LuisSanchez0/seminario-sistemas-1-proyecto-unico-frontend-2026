import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _toasts = signal<Toast[]>([]);

  /** Read-only list of active toasts consumed by ToastContainerComponent. */
  readonly toasts = this._toasts.asReadonly();

  success(title: string, description?: string, duration = 3500): void {
    this._show({ type: 'success', title, description }, duration);
  }

  error(title: string, description?: string, duration = 4000): void {
    this._show({ type: 'error', title, description }, duration);
  }

  info(title: string, description?: string, duration = 3500): void {
    this._show({ type: 'info', title, description }, duration);
  }

  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private _show(partial: Omit<Toast, 'id'>, duration: number): void {
    const id = Math.random().toString(36).slice(2, 9);
    this._toasts.update((list) => [...list, { id, ...partial }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}

/**
 * Reads the backend's `{ ok: false, msg }` body. `fallback` lets a single operation replace the
 * generic copy with something actionable without changing it for every other caller.
 */
export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body: unknown = error.error;
    if (
      typeof body === 'object' &&
      body !== null &&
      'msg' in body &&
      typeof body.msg === 'string' &&
      body.msg.trim()
    )
      return body.msg;
    if (typeof body === 'object' && body !== null && 'errors' in body && Array.isArray(body.errors)) {
      const messages = body.errors
        .filter((entry: unknown): entry is { msg: string } => typeof entry === 'object' && entry !== null && 'msg' in entry && typeof entry.msg === 'string')
        .map(entry => entry.msg);
      if (messages.length) return messages.join(' ');
    }
  }
  return fallback;
}
