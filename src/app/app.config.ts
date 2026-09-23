import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth/interceptors/auth.interceptor';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsGt from '@angular/common/locales/es-GT';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

/**
 * Templates across the storefront format money with `| currency: 'GTQ' : ... : 'es-GT'`.
 * Angular only ships `en-US` data by default, so without this registration every one of
 * those bindings threw `NG0701: Missing locale data for the locale "es-GT"` at render
 * time — which is why the cart showed "c/u" and "Total" with no amounts beside them.
 */
registerLocaleData(localeEsGt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-GT' },
  ],
};
