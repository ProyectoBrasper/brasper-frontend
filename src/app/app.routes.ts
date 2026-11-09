import { Routes } from '@angular/router';
import { authenticationGuard } from './iam/application/authentication.guard';
import { roleGuard } from './iam/application/role.guard';
import { AREA_ROLES } from './iam/domain/model/role';

const signInForm = () =>
  import('./iam/presentation/views/sign-in-form/sign-in-form').then((m) => m.SignInForm);
const signUpForm = () =>
  import('./iam/presentation/views/sign-up-form/sign-up-form').then((m) => m.SignUpForm);
const userList = () => import('./iam/presentation/views/user-list/user-list').then((m) => m.UserList);
const pageNotFound = () =>
  import('./shared/presentation/views/page-not-found/page-not-found').then((m) => m.PageNotFound);
const projectsRoutes = () => import('./projects/presentation/projects.routes').then((m) => m.projectsRoutes);
const expensesRoutes = () => import('./expenses/presentation/expenses.routes').then((m) => m.expensesRoutes);
const treasuryRoutes = () => import('./treasury/presentation/treasury.routes').then((m) => m.treasuryRoutes);
const staffRoutes = () => import('./staff/presentation/staff.routes').then((m) => m.staffRoutes);
const billingRoutes = () => import('./billing/presentation/billing.routes').then((m) => m.billingRoutes);

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
  { path: 'projects', loadChildren: projectsRoutes, canActivate: [authenticationGuard] },
  // Billing reads are for finance roles only (backend #120).
  { path: 'billing', loadChildren: billingRoutes, canActivate: [roleGuard], data: { roles: AREA_ROLES.finance } },
  // Expenses and suppliers are read by any signed-in user (writes: admin, accounting, engineer).
  { path: 'expenses', loadChildren: expensesRoutes, canActivate: [authenticationGuard] },
  // Salaries are sensitive: admin, accounting and management read (writes: admin and accounting).
  { path: 'staff', loadChildren: staffRoutes, canActivate: [roleGuard], data: { roles: AREA_ROLES.staff } },
  // Treasury reads are for finance roles only (backend #120).
  { path: 'treasury', loadChildren: treasuryRoutes, canActivate: [roleGuard], data: { roles: AREA_ROLES.finance } },
  { path: '**', loadComponent: pageNotFound, title: 'Brasper' },
];
