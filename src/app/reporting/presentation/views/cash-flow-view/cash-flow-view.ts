import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ReportingStore } from '../../../application/reporting.store';
import { clampMonthRange } from '../../../domain/services/cash-flow-figures';
import { CashFlowChart } from '../../components/cash-flow-chart/cash-flow-chart';
import { CashFlowTable } from '../../components/cash-flow-table/cash-flow-table';

export type CashFlowMode = 'WEEKLY' | 'MONTHLY' | 'PROJECTION';

const today = new Date();

/**
 * The cash flow (`/reports/cash-flow`): the weeks of a month, a range of months, or the weeks ahead from today, as the
 * backend calculates it. Read by admin, management and accounting.
 */
@Component({
  selector: 'app-cash-flow-view',
  imports: [
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
    CashFlowChart,
    CashFlowTable,
  ],
  templateUrl: './cash-flow-view.html',
  styleUrl: './cash-flow-view.css',
})
export class CashFlowView {
  private readonly reportingStore = inject(ReportingStore);

  readonly modes: readonly CashFlowMode[] = ['WEEKLY', 'MONTHLY', 'PROJECTION'];
  readonly weekOptions: readonly number[] = [4, 8, 13, 26];

  readonly mode = signal<CashFlowMode>('WEEKLY');
  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly from = signal(new Period(today.getFullYear(), 1));
  readonly to = signal(new Period(today.getFullYear(), 12));
  readonly weeks = signal(13);

  readonly granularity = computed(() => (this.mode() === 'MONTHLY' ? 'month' : 'week'));
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
      switch (this.mode()) {
        case 'WEEKLY': {
          const period = this.period();
          untracked(() => this.reportingStore.loadWeeklyCashFlow(period));
          break;
        }
        case 'MONTHLY': {
          const [from, to] = [this.from(), this.to()];
          untracked(() => this.reportingStore.loadMonthlyCashFlow(from, to));
          break;
        }
        default: {
          const weeks = this.weeks();
          untracked(() => this.reportingStore.loadCashFlowProjection(toIsoDate(new Date()), weeks));
        }
      }
    });
  }

  onFromChange(from: Period): void {
    this.applyRange(clampMonthRange(from, this.to(), 'from'));
  }

  onToChange(to: Period): void {
    this.applyRange(clampMonthRange(this.from(), to, 'to'));
  }

  private applyRange(range: { from: Period; to: Period }): void {
    this.from.set(range.from);
    this.to.set(range.to);
  }
}
