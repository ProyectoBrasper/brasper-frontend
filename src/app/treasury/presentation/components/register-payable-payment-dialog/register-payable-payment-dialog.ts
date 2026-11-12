import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { RegisterPayablePaymentCommand } from '../../../domain/model/payable.commands';
import { Payable } from '../../../domain/model/payable.entity';

export interface RegisterPayablePaymentData {
  payable: Payable;
  bankAccounts: BankAccount[];
}

/** Accounts that can pay: those in the payable currency (the backend rejects a mismatch), checking ones first. */
export function payableAccounts(accounts: readonly BankAccount[], currency: string): BankAccount[] {
  const rank = (a: BankAccount) => (a.type === BankAccountType.CHECKING ? 0 : 1);
  return accounts.filter((a) => a.currency === currency).sort((a, b) => rank(a) - rank(b) || a.id - b.id);
}

/**
 * Pays all or part of a payable. Backend rules: the account is required, the amount is positive and not above
 * the balance (409 otherwise). Proposes the whole balance. Closes with the command.
 */
@Component({
  selector: 'app-register-payable-payment-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MoneyPipe,
    TranslatePipe,
  ],
  templateUrl: './register-payable-payment-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class RegisterPayablePaymentDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<RegisterPayablePaymentDialog, RegisterPayablePaymentCommand>>(MatDialogRef);
  readonly data = inject<RegisterPayablePaymentData>(MAT_DIALOG_DATA);

  readonly payable = this.data.payable;
  readonly accounts = payableAccounts(this.data.bankAccounts, this.payable.currency);

  readonly paymentForm = this.formBuilder.group({
    paidOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    amount: this.formBuilder.control<number | null>(this.payable.balance, [
      ...AMOUNT_VALIDATORS,
      Validators.max(this.payable.balance),
    ]),
    bankAccountId: this.formBuilder.control<number | null>(this.accounts[0]?.id ?? null, Validators.required),
  });

  onSave(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    this.dialogRef.close({
      paidOn: toIsoDate(value.paidOn!),
      amount: Math.round(Number(value.amount) * 100) / 100,
      bankAccountId: value.bankAccountId!,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }
}
