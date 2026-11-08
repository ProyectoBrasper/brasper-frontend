import { Routes } from '@angular/router';

const invoiceList = () => import('./views/invoice-list/invoice-list').then((m) => m.InvoiceList);

/**
 * Billing context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/billing`.
 * Issue form, detail and scheduled collections come in the next PRs.
 */
export const billingRoutes: Routes = [
  { path: '', redirectTo: 'invoices', pathMatch: 'full' },
  { path: 'invoices', loadComponent: invoiceList, title: 'Brasper' },
];
