import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ReportingStore } from '../../../application/reporting.store';
import { CashFlowTable } from '../../components/cash-flow-table/cash-flow-table';

const today = new Date();

/**
 * The weekly cash flow of a month (`/reports/cash-flow`): what happened and what is scheduled, week by week, as the
 * backend calculates it. Read by admin, management and accounting.
 */
@Component({
  selector: 'app-cash-flow-view',
  imports: [MatIconModule, MatProgressBarModule, TranslatePipe, MoneyPipe, PageHeader, PeriodSelector, CashFlowTable],
  templateUrl: './cash-flow-view.html',
  styleUrl: './cash-flow-view.css',
})
export class CashFlowView {
  private readonly reportingStore = inject(ReportingStore);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly report = this.reportingStore.cashFlow;
  readonly loading = this.reportingStore.loading;
  readonly error = this.reportingStore.error;
  /** A range that starts later opens with today's cash: the backend does not chain what is scheduled before it. */
  readonly startsInFuture = computed(() => {
    const report = this.report();
    return report !== null && report.from > toIsoDate(new Date());
  });

  constructor() {
    this.reportingStore.clearError();
    effect(() => {
      const period = this.period();
      untracked(() => this.reportingStore.loadWeeklyCashFlow(period));
    });
  }
}
