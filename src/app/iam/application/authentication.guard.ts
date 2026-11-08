import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { IamStore } from './iam.store';

/**
 * Lets the route through only with an active session; otherwise redirects to `/sign-in`.
 */
export const authenticationGuard: CanActivateFn = () =>
  inject(IamStore).isSignedIn() || inject(Router).createUrlTree(['/sign-in']);
