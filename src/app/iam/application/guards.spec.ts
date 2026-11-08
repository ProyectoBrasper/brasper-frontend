import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Role } from '../domain/model/role';
import { authenticationGuard } from './authentication.guard';
import { IamStore } from './iam.store';
import { roleGuard } from './role.guard';

describe('IAM guards', () => {
  let signedIn: boolean;
  let roles: Role[];

  beforeEach(() => {
    signedIn = false;
    roles = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: IamStore,
          useValue: {
            isSignedIn: () => signedIn,
            hasAnyRole: (...required: Role[]) => required.some((role) => roles.includes(role)),
          },
        },
      ],
    });
  });

  const run = (guard: typeof authenticationGuard, data: Record<string, unknown> = {}) =>
    TestBed.runInInjectionContext(() =>
      guard({ data } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  const url = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authenticationGuard redirects to /sign-in without a session', () => {
    expect(url(run(authenticationGuard))).toBe('/sign-in');
  });

  it('authenticationGuard lets a signed-in user through', () => {
    signedIn = true;
    expect(run(authenticationGuard)).toBe(true);
  });

  it('roleGuard lets an allowed role through', () => {
    signedIn = true;
    roles = [Role.ROLE_ACCOUNTING];
    expect(run(roleGuard, { roles: [Role.ROLE_ACCOUNTING, Role.ROLE_ADMIN] })).toBe(true);
  });

  it('roleGuard sends a user without the role to the home page', () => {
    signedIn = true;
    roles = [Role.ROLE_ENGINEER];
    expect(url(run(roleGuard, { roles: [Role.ROLE_ADMIN] }))).toBe('/');
  });

  it('roleGuard sends a user without session to /sign-in', () => {
    expect(url(run(roleGuard, { roles: [Role.ROLE_ADMIN] }))).toBe('/sign-in');
  });
});
