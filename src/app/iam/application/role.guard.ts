import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../domain/model/role';
import { IamStore } from './iam.store';

/**
 * Lets the route through only when the user has one of `route.data.roles`.
 * Without a session it redirects to `/sign-in`; with the wrong role, to the home page.
 */
export const roleGuard: CanActivateFn = (route) => {
  const store = inject(IamStore);
  const router = inject(Router);
  if (!store.isSignedIn()) {
    return router.createUrlTree(['/sign-in']);
  }
  const roles = (route.data['roles'] as Role[] | undefined) ?? [];
  return store.hasAnyRole(...roles) || router.createUrlTree(['/']);
};
