import { Routes } from '@angular/router';

const expenseList = () => import('./views/expense-list/expense-list').then((m) => m.ExpenseList);

/**
 * Expenses context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/expenses`.
 * Any signed-in user reads; the form and supplier screens come in the next PRs
 * (`new` and `suppliers` go before `:id`).
 */
export const expensesRoutes: Routes = [{ path: '', loadComponent: expenseList, title: 'Brasper' }];
