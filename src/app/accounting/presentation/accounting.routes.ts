import { Routes } from '@angular/router';

const ledgerAccountList = () =>
  import('./views/ledger-account-list/ledger-account-list').then((m) => m.LedgerAccountList);
const journalEntryList = () =>
  import('./views/journal-entry-list/journal-entry-list').then((m) => m.JournalEntryList);

/**
 * Accounting context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/accounting` (admin, accounting and
 * management read; admin and accounting write). The manual entry, trial balance, tax returns, tax parameters and
 * fixed assets come in the next PRs.
 */
export const accountingRoutes: Routes = [
  { path: '', redirectTo: 'ledger-accounts', pathMatch: 'full' },
  { path: 'ledger-accounts', loadComponent: ledgerAccountList, title: 'Brasper' },
  { path: 'journal-entries', loadComponent: journalEntryList, title: 'Brasper' },
];
