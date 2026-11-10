import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { toFraction } from '../../../../shared/domain/model/percentage';
import { AMOUNT_VALIDATORS, maxTwoDecimals } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { PageHeader } from '../../../../shared/presentation/components/page-header/page-header';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { TreasuryStore } from '../../../application/treasury.store';
import { BankAccount, BankAccountType } from '../../../domain/model/bank-account.entity';
import { LOAN_TYPES, LoanType } from '../../../domain/model/loan.entity';
import { balanceAfterDisbursement } from '../../../domain/services/loan-figures';

/** The backend sets no ceiling on the rate; the form keeps it between 0 and 100 % so a typo cannot slip in. */
export const MAX_RATE_PERCENT = 100;

/** The rate is typed as a yearly percentage with up to 2 decimals (0 % is allowed: a loan without interest). */
export const RATE_VALIDATORS = [Validators.required, Validators.min(0), Validators.max(MAX_RATE_PERCENT), maxTwoDecimals];

/** Loans are in PEN for now (the backend rejects any other currency). */
const LOAN_CURRENCY = 'PEN';

/**
 * Registers a loan (`/treasury/loans/new`, admin and accounting). The account is required and must be in the
 * loan's currency: the disbursement moves its cash (in when received, out when granted). The rate is a yearly
 * percentage that only informs; the interest is whatever the installments say, so they are scheduled from the
 * loan detail. A granted loan may leave the account negative: the backend allows it, so the form only warns.
 */
@Component({
  selector: 'app-loan-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    MoneyPipe,
    PageHeader,
  ],
  templateUrl: './loan-form.html',
  styles: `
    input.amount { text-align: right; }
    .type-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .type-label { font: var(--mat-sys-body-medium); font-weight: 600; }
    .type-help { margin: 0 0 20px; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface-variant); }
    .notice {
      display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 20px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning); font: var(--mat-sys-body-medium);
    }
    .info {
      display: flex; align-items: center; gap: 8px; margin: 4px 0 20px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-info-container); color: var(--brasper-info); font: var(--mat-sys-body-medium);
    }
  `,
})
export class LoanForm extends BaseForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly treasuryStore = inject(TreasuryStore);
  private readonly router = inject(Router);

  readonly types = LOAN_TYPES;
  readonly loading = this.treasuryStore.loading;
  readonly error = this.treasuryStore.error;
  /** Accounts in the loan currency, checking ones first (the same ones that can pay a payable). */
  readonly accounts = computed(() =>
    this.treasuryStore
      .bankAccounts()
      .filter((account) => account.currency === LOAN_CURRENCY)
      .sort((a, b) => this.rank(a) - this.rank(b) || a.id - b.id),
  );

  readonly loanForm = this.formBuilder.group({
    type: this.formBuilder.nonNullable.control<LoanType>(LoanType.RECEIVED, Validators.required),
    counterparty: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    principal: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    interestRate: this.formBuilder.control<number | null>(null, RATE_VALIDATORS),
    disbursedOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    bankAccountId: this.formBuilder.control<number | null>(null, Validators.required),
  });

  private readonly value = toSignal(this.loanForm.valueChanges, { initialValue: this.loanForm.getRawValue() });
  readonly isReceived = computed(() => this.value().type === LoanType.RECEIVED);
  /** The chosen account, once the accounts are loaded. */
  readonly account = computed(() => this.treasuryStore.getBankAccountById(this.value().bankAccountId ?? null));
  /** Balance the account would have after a granted loan, when that is below zero (else null: no warning). */
  readonly negativeBalance = computed(() => {
    const { type, principal } = this.value();
    const account = this.account();
    if (!account || type !== LoanType.GRANTED || !(Number(principal) > 0)) {
      return null;
    }
    const balance = balanceAfterDisbursement(type, account.currentBalance, Number(principal));
    return balance < 0 ? balance : null;
  });

  constructor() {
    super();
    // The accounts may arrive after the form: propose the first one once, so the account is never left unset.
    effect(() => {
      const [first] = this.accounts();
      const control = this.loanForm.controls.bankAccountId;
      if (first && control.value === null) {
        control.setValue(first.id);
      }
    });
  }

  ngOnInit(): void {
    this.treasuryStore.clearError();
    if (this.treasuryStore.bankAccounts().length === 0) {
      this.treasuryStore.loadBankAccounts();
    }
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }

  onSubmit(): void {
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      return;
    }
    const value = this.loanForm.getRawValue();
    this.treasuryStore.registerLoan(
      {
        type: value.type,
        counterparty: value.counterparty,
        principal: Math.round(Number(value.principal) * 100) / 100,
        currency: LOAN_CURRENCY,
        interestRate: toFraction(Number(value.interestRate)),
        disbursedOn: toIsoDate(value.disbursedOn!),
        bankAccountId: value.bankAccountId!,
      },
      ['/treasury/loans'],
    );
  }

  onCancel(): void {
    void this.router.navigate(['/treasury/loans']);
  }

  private rank(account: BankAccount): number {
    return account.type === BankAccountType.CHECKING ? 0 : 1;
  }
}
