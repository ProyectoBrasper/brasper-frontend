import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { SignInCommand } from '../domain/model/sign-in.command';
import { User } from '../domain/model/user.entity';
import { SignInAssembler } from './sign-in-assembler';
import { SignInResource } from './sign-in.resource';

/**
 * Client for `POST /auth/sign-in`.
 */
export class SignInApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderSignInEndpointPath}`;
  private readonly assembler = new SignInAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  signIn(command: SignInCommand): Observable<{ user: User; token: string }> {
    return this.http
      .post<SignInResource>(this.endpointUrl, this.assembler.toRequestFromCommand(command))
      .pipe(
        map((resource) => ({
          user: this.assembler.toEntityFromResource(resource),
          token: this.assembler.toTokenFromResource(resource),
        })),
        catchError(this.handleError('Failed to sign in')),
      );
  }
}
