import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { RegisterContributionCommand } from '../../../domain/model/partner.commands';
import { Partner } from '../../../domain/model/partner.entity';

export interface RegisterContributionData {
  partner: Partner;
  bankAccounts: BankAccount[];
}

/** Contributions are in PEN for now (the backend rejects any other currency with a 422). */
const CONTRIBUTION_CURRENCY = 'PEN';

/** Accounts that can take a contribution: those in PEN, checking ones first. */
export function contributionAccounts(accounts: readonly BankAccount[]): BankAccount[] {
  const rank = (a: BankAccount) => (a.type === BankAccountType.CHECKING ? 0 : 1);
  return accounts.filter((a) => a.currency === CONTRIBUTION_CURRENCY).sort((a, b) => rank(a) - rank(b) || a.id - b.id);
}

/**
 * Registers money a partner put into the company. The account is required here (the backend leaves it optional, but
 * without one the contribution moves no cash and posts no entry); the amount comes into that account. A reimbursable
 * contribution is a debt to the partner, not capital. An expense the partner paid out of pocket is registered in
 * Expenses, not here. Closes with the command.
 */
@Component({
  selector: 'app-register-contribution-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './register-contribution-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0 0 20px;
      padding: 12px 14px; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--brasper-radius-md);
    }
    .toggle-row > span { display: flex; flex-direction: column; gap: 2px; }
    .toggle-row small { color: var(--mat-sys-on-surface-variant); }
    .info {
      display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-info-container); color: var(--brasper-info); font: var(--mat-sys-body-medium);
    }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class RegisterContributionDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<RegisterContributionDialog, RegisterContributionCommand>>(MatDialogRef);
  readonly data = inject<RegisterContributionData>(MAT_DIALOG_DATA);

  readonly partner = this.data.partner;
  readonly accounts = contributionAccounts(this.data.bankAccounts);

  readonly contributionForm = this.formBuilder.group({
    contributedOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    amount: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    bankAccountId: this.formBuilder.control<number | null>(this.accounts[0]?.id ?? null, Validators.required),
    reimbursable: this.formBuilder.nonNullable.control(false),
    concept: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
  });

  onSave(): void {
    if (this.contributionForm.invalid) {
      this.contributionForm.markAllAsTouched();
      return;
    }
    const value = this.contributionForm.getRawValue();
    this.dialogRef.close({
      contributedOn: toIsoDate(value.contributedOn!),
      amount: Math.round(Number(value.amount) * 100) / 100,
      currency: CONTRIBUTION_CURRENCY,
      reimbursable: value.reimbursable,
      bankAccountId: value.bankAccountId!,
      concept: value.concept.trim() || null,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }
}
