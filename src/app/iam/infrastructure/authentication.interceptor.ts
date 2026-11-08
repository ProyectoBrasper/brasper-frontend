import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { IamStore } from '../application/iam.store';

/**
 * For requests to the platform API: adds `Authorization: Bearer <token>` and `Accept-Language`
 * (the backend localizes its error messages), and ends the session when the API answers 401.
 */
export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.platformProviderApiBaseUrl)) {
    return next(request);
  }
  const store = inject(IamStore);
  const language = inject(TranslateService).getCurrentLang() ?? 'es';
  const token = store.token();
  const headers: Record<string, string> = { 'Accept-Language': language };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return next(request.clone({ setHeaders: headers })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) {
        store.signOut();
      }
      return throwError(() => error);
    }),
  );
};
