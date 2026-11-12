import { Routes } from '@angular/router';
import { BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { provideCharts } from 'ng2-charts';

const cashFlowView = () => import('./views/cash-flow-view/cash-flow-view').then((m) => m.CashFlowView);
const incomeStatementView = () =>
  import('./views/income-statement-view/income-statement-view').then((m) => m.IncomeStatementView);
const balanceSheetView = () => import('./views/balance-sheet-view/balance-sheet-view').then((m) => m.BalanceSheetView);
const dashboardView = () => import('./views/dashboard-view/dashboard-view').then((m) => m.DashboardView);
const projectProfitabilityView = () =>
  import('./views/project-profitability-view/project-profitability-view').then((m) => m.ProjectProfitabilityView);

/** Only what the cash flow chart draws, so the rest of Chart.js stays out of the bundle. Declared in this lazy file to keep it out of the initial load. */
const charts = provideCharts({
  registerables: [BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip],
});

/**
 * Reporting context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/reports` (admin, management and
 * accounting read, like the backend).
 */
export const reportingRoutes: Routes = [
  { path: '', redirectTo: 'cash-flow', pathMatch: 'full' },
  { path: 'cash-flow', loadComponent: cashFlowView, title: 'Brasper', providers: [charts] },
  { path: 'income-statement', loadComponent: incomeStatementView, title: 'Brasper' },
  { path: 'balance-sheet', loadComponent: balanceSheetView, title: 'Brasper' },
  { path: 'project-profitability', loadComponent: projectProfitabilityView, title: 'Brasper' },
];

/** The home page of those who read reports, at `/dashboard`. */
export const dashboardRoutes: Routes = [{ path: '', loadComponent: dashboardView, title: 'Brasper', providers: [charts] }];
