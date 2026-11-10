import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS, maxTwoDecimals } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { ScheduleInstallmentCommand } from '../../../domain/model/loan.commands';
import { Loan } from '../../../domain/model/loan.entity';
import { nextDueDate, unscheduledPrincipal } from '../../../domain/services/loan-figures';

/** Backend rule (`@PositiveOrZero @Digits(integer = 12, fraction = 2)`): the interest can be zero, never negative. */
export const INTEREST_VALIDATORS = [Validators.required, Validators.min(0), Validators.max(999_999_999_999.99), maxTwoDecimals];

/**
 * Schedules one installment of a loan. It proposes the capital still unscheduled and does not allow more (the
 * backend answers 409), and a due date a month after the last installment. The due date cannot be before the
 * disbursement: the backend does not check it, the UI does. Closes with the command.
 */
@Component({
  selector: 'app-schedule-installment-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MoneyPipe,
    TranslatePipe,
  ],
  templateUrl: './schedule-installment-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .total { display: flex; justify-content: space-between; margin: 4px 0 0; font: var(--mat-sys-body-large); }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class ScheduleInstallmentDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ScheduleInstallmentDialog, ScheduleInstallmentCommand>>(MatDialogRef);
  readonly loan = inject<Loan>(MAT_DIALOG_DATA);

  readonly unscheduled = unscheduledPrincipal(this.loan);
  /** No due date before the disbursement (the datepicker adds the `matDatepickerMin` error). */
  readonly minDueOn = fromIsoDate(this.loan.disbursedOn);

  readonly installmentForm = this.formBuilder.group({
    dueOn: this.formBuilder.control<Date | null>(fromIsoDate(nextDueDate(this.loan)), Validators.required),
    principal: this.formBuilder.control<number | null>(this.unscheduled, [
      ...AMOUNT_VALIDATORS,
      Validators.max(this.unscheduled),
    ]),
    interest: this.formBuilder.control<number | null>(0, INTEREST_VALIDATORS),
  });

  private readonly value = toSignal(this.installmentForm.valueChanges, {
    initialValue: this.installmentForm.getRawValue(),
  });
  /** Capital plus interest, as it will be paid. */
  readonly total = computed(() => {
    const { principal, interest } = this.value();
    return (Math.round(Number(principal ?? 0) * 100) + Math.round(Number(interest ?? 0) * 100)) / 100;
  });

  onSave(): void {
    if (this.installmentForm.invalid) {
      this.installmentForm.markAllAsTouched();
      return;
    }
    const value = this.installmentForm.getRawValue();
    this.dialogRef.close({
      dueOn: toIsoDate(value.dueOn!),
      principal: Math.round(Number(value.principal) * 100) / 100,
      interest: Math.round(Number(value.interest) * 100) / 100,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
