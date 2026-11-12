import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const bankAccountList = () => import('./views/bank-account-list/bank-account-list').then((m) => m.BankAccountList);
const bankAccountForm = () => import('./views/bank-account-form/bank-account-form').then((m) => m.BankAccountForm);
const payableList = () => import('./views/payable-list/payable-list').then((m) => m.PayableList);
const payableForm = () => import('./views/payable-form/payable-form').then((m) => m.PayableForm);
const loanList = () => import('./views/loan-list/loan-list').then((m) => m.LoanList);
const loanForm = () => import('./views/loan-form/loan-form').then((m) => m.LoanForm);
const loanDetail = () => import('./views/loan-detail/loan-detail').then((m) => m.LoanDetail);
const partnerList = () => import('./views/partner-list/partner-list').then((m) => m.PartnerList);
const bankAccountDetail = () =>
  import('./views/bank-account-detail/bank-account-detail').then((m) => m.BankAccountDetail);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.treasuryWrite } };

/**
 * Treasury context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/treasury` (finance roles read;
 * admin and accounting write).
 */
export const treasuryRoutes: Routes = [
  { path: '', redirectTo: 'bank-accounts', pathMatch: 'full' },
  { path: 'bank-accounts', loadComponent: bankAccountList, title: 'Brasper' },
  { path: 'bank-accounts/new', loadComponent: bankAccountForm, title: 'Brasper', ...canWrite },
  // After `new`, so it is not taken as an id.
  { path: 'bank-accounts/:id', loadComponent: bankAccountDetail, title: 'Brasper' },
  { path: 'payables', loadComponent: payableList, title: 'Brasper' },
  { path: 'payables/new', loadComponent: payableForm, title: 'Brasper', ...canWrite },
  { path: 'loans', loadComponent: loanList, title: 'Brasper' },
  { path: 'loans/new', loadComponent: loanForm, title: 'Brasper', ...canWrite },
  { path: 'loans/:id', loadComponent: loanDetail, title: 'Brasper' },
  { path: 'partners', loadComponent: partnerList, title: 'Brasper' },
];
