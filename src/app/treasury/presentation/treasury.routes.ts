import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const bankAccountList = () => import('./views/bank-account-list/bank-account-list').then((m) => m.BankAccountList);
const bankAccountForm = () => import('./views/bank-account-form/bank-account-form').then((m) => m.BankAccountForm);
const bankAccountDetail = () =>
  import('./views/bank-account-detail/bank-account-detail').then((m) => m.BankAccountDetail);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.treasuryWrite } };

/**
 * Treasury context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/treasury` (finance roles read;
 * admin and accounting write). Payables, loans and partners come in the next PRs.
 */
export const treasuryRoutes: Routes = [
  { path: '', redirectTo: 'bank-accounts', pathMatch: 'full' },
  { path: 'bank-accounts', loadComponent: bankAccountList, title: 'Brasper' },
  { path: 'bank-accounts/new', loadComponent: bankAccountForm, title: 'Brasper', ...canWrite },
  // After `new`, so it is not taken as an id.
  { path: 'bank-accounts/:id', loadComponent: bankAccountDetail, title: 'Brasper' },
];
