import { DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { toPercent } from '../../../../shared/domain/model/percentage';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { StatusChip } from '../../../../shared/presentation/components/status-chip/status-chip';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { PayInstallmentCommand, ScheduleInstallmentCommand } from '../../../domain/model/loan.commands';
import { InstallmentStatus, Loan, LoanInstallment } from '../../../domain/model/loan.entity';
import {
  installmentTotals,
  paidShare,
  sortedInstallments,
  unscheduledPrincipal,
} from '../../../domain/services/loan-figures';
import { PayInstallmentData, PayInstallmentDialog } from '../../components/pay-installment-dialog/pay-installment-dialog';
import { ScheduleInstallmentDialog } from '../../components/schedule-installment-dialog/schedule-installment-dialog';

/**
 * One loan (`/treasury/loans/:id`): its figures and installments, numbered by due date, with their totals. An
 * unpaid installment past its due date shows as overdue (the backend has no such status). Admin and accounting
 * schedule installments while capital is left to schedule, and pay them whole; management only reads.
 */
@Component({
  selector: 'app-loan-detail',
  imports: [
    DatePipe,
    PercentPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
    StatusChip,
  ],
  templateUrl: './loan-detail.html',
  styleUrl: './loan-detail.css',
})
export class LoanDetail {
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  /** Route parameter (`:id`), bound by `withComponentInputBinding`. */
  readonly id = input.required<string>();

  readonly loanId = computed(() => Number(this.id()));
  readonly loan = computed(() => this.treasuryStore.getLoanById(this.loanId()));
  readonly installments = computed(() => {
    const loan = this.loan();
    return loan ? sortedInstallments(loan) : [];
  });
  readonly totals = computed(() => installmentTotals(this.installments()));
  readonly paidCount = computed(() => this.installments().filter((i) => i.paid).length);
  readonly paidShare = computed(() => {
    const loan = this.loan();
    return loan ? paidShare(loan) : 0;
  });
  readonly unscheduled = computed(() => {
    const loan = this.loan();
    return loan ? unscheduledPrincipal(loan) : 0;
  });
  readonly today = toIsoDate(new Date());
  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;
  readonly canWrite = this.treasuryStore.canWrite;
  readonly columns = computed(() => {
    const columns = ['number', 'dueOn', 'principal', 'interest', 'total', 'status', 'paidOn'];
    return this.canWrite() ? [...columns, 'actions'] : columns;
  });

  constructor() {
    // Fresh loan (it may be opened directly by URL) and the accounts, for their names and to pay.
    effect(() => {
      const id = this.loanId();
      untracked(() => {
        this.treasuryStore.clearError();
        this.treasuryStore.loadLoan(id);
        if (this.treasuryStore.bankAccounts().length === 0) {
          this.treasuryStore.loadBankAccounts();
        }
      });
    });
  }

  isOverdue(installment: LoanInstallment): boolean {
    return installment.status(this.today) === InstallmentStatus.OVERDUE;
  }

  /** "12.00 % anual" (the API sends a fraction). */
  rateLabel(loan: Loan): string {
    return this.translate.instant('loans.rateValue', { rate: toPercent(loan.interestRate).toFixed(2) });
  }

  /** "BBVA · 0011-0234-0200123456", or empty while the accounts load. */
  accountLabel(loan: Loan): string {
    const account = this.treasuryStore.getBankAccountById(loan.bankAccountId);
    return account ? `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}` : '';
  }

  onSchedule(loan: Loan): void {
    this.dialog
      .open<ScheduleInstallmentDialog, Loan, ScheduleInstallmentCommand>(ScheduleInstallmentDialog, {
        data: loan,
        width: '520px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.scheduleInstallment(loan.id, command);
        }
      });
  }

  onPay(loan: Loan, installment: LoanInstallment, number: number): void {
    this.dialog
      .open<PayInstallmentDialog, PayInstallmentData, PayInstallmentCommand>(PayInstallmentDialog, {
        data: { loan, installment, number, bankAccounts: this.treasuryStore.bankAccounts() },
        width: '520px',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          this.treasuryStore.payInstallment(loan.id, installment.id, command);
        }
      });
  }
}
