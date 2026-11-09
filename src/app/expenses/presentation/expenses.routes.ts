import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/application/role.guard';
import { AREA_ROLES } from '../../iam/domain/model/role';

const expenseList = () => import('./views/expense-list/expense-list').then((m) => m.ExpenseList);
const expenseForm = () => import('./views/expense-form/expense-form').then((m) => m.ExpenseForm);
const supplierList = () => import('./views/supplier-list/supplier-list').then((m) => m.SupplierList);
const supplierForm = () => import('./views/supplier-form/supplier-form').then((m) => m.SupplierForm);

const canWrite = { canActivate: [roleGuard], data: { roles: AREA_ROLES.operationsWrite } };

/**
 * Expenses context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/expenses`.
 * Any signed-in user reads; writing is admin, accounting and engineer. Static paths (`suppliers`, `new`)
 * come before `:id/edit`.
 */
export const expensesRoutes: Routes = [
  { path: '', loadComponent: expenseList, title: 'Brasper' },
  { path: 'new', loadComponent: expenseForm, title: 'Brasper', ...canWrite },
  { path: ':id/edit', loadComponent: expenseForm, title: 'Brasper', ...canWrite },
  { path: 'suppliers', loadComponent: supplierList, title: 'Brasper' },
  { path: 'suppliers/new', loadComponent: supplierForm, title: 'Brasper', ...canWrite },
  { path: 'suppliers/:id/edit', loadComponent: supplierForm, title: 'Brasper', ...canWrite },
];
