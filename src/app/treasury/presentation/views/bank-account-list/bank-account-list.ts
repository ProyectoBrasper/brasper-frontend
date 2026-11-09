import { Component, computed, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';

/** Tone of the account type tag (DESIGN.md §4): checking info, detractions warning, petty cash neutral. */
const TYPE_TONE: Record<BankAccountType, string> = {
  [BankAccountType.CHECKING]: 'info',
  [BankAccountType.DETRACTIONS]: 'warning',
  [BankAccountType.PETTY_CASH]: 'neutral',
};

/**
 * Bank accounts and petty cash (`/treasury/bank-accounts`) with the total cash of the company. Balances are
 * calculated by the backend from the movements. Admin and accounting open accounts; management only reads.
 * Movements, transfers and adjustments come with the account detail.
 */
@Component({
  selector: 'app-bank-account-list',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, TranslatePipe, MoneyPipe, PageHeader],
  templateUrl: './bank-account-list.html',
  styleUrl: './bank-account-list.css',
})
export class BankAccountList implements OnInit {
  private readonly treasuryStore = inject(TreasuryStore);

  readonly accounts = this.treasuryStore.bankAccounts;
  readonly totalBalance = this.treasuryStore.totalBalance;
  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;
  readonly canWrite = this.treasuryStore.canWrite;
  readonly penCount = computed(() => this.accounts().filter((account) => account.currency === 'PEN').length);

  ngOnInit(): void {
    this.treasuryStore.loadBankAccounts();
  }

  tone(account: BankAccount): string {
    return TYPE_TONE[account.type] ?? 'neutral';
  }

  icon(account: BankAccount): string {
    return account.type === BankAccountType.PETTY_CASH ? 'account_balance_wallet' : 'account_balance';
  }
}
