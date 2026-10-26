import { registerLocaleData } from '@angular/common';
import localeEsGt from '@angular/common/locales/es-GT';
import { LOCALE_ID, Provider } from '@angular/core';

registerLocaleData(localeEsGt);

/** Mismo locale que `app.config.ts`, para que los pipes de moneda y fecha rindan igual que en la app. */
export const esGtProviders: Provider[] = [{ provide: LOCALE_ID, useValue: 'es-GT' }];
