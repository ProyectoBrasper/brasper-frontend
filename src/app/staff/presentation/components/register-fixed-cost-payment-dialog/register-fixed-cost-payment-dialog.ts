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
import { Period } from '../../../../shared/domain/model/period';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BankAccount, BankAccountType } from '../../../../treasury/domain/model/bank-account.entity';
import { RegisterFixedCostPaymentCommand } from '../../../domain/model/fixed-cost.commands';
import { FixedCost } from '../../../domain/model/fixed-cost.entity';

export interface RegisterFixedCostPaymentData {
  fixedCost: FixedCost;
  period: Period;
  pending: number;
  bankAccounts: BankAccount[];
}

/** Accounts that can pay a fixed cost: any account in the cost currency, checking accounts first. */
export function payingAccounts(accounts: readonly BankAccount[], currency: string): BankAccount[] {
  const rank = (a: BankAccount) => (a.type === BankAccountType.CHECKING ? 0 : a.type === BankAccountType.PETTY_CASH ? 1 : 2);
  return accounts.filter((a) => a.currency === currency).sort((a, b) => rank(a) - rank(b) || a.id - b.id);
}

/**
 * Registers a payment of a fixed cost for the month shown in the list. Proposes the amount still owed;
 * the account is optional (without one Treasury posts no cash movement). Closes with the command.
 */
@Component({
  selector: 'app-register-fixed-cost-payment-dialog',
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
  templateUrl: './register-fixed-cost-payment-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class RegisterFixedCostPaymentDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<RegisterFixedCostPaymentDialog, RegisterFixedCostPaymentCommand>>(MatDialogRef);
  readonly data = inject<RegisterFixedCostPaymentData>(MAT_DIALOG_DATA);

  readonly cost = this.data.fixedCost;
  readonly periodLabel = this.data.period.label(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE');
  readonly accounts = payingAccounts(this.data.bankAccounts, this.cost.currency);

  readonly paymentForm = this.formBuilder.group({
    paidOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    amount: this.formBuilder.control<number | null>(this.data.pending > 0 ? this.data.pending : null, AMOUNT_VALIDATORS),
    bankAccountId: this.formBuilder.control<number | null>(this.accounts[0]?.id ?? null),
    notes: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
  });

  onSave(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    this.dialogRef.close({
      paidOn: toIsoDate(value.paidOn!),
      year: this.data.period.year,
      month: this.data.period.month,
      amount: Math.round(Number(value.amount) * 100) / 100,
      bankAccountId: value.bankAccountId ?? null,
      notes: value.notes,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }
}
