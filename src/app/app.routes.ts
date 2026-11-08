import { Routes } from '@angular/router';
import { roleGuard } from './iam/application/role.guard';
import { AREA_ROLES } from './iam/domain/model/role';

const signInForm = () =>
  import('./iam/presentation/views/sign-in-form/sign-in-form').then((m) => m.SignInForm);
const signUpForm = () =>
  import('./iam/presentation/views/sign-up-form/sign-up-form').then((m) => m.SignUpForm);
const userList = () => import('./iam/presentation/views/user-list/user-list').then((m) => m.UserList);
const pageNotFound = () =>
  import('./shared/presentation/views/page-not-found/page-not-found').then((m) => m.PageNotFound);

/**
 * Root routes (docs/uml-frontend/00-app.puml). Each bounded context is lazy loaded with
 * `loadChildren` and protected with `authenticationGuard` / `roleGuard` as it is implemented.
 * Home is `/projects` until the dashboard is built (it is done last).
 */
export const routes: Routes = [
  { path: '', redirectTo: 'projects', pathMatch: 'full' },
  { path: 'sign-in', loadComponent: signInForm, title: 'Brasper' },
  {
    path: 'sign-up',
    loadComponent: signUpForm,
    canActivate: [roleGuard],
    data: { roles: AREA_ROLES.users },
    title: 'Brasper',
  },
  {
    path: 'users',
    loadComponent: userList,
    canActivate: [roleGuard],
    data: { roles: AREA_ROLES.users },
    title: 'Brasper',
  },
  { path: '**', loadComponent: pageNotFound, title: 'Brasper' },
];
