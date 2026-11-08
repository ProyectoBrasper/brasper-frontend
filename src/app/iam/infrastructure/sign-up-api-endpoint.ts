import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { SignUpCommand } from '../domain/model/sign-up.command';
import { User } from '../domain/model/user.entity';
import { SignUpRequest } from './sign-up.resource';
import { UserAssembler } from './user-assembler';
import { UserResource } from './user.resource';

/**
 * Client for `POST /auth/sign-up` (requires an administrator token in the backend).
 */
export class SignUpApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderSignUpEndpointPath}`;
  private readonly assembler = new UserAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  signUp(command: SignUpCommand): Observable<User> {
    const request: SignUpRequest = {
      username: command.username,
      password: command.password,
      fullName: command.fullName,
      role: command.role,
    };
    return this.http.post<UserResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to sign up')),
    );
  }
}
