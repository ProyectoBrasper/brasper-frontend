import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { ChangePasswordCommand } from '../domain/model/change-password.command';

/**
 * Client for `PUT /auth/password` (any signed-in user): 204 when changed; a wrong current password or a weak new one
 * is a 422, and 5 wrong attempts a 429.
 */
export class PasswordApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderPasswordEndpointPath}`;

  constructor(private readonly http: HttpClient) {
    super();
  }

  change(command: ChangePasswordCommand): Observable<void> {
    const request = { currentPassword: command.currentPassword, newPassword: command.newPassword };
    return this.http.put<void>(this.endpointUrl, request).pipe(catchError(this.handleError('Failed to change password')));
  }
}
