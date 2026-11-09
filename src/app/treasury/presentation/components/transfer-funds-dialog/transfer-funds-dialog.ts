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
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BankAccount } from '../../../domain/model/bank-account.entity';
import { TransferFundsCommand } from '../../../domain/model/cash-movement.commands';
import { transferTargets } from '../../../domain/services/movement-figures';

export interface TransferFundsData {
  accounts: BankAccount[];
  /** Proposed origin (the account being viewed), if any. */
  fromAccountId: number | null;
}

/**
 * Moves money between two accounts of the company. The destination list leaves out the origin and accounts in
 * another currency, so the backend rules (different accounts, same currency) cannot fail here. The backend
 * allows a negative balance, so going below zero is only warned about. Closes with the command.
 */
@Component({
  selector: 'app-transfer-funds-dialog',
  imports: [
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
  templateUrl: './transfer-funds-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .warning {
      display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding: 8px 12px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning); font: var(--mat-sys-body-small);
    }
    .warning mat-icon { width: 18px; height: 18px; font-size: 18px; }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class TransferFundsDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<TransferFundsDialog, TransferFundsCommand>>(MatDialogRef);
  readonly data = inject<TransferFundsData>(MAT_DIALOG_DATA);

  readonly accounts = this.data.accounts;

  readonly transferForm = this.formBuilder.group({
    fromAccountId: this.formBuilder.control<number | null>(this.data.fromAccountId, Validators.required),
    toAccountId: this.formBuilder.control<number | null>(null, Validators.required),
    transferredOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    amount: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    concept: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
  });

  private readonly value = toSignal(this.transferForm.valueChanges, { initialValue: this.transferForm.getRawValue() });
  readonly origin = computed(() => this.accounts.find((a) => a.id === this.value().fromAccountId));
  readonly targets = computed(() => transferTargets(this.accounts, this.value().fromAccountId ?? null));
  /** The backend lets an account go below zero; the user is only warned. */
  readonly leavesNegative = computed(() => {
    const origin = this.origin();
    const amount = Number(this.value().amount);
    return !!origin && amount > 0 && Math.round(amount * 100) > Math.round(origin.currentBalance * 100);
  });

  constructor() {
    super();
    // A destination chosen for another origin may not be valid any more.
    this.transferForm.controls.fromAccountId.valueChanges.subscribe((fromId) => {
      const to = this.transferForm.controls.toAccountId;
      if (!transferTargets(this.accounts, fromId).some((a) => a.id === to.value)) {
        to.setValue(null);
      }
    });
  }

  onSave(): void {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }
    const value = this.transferForm.getRawValue();
    this.dialogRef.close({
      fromAccountId: value.fromAccountId!,
      toAccountId: value.toAccountId!,
      transferredOn: toIsoDate(value.transferredOn!),
      amount: Math.round(Number(value.amount) * 100) / 100,
      concept: value.concept,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  accountLabel(account: BankAccount): string {
    return `${this.translate.instant('bank.' + account.bank)} · ${account.accountNumber}`;
  }
}
