import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { CashFlowWeek } from '../../../../shared/domain/model/cash-flow-week';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { Payable } from '../../../domain/model/payable.entity';

/**
 * Moves an unpaid payable to the cash-flow week of a date, like the scheduled collections: the user picks a day
 * and the dialog shows the week it falls in, so a week that does not exist in that month cannot be chosen.
 * Closes with the week.
 */
@Component({
  selector: 'app-reschedule-payable-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'payables.reschedule' | translate }}</h2>
    <form [formGroup]="rescheduleForm" (ngSubmit)="onSave()" novalidate>
      <mat-dialog-content>
        <p class="summary">
          {{ payable.concept }}<br />
          {{ 'payables.currentWeek' | translate }}:
          <strong>
            {{ 'payables.weekRange' | translate: { number: current.number, from: (current.startDate() | date: 'dd/MM'), to: (current.endDate() | date: 'dd/MM/yyyy') } }}
          </strong>
        </p>
        <mat-form-field appearance="outline" class="date">
          <mat-label>{{ 'payables.newDate' | translate }}</mat-label>
          <input matInput formControlName="date" [matDatepicker]="picker" placeholder="dd/mm/aaaa" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
          @if (isInvalidControl(rescheduleForm, 'date')) {
            <mat-error>{{ errorMessageForControl(rescheduleForm, 'date') }}</mat-error>
          }
        </mat-form-field>
        @if (week(); as week) {
          <p class="week" aria-live="polite">
            {{ 'payables.fallsIn' | translate: { number: week.number, from: (week.startDate() | date: 'dd/MM'), to: (week.endDate() | date: 'dd/MM/yyyy') } }}
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit">{{ 'payables.reschedule' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .summary { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .date { width: 100%; }
    .week { margin: -8px 0 0; font: var(--mat-sys-body-small); color: var(--mat-sys-primary); }
  `,
})
export class ReschedulePayableDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ReschedulePayableDialog, CashFlowWeek>>(MatDialogRef);
  readonly payable = inject<Payable>(MAT_DIALOG_DATA);
  readonly current = this.payable.cashFlowWeek();

  readonly rescheduleForm = this.formBuilder.group({
    date: this.formBuilder.control<Date | null>(new Date(), Validators.required),
  });

  private readonly date = toSignal(this.rescheduleForm.controls.date.valueChanges, {
    initialValue: this.rescheduleForm.controls.date.value,
  });
  readonly week = computed(() => {
    const date = this.date();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? CashFlowWeek.from(date) : null;
  });

  onSave(): void {
    const week = this.week();
    if (this.rescheduleForm.invalid || !week) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(week);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
