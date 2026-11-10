import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const ledgerAccountList = () =>
  import('./views/ledger-account-list/ledger-account-list').then((m) => m.LedgerAccountList);
const journalEntryList = () =>
  import('./views/journal-entry-list/journal-entry-list').then((m) => m.JournalEntryList);
const journalEntryForm = () =>
  import('./views/journal-entry-form/journal-entry-form').then((m) => m.JournalEntryForm);
const trialBalanceView = () =>
  import('./views/trial-balance-view/trial-balance-view').then((m) => m.TrialBalanceView);
const taxReturnList = () => import('./views/tax-return-list/tax-return-list').then((m) => m.TaxReturnList);
const taxParametersForm = () =>
  import('./views/tax-parameters-form/tax-parameters-form').then((m) => m.TaxParametersForm);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.accountingWrite } };

/**
 * Accounting context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/accounting` (admin, accounting and
 * management read; admin and accounting write; only admin sets tax rates). Fixed assets come in the next PR.
 */
export const accountingRoutes: Routes = [
  { path: '', redirectTo: 'ledger-accounts', pathMatch: 'full' },
  { path: 'ledger-accounts', loadComponent: ledgerAccountList, title: 'Brasper' },
  { path: 'journal-entries', loadComponent: journalEntryList, title: 'Brasper' },
  { path: 'journal-entries/new', loadComponent: journalEntryForm, title: 'Brasper', ...canWrite },
  { path: 'trial-balance', loadComponent: trialBalanceView, title: 'Brasper' },
  { path: 'tax-returns', loadComponent: taxReturnList, title: 'Brasper' },
  { path: 'tax-parameters', loadComponent: taxParametersForm, title: 'Brasper' },
];
