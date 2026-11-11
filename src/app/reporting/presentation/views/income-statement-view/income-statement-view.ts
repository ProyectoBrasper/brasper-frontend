import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ReportingStore } from '../../../application/reporting.store';
import { clampMonthRange } from '../../../domain/services/cash-flow-figures';

const today = new Date();

/** A line of the statement: a figure the backend sent, or a result that adds up the ones above it. */
interface IncomeStatementRow {
  label: string;
  amount: number;
  kind: 'item' | 'subtotal' | 'total';
}

/**
 * Results over a range of months (`/reports/income-statement`), from revenue to net profit, as the backend calculates
 * them. Read by admin, management and accounting.
 */
@Component({
  selector: 'app-income-statement-view',
  imports: [MatIconModule, MatProgressBarModule, TranslatePipe, MoneyPipe, PageHeader, PeriodSelector],
  templateUrl: './income-statement-view.html',
  styleUrl: './income-statement-view.css',
})
export class IncomeStatementView {
  private readonly reportingStore = inject(ReportingStore);

  readonly from = signal(new Period(today.getFullYear(), 1));
  readonly to = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly statement = this.reportingStore.incomeStatement;
  readonly loading = this.reportingStore.loading;
  readonly error = this.reportingStore.error;

  readonly rows = computed<IncomeStatementRow[]>(() => {
    const statement = this.statement();
    if (!statement) {
      return [];
    }
    return [
      { label: 'revenue', amount: statement.revenue, kind: 'item' },
      { label: 'directCosts', amount: statement.directCosts, kind: 'item' },
      { label: 'grossProfit', amount: statement.grossProfit, kind: 'subtotal' },
      { label: 'operatingExpenses', amount: statement.operatingExpenses, kind: 'item' },
      { label: 'operatingProfit', amount: statement.operatingProfit, kind: 'subtotal' },
      { label: 'financialExpenses', amount: statement.financialExpenses, kind: 'item' },
      { label: 'profitBeforeTax', amount: statement.profitBeforeTax, kind: 'subtotal' },
      { label: 'incomeTax', amount: statement.incomeTax, kind: 'item' },
      { label: 'netProfit', amount: statement.netProfit, kind: 'total' },
    ];
  });

  constructor() {
    this.reportingStore.clearError();
    effect(() => {
      const [from, to] = [this.from(), this.to()];
      untracked(() => this.reportingStore.loadIncomeStatement(from, to));
    });
  }

  onFromChange(from: Period): void {
    this.applyRange(clampMonthRange(from, this.to(), 'from', Number.POSITIVE_INFINITY));
  }

  onToChange(to: Period): void {
    this.applyRange(clampMonthRange(this.from(), to, 'to', Number.POSITIVE_INFINITY));
  }

  private applyRange(range: { from: Period; to: Period }): void {
    this.from.set(range.from);
    this.to.set(range.to);
  }
}
