import { Routes } from '@angular/router';
import { BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { provideCharts } from 'ng2-charts';

const cashFlowView = () => import('./views/cash-flow-view/cash-flow-view').then((m) => m.CashFlowView);

/** Only what the cash flow chart draws, so the rest of Chart.js stays out of the bundle. */
const charts = provideCharts({
  registerables: [BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip],
});

/**
 * Reporting context routes (docs/uml-frontend/00-app.puml), lazy loaded under `/reports` (admin, management and
 * accounting read, like the backend). The other reports come with their screens.
 */
export const reportingRoutes: Routes = [
  { path: '', redirectTo: 'cash-flow', pathMatch: 'full' },
  { path: 'cash-flow', loadComponent: cashFlowView, title: 'Brasper', providers: [charts] },
];
