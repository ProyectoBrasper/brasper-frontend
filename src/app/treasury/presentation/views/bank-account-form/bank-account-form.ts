import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { maxTwoDecimals } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { TreasuryStore } from '../../../application/treasury.store';
import { Bank, BANK_ACCOUNT_TYPES, BankAccountType, BANKS } from '../../../domain/model/bank-account.entity';

/**
 * Backend rule (`@PositiveOrZero @Digits(integer = 12, fraction = 2)`): an opening balance can be zero, never
 * negative, with up to 12 integer digits and 2 decimals.
 */
export const OPENING_BALANCE_VALIDATORS = [
  Validators.required,
  Validators.min(0),
  Validators.max(999_999_999_999.99),
  maxTwoDecimals,
];

/**
 * Opens a bank account or petty cash (`/treasury/bank-accounts/new`, admin and accounting). The currency is
 * PEN (the backend rejects anything else for now) and the opening date is required by the backend. The
 * current balance is never typed: it comes from the movements.
 */
@Component({
  selector: 'app-bank-account-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    PageHeader,
  ],
  templateUrl: './bank-account-form.html',
  styles: `
    input.amount { text-align: right; }
    .info {
      display: flex; align-items: center; gap: 8px; margin: 4px 0 20px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-info-container); color: var(--brasper-info);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class BankAccountForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly router = inject(Router);

  readonly banks = BANKS;
  readonly types = BANK_ACCOUNT_TYPES;
  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;

  readonly accountForm = this.formBuilder.group({
    bank: this.formBuilder.nonNullable.control<Bank>(Bank.BCP, Validators.required),
    type: this.formBuilder.nonNullable.control<BankAccountType>(BankAccountType.CHECKING, Validators.required),
    accountNumber: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    currency: this.formBuilder.nonNullable.control({ value: 'PEN', disabled: true }),
    openingBalance: this.formBuilder.control<number | null>(null, OPENING_BALANCE_VALIDATORS),
    openedOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
  });

  ngOnInit(): void {
    this.treasuryStore.clearError();
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const value = this.accountForm.getRawValue();
    this.treasuryStore.openBankAccount(
      {
        bank: value.bank,
        accountNumber: value.accountNumber,
        type: value.type,
        currency: value.currency,
        openingBalance: Math.round(Number(value.openingBalance) * 100) / 100,
        openedOn: toIsoDate(value.openedOn!),
      },
      ['/treasury/bank-accounts'],
    );
  }

  onCancel(): void {
    void this.router.navigate(['/treasury/bank-accounts']);
  }
}
