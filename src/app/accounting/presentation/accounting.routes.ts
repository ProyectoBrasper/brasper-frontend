import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const ledgerAccountList = () =>
  import('./views/ledger-account-list/ledger-account-list').then((m) => m.LedgerAccountList);
const journalEntryList = () =>
  import('./views/journal-entry-list/journal-entry-list').then((m) => m.JournalEntryList);
const journalEntryForm = () =>
  import('./views/journal-entry-form/journal-entry-form').then((m) => m.JournalEntryForm);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.accountingWrite } };

/**
 * Accounting context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/accounting` (admin, accounting and
 * management read; admin and accounting write). Trial balance, tax returns, tax parameters and fixed assets come in
 * the next PRs.
 */
export const accountingRoutes: Routes = [
  { path: '', redirectTo: 'ledger-accounts', pathMatch: 'full' },
  { path: 'ledger-accounts', loadComponent: ledgerAccountList, title: 'Brasper' },
  { path: 'journal-entries', loadComponent: journalEntryList, title: 'Brasper' },
  { path: 'journal-entries/new', loadComponent: journalEntryForm, title: 'Brasper', ...canWrite },
];
