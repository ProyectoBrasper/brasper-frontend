import { DecimalPipe } from '@angular/common';
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
import { BankAccount, BankAccountType } from '../../../../treasury/domain/model/bank-account.entity';
import { PayTaxReturnCommand } from '../../../domain/model/tax-return.commands';
import { TaxReturn } from '../../../domain/model/tax-return.entity';

export interface PayTaxReturnData {
  taxReturn: TaxReturn;
  /** The month, already translated ("Octubre 2026"). */
  label: string;
  bankAccounts: BankAccount[];
}

/** Accounts that can pay: those in the return's currency, checking ones first. */
export function taxPaymentAccounts(accounts: readonly BankAccount[], currency: string): BankAccount[] {
  const rank = (a: BankAccount) => (a.type === BankAccountType.CHECKING ? 0 : 1);
  return accounts.filter((a) => a.currency === currency).sort((a, b) => rank(a) - rank(b) || a.id - b.id);
}

/**
 * Pays a tax return: the account is required (the backend answers 400 when it does not exist). The total leaves that
 * account; if it would leave it negative the dialog only warns (the backend allows it). A return with nothing to pay
 * is only marked as paid. Closes with the command.
 */
@Component({
  selector: 'app-pay-tax-return-dialog',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './pay-tax-return-dialog.html',
  styles: `
    mat-form-field { width: 100%; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .notice, .info {
      display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 0; padding: 12px 16px;
      border-radius: var(--brasper-radius-md); font: var(--mat-sys-body-medium);
    }
    .notice { background: var(--brasper-warning-container); color: var(--brasper-warning); }
    .info { background: var(--brasper-info-container); color: var(--brasper-info); }
  `,
})
export class PayTaxReturnDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<PayTaxReturnDialog, PayTaxReturnCommand>>(MatDialogRef);
  readonly data = inject<PayTaxReturnData>(MAT_DIALOG_DATA);

  readonly taxReturn = this.data.taxReturn;
  readonly accounts = taxPaymentAccounts(this.data.bankAccounts, this.taxReturn.currency);
  readonly nothingToPay = this.taxReturn.totalPayable <= 0;

  readonly paymentForm = this.formBuilder.group({
    paidOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    bankAccountId: this.formBuilder.control<number | null>(this.accounts[0]?.id ?? null, Validators.required),
  });

  private readonly value = toSignal(this.paymentForm.valueChanges, { initialValue: this.paymentForm.getRawValue() });
  /** Balance the account would have after paying, when that is below zero (else null: no warning). */
  readonly negativeBalance = computed(() => {
    const account = this.accounts.find((a) => a.id === this.value().bankAccountId);
    if (!account || this.nothingToPay) {
      return null;
    }
    const balance = (Math.round(account.currentBalance * 100) - Math.round(this.taxReturn.totalPayable * 100)) / 100;
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
