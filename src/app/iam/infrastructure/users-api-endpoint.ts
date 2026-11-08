import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Role } from '../domain/model/role';
import { User } from '../domain/model/user.entity';
import { UserAssembler } from './user-assembler';
import { UserResource, UsersResponse } from './user.resource';

/**
 * Client for `/users` (administrators only): list, change role and deactivate.
 */
export class UsersApiEndpoint extends BaseApiEndpoint<User, UserResource, UsersResponse, UserAssembler> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderUsersEndpointPath}`,
      new UserAssembler(),
    );
  }

  changeRole(id: number, role: Role): Observable<User> {
    return this.http.put<UserResource>(`${this.endpointUrl}/${id}/role`, { role }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to change user role')),
    );
  }

  deactivate(id: number): Observable<User> {
    return this.http.post<UserResource>(`${this.endpointUrl}/${id}/deactivate`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to deactivate user')),
    );
  }
}
