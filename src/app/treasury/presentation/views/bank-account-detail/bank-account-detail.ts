import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import { Period } from '../../../../shared/domain/model/period';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/presentation/components/period-selector/period-selector';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { BankAccount } from '../../../domain/model/bank-account.entity';
import { RegisterAdjustmentCommand, TransferFundsCommand } from '../../../domain/model/cash-movement.commands';
import { CashMovement } from '../../../domain/model/cash-movement.entity';
import { RegisterAdjustmentDialog } from '../../components/register-adjustment-dialog/register-adjustment-dialog';
import { TransferFundsData, TransferFundsDialog } from '../../components/transfer-funds-dialog/transfer-funds-dialog';

const today = new Date();

/**
 * One account (`/treasury/bank-accounts/:id`): balances and the movements of the chosen month with their
 * totals. Admin and accounting register adjustments (the only way to correct a balance) and transfers.
 */
@Component({
  selector: 'app-bank-account-detail',
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    PeriodSelector,
  ],
  templateUrl: './bank-account-detail.html',
  styleUrl: './bank-account-detail.css',
})
export class BankAccountDetail {
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly dialog = inject(MatDialog);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input.required<string>();

  readonly accountId = computed(() => Number(this.id()));
  readonly account = computed(() => this.treasuryStore.getBankAccountById(this.accountId()));
  readonly period = signal(new Period(today.getFullYear(), today.getMonth() + 1));
  readonly totals = this.treasuryStore.movementTotals;
  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;
  readonly canWrite = this.treasuryStore.canWrite;
  readonly columns = ['occurredOn', 'concept', 'source', 'inflow', 'outflow'];

  readonly paginator = viewChild(MatPaginator);

  readonly dataSource = computed(() => {
    const source = new MatTableDataSource<CashMovement>(this.treasuryStore.movements());
    const paginator = this.paginator();
    if (paginator) {
      source.paginator = paginator;
    }
    return source;
  });

  constructor() {
    // Fresh balance of this account (it may be opened directly by URL), and every account for the transfer.
    effect(() => {
      const id = this.accountId();
      untracked(() => {
        this.treasuryStore.clearError();
        this.treasuryStore.loadBankAccount(id);
        if (this.treasuryStore.bankAccounts().length <= 1) {
          this.treasuryStore.loadBankAccounts();
        }
      });
    });
    effect(() => {
      const id = this.accountId();
      const period = this.period();
      untracked(() => this.treasuryStore.loadMovements(id, period));
    });
  }

  icon(account: BankAccount): string {
    return account.type === 'PETTY_CASH' ? 'account_balance_wallet' : 'account_balance';
  }

  onAdjust(account: BankAccount): void {
    this.dialog
      .open<RegisterAdjustmentDialog, BankAccount, RegisterAdjustmentCommand>(RegisterAdjustmentDialog, {
        data: account,
        width: '520px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.registerAdjustment(account.id, command);
        }
      });
  }

  onTransfer(account: BankAccount): void {
    this.dialog
      .open<TransferFundsDialog, TransferFundsData, TransferFundsCommand>(TransferFundsDialog, {
        data: { accounts: this.treasuryStore.bankAccounts(), fromAccountId: account.id },
        width: '520px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.transferFunds(command);
        }
      });
  }
}
