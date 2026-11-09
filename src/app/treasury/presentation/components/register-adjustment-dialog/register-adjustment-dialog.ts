import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { AMOUNT_VALIDATORS } from '../../../../shared/presentation/amount-validators';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { MoneyPipe } from '../../../../shared/presentation/money.pipe';
import { BankAccount } from '../../../domain/model/bank-account.entity';
import { RegisterAdjustmentCommand } from '../../../domain/model/cash-movement.commands';
import { MOVEMENT_DIRECTIONS, MovementDirection } from '../../../domain/model/cash-movement.entity';

/**
 * Corrects a balance with a movement in the account currency: the only way to fix a balance, because it is
 * never edited by hand. The direction has no default, so a wrong sign cannot slip in. Closes with the command.
 */
@Component({
  selector: 'app-register-adjustment-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonToggleModule,
    MatButtonModule,
    MoneyPipe,
    TranslatePipe,
  ],
  templateUrl: './register-adjustment-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .direction { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .direction-label { font: var(--mat-sys-body-medium); font-weight: 600; }
    .direction-error { font: var(--mat-sys-body-small); color: var(--mat-sys-error); }
    @media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class RegisterAdjustmentDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<RegisterAdjustmentDialog, RegisterAdjustmentCommand>>(MatDialogRef);
  readonly account = inject<BankAccount>(MAT_DIALOG_DATA);
  readonly directions = MOVEMENT_DIRECTIONS;

  readonly adjustmentForm = this.formBuilder.group({
    direction: this.formBuilder.control<MovementDirection | null>(null, Validators.required),
    occurredOn: this.formBuilder.control<Date | null>(new Date(), Validators.required),
    amount: this.formBuilder.control<number | null>(null, AMOUNT_VALIDATORS),
    concept: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
  });

  onSave(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }
    const value = this.adjustmentForm.getRawValue();
    this.dialogRef.close({
      occurredOn: toIsoDate(value.occurredOn!),
      direction: value.direction!,
      amount: Math.round(Number(value.amount) * 100) / 100,
      concept: value.concept,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
