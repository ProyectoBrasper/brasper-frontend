import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { fromIsoDate } from '../../../../shared/domain/model/iso-date';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ReportingStore } from '../../../application/reporting.store';
import { balancesDate } from '../../../domain/services/dashboard-figures';
import { AlertsPanel } from '../../components/alerts-panel/alerts-panel';
import { CashFlowChart } from '../../components/cash-flow-chart/cash-flow-chart';
import { KpiCard } from '../../components/kpi-card/kpi-card';

const today = new Date();

/**
 * The summary of a month (`/dashboard`): headline figures, its weekly cash flow and its alerts, as the backend
 * calculates them. Read by admin, management and accounting, for whom it is the home page.
 */
@Component({
  selector: 'app-dashboard-view',
  imports: [DatePipe, RouterLink, MatIconModule, MatProgressBarModule, TranslatePipe, MoneyPipe, PageHeader, PeriodSelector, KpiCard, AlertsPanel, CashFlowChart],
  templateUrl: './dashboard-view.html',
  styleUrl: './dashboard-view.css',
})
export class DashboardView {
  private readonly reportingStore = inject(ReportingStore);
  private readonly translate = inject(TranslateService);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly dashboard = this.reportingStore.dashboard;
  readonly cashFlow = this.reportingStore.cashFlow;
  readonly loading = this.reportingStore.loading;
  readonly error = this.reportingStore.error;
  /** The date of the balances as a `Date`, or null when they are today's. */
  readonly balancesOn = computed(() => fromIsoDate(balancesDate(this.period())));

  constructor() {
    this.reportingStore.clearError();
    effect(() => {
      const period = this.period();
      untracked(() => {
        this.reportingStore.loadDashboard(period);
        this.reportingStore.loadWeeklyCashFlow(period);
      });
    });
  }

  periodLabel(): string {
    return this.period().label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  }
}
