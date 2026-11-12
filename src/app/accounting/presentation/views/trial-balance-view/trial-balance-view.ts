import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { AccountingStore } from '../../../application/accounting.store';

const today = new Date();

/**
 * The trial balance of a month (`/accounting/trial-balance`): the debit, credit and balance (debit minus credit) each
 * account moved in that month, as the backend sums them, with the totals and whether they match. It is not the balance
 * since the start: the backend only sums the month. Read by admin, accounting and management.
 */
@Component({
  selector: 'app-trial-balance-view',
  imports: [DecimalPipe, MatTableModule, MatIconModule, MatProgressBarModule, TranslatePipe, PageHeader, PeriodSelector],
  templateUrl: './trial-balance-view.html',
  styleUrl: './trial-balance-view.css',
})
export class TrialBalanceView {
  private readonly accountingStore = inject(AccountingStore);

  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly trialBalance = this.accountingStore.trialBalance;
  readonly lines = computed(() => this.trialBalance()?.lines ?? []);
  readonly loading = this.accountingStore.loading;
  readonly error = this.accountingStore.error;
  readonly displayedColumns = ['accountCode', 'accountName', 'debit', 'credit', 'balance'];

  constructor() {
    this.accountingStore.clearError();
    effect(() => {
      const period = this.period();
      untracked(() => this.accountingStore.loadTrialBalance(period));
    });
  }
}
