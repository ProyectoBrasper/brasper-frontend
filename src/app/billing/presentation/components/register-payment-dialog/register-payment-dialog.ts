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
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BankAccount, BankAccountType } from '../../../../treasury/domain/model/bank-account.entity';
import { Invoice } from '../../../domain/model/invoice.entity';
import { InvoicePayment, InvoicePaymentType } from '../../../domain/model/invoice-payment.entity';
import {
  applicablePaymentTypes,
  needsBankAccount,
  suggestedPaymentAmount,
} from '../../../domain/services/payment-rules';

export interface RegisterPaymentData {
  invoice: Invoice;
  payments: InvoicePayment[];
  bankAccounts: BankAccount[];
}

/** Account proposed for each payment type: the detractions account for detractions, a checking one otherwise. */
const PREFERRED_ACCOUNT_TYPE: Record<InvoicePaymentType, BankAccountType | null> = {
  [InvoicePaymentType.NET_DEPOSIT]: BankAccountType.CHECKING,
  [InvoicePaymentType.DETRACTION_DEPOSIT]: BankAccountType.DETRACTIONS,
  [InvoicePaymentType.RETENTION_CERTIFICATE]: null,
};

/**
 * Registers a collection of an invoice (backend rules): amount > 0 and not above the outstanding
 * balance, in the invoice currency; deposits need a bank account, the retention certificate does not.
 * Proposes the amount still pending for the chosen type. Closes with the {@link InvoicePayment}.
 */
@Component({
  selector: 'app-register-payment-dialog',
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
  templateUrl: './register-payment-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .balance { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class RegisterPaymentDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<RegisterPaymentDialog, InvoicePayment>>(MatDialogRef);
  readonly data = inject<RegisterPaymentData>(MAT_DIALOG_DATA);

  readonly invoice = this.data.invoice;
  readonly types = applicablePaymentTypes(this.invoice);
  /** Only accounts in the invoice currency (the backend rejects a mismatch). */
  readonly accounts = this.data.bankAccounts.filter((account) => account.currency === this.invoice.currency);
  readonly outstanding = this.invoice.outstandingBalance;

  readonly paymentForm = this.formBuilder.group({
    type: this.formBuilder.nonNullable.control(InvoicePaymentType.NET_DEPOSIT, Validators.required),
    receivedOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    amount: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(this.outstanding),
    ]),
    bankAccountId: this.formBuilder.control<number | null>(null, Validators.required),
    reference: this.formBuilder.nonNullable.control('', Validators.maxLength(100)),
  });

  constructor() {
    super();
    this.applyType(this.paymentForm.controls.type.value);
    this.paymentForm.controls.type.valueChanges.subscribe((type) => this.applyType(type));
  }

  onSave(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    this.dialogRef.close(
      new InvoicePayment({
        id: 0,
        invoiceId: this.invoice.id,
        receivedOn: toIsoDate(value.receivedOn!),
        amount: Math.round(Number(value.amount) * 100) / 100,
        type: value.type,
        bankAccountId: needsBankAccount(value.type) ? value.bankAccountId : null,
        reference: value.reference.trim(),
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }

  /** Proposes the amount (unless the user typed one) and the account for the chosen type. */
  private applyType(type: InvoicePaymentType): void {
    const amount = this.paymentForm.controls.amount;
    if (!amount.dirty) {
      amount.setValue(suggestedPaymentAmount(this.invoice, this.data.payments, type));
    }
    const account = this.paymentForm.controls.bankAccountId;
    if (needsBankAccount(type)) {
      account.enable();
      const preferred = this.accounts.find((a) => a.type === PREFERRED_ACCOUNT_TYPE[type]) ?? this.accounts[0];
      if (!account.dirty) {
        account.setValue(preferred?.id ?? null);
      }
    } else {
      account.setValue(null);
      account.disable();
    }
  }
}
