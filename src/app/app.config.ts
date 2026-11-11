import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  inject,
  Injector,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatIconRegistry } from '@angular/material/icon';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authenticationInterceptor } from './iam/infrastructure/authentication.interceptor';
import { PERU_DATE_FORMATS, PeruDateAdapter } from './shared/presentation/peru-date-adapter';

registerLocaleData(localeEsPe);

/**
 * Application-wide providers: routing, HTTP, i18n (es / en), Peruvian locale (PEN, dd/MM/yyyy)
 * paginator texts and Material Symbols as the default icon font.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authenticationInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: './i18n/', suffix: '.json' }),
      fallbackLang: 'es',
      lang: 'es',
    }),
    { provide: DateAdapter, useClass: PeruDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: PERU_DATE_FORMATS },
    { provide: LOCALE_ID, useValue: 'es-PE' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'PEN' },
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    }),
    // Loaded apart, so the paginator stays out of the initial bundle; paginators already shown refresh when it lands.
    provideAppInitializer(() => {
      const injector = inject(Injector);
      void Promise.all([import('@angular/material/paginator'), import('./shared/presentation/translated-paginator-intl')]).then(
        ([paginator, texts]) => texts.translatePaginator(injector.get(paginator.MatPaginatorIntl), injector.get(TranslateService)),
      );
    }),
  ],
};
