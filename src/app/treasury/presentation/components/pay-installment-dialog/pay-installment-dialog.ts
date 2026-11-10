import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { PayInstallmentCommand } from '../../../domain/model/loan.commands';
import { Loan, LoanInstallment, LoanType } from '../../../domain/model/loan.entity';
import { balanceAfterInstallment } from '../../../domain/services/loan-figures';

export interface PayInstallmentData {
  loan: Loan;
  installment: LoanInstallment;
  /** Its position in the table (1 = earliest due date). */
  number: number;
  bankAccounts: BankAccount[];
}

/**
 * Accounts that can take the payment: those in the loan currency (the backend rejects a mismatch), the loan's own
 * account first, then checking ones.
 */
export function installmentAccounts(accounts: readonly BankAccount[], loan: Loan): BankAccount[] {
  const rank = (a: BankAccount) => (a.id === loan.bankAccountId ? 0 : a.type === BankAccountType.CHECKING ? 1 : 2);
  return accounts.filter((a) => a.currency === loan.currency).sort((a, b) => rank(a) - rank(b) || a.id - b.id);
}

/**
 * Pays a whole installment (capital plus interest). The money leaves the account when the loan was received and
 * comes in when it was granted. The date is free (today by default). If paying would leave the account negative,
 * it only warns: the backend allows it. Closes with the command.
 */
@Component({
  selector: 'app-pay-installment-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MoneyPipe,
    TranslatePipe,
  ],
  templateUrl: './pay-installment-dialog.html',
  styles: `
    mat-form-field { width: 100%; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .notice {
      display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 0; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning); font: var(--mat-sys-body-medium);
    }
  `,
})
export class PayInstallmentDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<PayInstallmentDialog, PayInstallmentCommand>>(MatDialogRef);
  readonly data = inject<PayInstallmentData>(MAT_DIALOG_DATA);

  readonly loan = this.data.loan;
  readonly installment = this.data.installment;
  readonly accounts = installmentAccounts(this.data.bankAccounts, this.loan);
  readonly isReceived = this.loan.type === LoanType.RECEIVED;

  readonly paymentForm = this.formBuilder.group({
    paidOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    bankAccountId: this.formBuilder.control<number | null>(this.accounts[0]?.id ?? null, Validators.required),
  });

  private readonly value = toSignal(this.paymentForm.valueChanges, { initialValue: this.paymentForm.getRawValue() });
  /** Balance the account would have after paying, when that is below zero (else null: no warning). */
  readonly negativeBalance = computed(() => {
    const account = this.accounts.find((a) => a.id === this.value().bankAccountId);
    if (!account) {
      return null;
    }
    const balance = balanceAfterInstallment(this.loan.type, account.currentBalance, this.installment.total());
    return balance < 0 ? balance : null;
  });

  onSave(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    this.dialogRef.close({ paidOn: toIsoDate(value.paidOn!), bankAccountId: value.bankAccountId! });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }
}
