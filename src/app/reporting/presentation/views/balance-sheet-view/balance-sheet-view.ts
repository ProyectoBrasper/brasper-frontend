import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AccountingStore } from '../../../../accounting/application/accounting.store';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ReportingStore } from '../../../application/reporting.store';
import { BalanceSheetAmounts } from '../../../domain/model/balance-sheet';
import { statementRows } from '../../../domain/services/statement-figures';
import { StatementSection } from '../../components/statement-section/statement-section';

const today = new Date();

/**
 * The position at the end of a month (`/reports/balance-sheet`), by account, as the backend calculates it. The backend
 * only sends codes, so the names come from the chart of accounts. Read by admin, management and accounting.
 */
@Component({
  selector: 'app-balance-sheet-view',
  imports: [DatePipe, MatIconModule, MatProgressBarModule, TranslatePipe, MoneyPipe, PageHeader, PeriodSelector, StatusChip, StatementSection],
  templateUrl: './balance-sheet-view.html',
  styleUrl: './balance-sheet-view.css',
})
export class BalanceSheetView implements OnInit {
  private readonly reportingStore = inject(ReportingStore);
  private readonly accountingStore = inject(AccountingStore);
  private readonly translate = inject(TranslateService);
  private readonly language = toSignal(this.translate.onLangChange);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly sheet = this.reportingStore.balanceSheet;
  readonly loading = computed(() => this.reportingStore.loading() || this.accountingStore.loading());
  readonly error = computed(() => this.reportingStore.error() ?? this.accountingStore.error());

  readonly assets = computed(() => this.rows(this.sheet()?.assets ?? {}));
  readonly liabilities = computed(() => this.rows(this.sheet()?.liabilities ?? {}));
  readonly equity = computed(() => this.rows(this.sheet()?.equity ?? {}));

  constructor() {
    this.reportingStore.clearError();
    effect(() => {
      const period = this.period();
      untracked(() => this.reportingStore.loadBalanceSheet(period));
    });
  }

  ngOnInit(): void {
    this.accountingStore.clearError();
    if (this.accountingStore.ledgerAccounts().length === 0) {
      this.accountingStore.loadLedgerAccounts();
    }
  }

  private rows(amounts: BalanceSheetAmounts) {
    // Read so the label of the unclosed result follows a language change.
    this.language();
    return statementRows(
      amounts,
      (code) => this.accountingStore.getLedgerAccountByCode(code)?.name,
      this.translate.instant('balanceSheet.result'),
    );
  }
}
