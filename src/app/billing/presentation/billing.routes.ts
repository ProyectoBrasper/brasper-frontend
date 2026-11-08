import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const invoiceList = () => import('./views/invoice-list/invoice-list').then((m) => m.InvoiceList);
const invoiceForm = () => import('./views/invoice-form/invoice-form').then((m) => m.InvoiceForm);
const invoiceDetail = () => import('./views/invoice-detail/invoice-detail').then((m) => m.InvoiceDetail);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.billingWrite } };

/**
 * Billing context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/billing`.
 * Order matters: `invoices/new` before the detail (`invoices/:id`, next PR).
 */
export const billingRoutes: Routes = [
  { path: '', redirectTo: 'invoices', pathMatch: 'full' },
  { path: 'invoices', loadComponent: invoiceList, title: 'Brasper' },
  { path: 'invoices/new', loadComponent: invoiceForm, title: 'Brasper', ...canWrite },
  { path: 'invoices/:id', loadComponent: invoiceDetail, title: 'Brasper' },
];
