import { Routes } from '@angular/router';

const cashFlowView = () => import('./views/cash-flow-view/cash-flow-view').then((m) => m.CashFlowView);

/**
 * Reporting context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/reports` (admin, management and
 * accounting read, like the backend). The other reports come with their screens.
 */
export const reportingRoutes: Routes = [
  { path: '', redirectTo: 'cash-flow', pathMatch: 'full' },
  { path: 'cash-flow', loadComponent: cashFlowView, title: 'Brasper' },
];
