import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { Role } from '../domain/model/role';
import { SignInCommand } from '../domain/model/sign-in.command';
import { SignUpCommand } from '../domain/model/sign-up.command';
import { User } from '../domain/model/user.entity';
import { SignInApiEndpoint } from './sign-in-api-endpoint';
import { SignUpApiEndpoint } from './sign-up-api-endpoint';
import { ChangePasswordCommand } from '../domain/model/change-password.command';
import { PasswordApiEndpoint } from './password-api-endpoint';
import { UsersApiEndpoint } from './users-api-endpoint';

/**
 * IAM facade over the authentication and user endpoints.
 */
@Injectable({ providedIn: 'root' })
export class IamApi extends BaseApi {
  private readonly http = inject(HttpClient);
  private readonly signInEndpoint = new SignInApiEndpoint(this.http);
  private readonly signUpEndpoint = new SignUpApiEndpoint(this.http);
  private readonly usersEndpoint = new UsersApiEndpoint(this.http);
  private readonly passwordEndpoint = new PasswordApiEndpoint(this.http);

  signIn(command: SignInCommand): Observable<{ user: User; token: string }> {
    return this.signInEndpoint.signIn(command);
  }

  signUp(command: SignUpCommand): Observable<User> {
    return this.signUpEndpoint.signUp(command);
  }

  getUsers(): Observable<User[]> {
    return this.usersEndpoint.getAll();
  }

  changeUserRole(id: number, role: Role): Observable<User> {
    return this.usersEndpoint.changeRole(id, role);
  }

  deactivateUser(id: number): Observable<User> {
    return this.usersEndpoint.deactivate(id);
  }

  reactivateUser(id: number): Observable<User> {
    return this.usersEndpoint.reactivate(id);
  }

  resetUserPassword(id: number, newPassword: string): Observable<void> {
    return this.usersEndpoint.resetPassword(id, newPassword);
  }

  changePassword(command: ChangePasswordCommand): Observable<void> {
    return this.passwordEndpoint.change(command);
  }
}
