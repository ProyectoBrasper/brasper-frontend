import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { Employee } from '../../../domain/model/employee.entity';

/** Backend rule: the termination date cannot be before the hiring date (`yyyy-MM-dd`). */
export const notBefore =
  (minIso: string): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return null;
    }
    return toIsoDate(value) < minIso ? { notBeforeHiring: true } : null;
  };

/**
 * Terminates an employee: asks for the termination date (today by default, never before hiring).
 * It cannot be undone, so the message says so. Closes with the date as `yyyy-MM-dd`.
 */
@Component({
  selector: 'app-terminate-employee-dialog',
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
    <h2 mat-dialog-title>{{ 'employees.terminateTitle' | translate }}</h2>
    <form [formGroup]="terminationForm" (ngSubmit)="onConfirm()" novalidate>
      <mat-dialog-content>
        <p class="message">
          {{ 'employees.terminateMessage' | translate: { name: employee.fullName, hiredOn: (employee.hiredOn | date: 'dd/MM/yyyy') } }}
        </p>
        <mat-form-field appearance="outline" class="date">
          <mat-label>{{ 'employees.terminatedOn' | translate }}</mat-label>
          <input matInput formControlName="terminatedOn" [matDatepicker]="picker" [min]="minDate" placeholder="dd/mm/aaaa" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
          @if (isInvalidControl(terminationForm, 'terminatedOn')) {
            <mat-error>{{ errorMessageForControl(terminationForm, 'terminatedOn') }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit">{{ 'employees.terminate' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .message { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .date { width: 100%; }
  `,
})
export class TerminateEmployeeDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<TerminateEmployeeDialog, string>>(MatDialogRef);
  readonly employee = inject<Employee>(MAT_DIALOG_DATA);
  readonly minDate = fromIsoDate(this.employee.hiredOn);

  readonly terminationForm = this.formBuilder.group({
    terminatedOn: this.formBuilder.control<Date | null>(new Date(), [
      Validators.required,
      notBefore(this.employee.hiredOn),
    ]),
  });

  onConfirm(): void {
    if (this.terminationForm.invalid) {
      this.terminationForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(toIsoDate(this.terminationForm.getRawValue().terminatedOn!));
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
