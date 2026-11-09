import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Project } from '../../../../projects/domain/model/project.entity';
import { ProjectStatus } from '../../../../projects/domain/model/project-status';
import { CashFlowWeek } from '../../../../shared/domain/model/cash-flow-week';
import { toIsoDate } from '../../../../shared/domain/model/iso-date';
import { SUPPORTED_CURRENCIES } from '../../../../shared/domain/model/money';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { ScheduledCollection } from '../../../domain/model/scheduled-collection.entity';
import { ScheduleCollectionRequest } from '../../../infrastructure/scheduled-collections-api-endpoint';

export interface ScheduledCollectionData {
  /** Collection to reschedule, or null to schedule a new one. */
  collection: ScheduledCollection | null;
  projects: Project[];
  /** Date proposed for a new collection (a day of the month being shown). */
  defaultDate: Date;
}

/** Result: the full request when scheduling, only the new date when rescheduling. */
export type ScheduledCollectionResult = ScheduleCollectionRequest | { expectedOn: string };

/**
 * Schedules a collection (project, expected amount, date, notes) or reschedules an open one (date
 * only). The backend places it in the cash-flow week of the date; the dialog shows that week live.
 */
@Component({
  selector: 'app-scheduled-collection-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './scheduled-collection-dialog.html',
  styles: `
    mat-form-field { width: 100%; }
    mat-dialog-content { min-width: min(420px, 80vw); }
    input.amount { text-align: right; }
    .week { margin: -8px 0 16px; font: var(--mat-sys-body-small); color: var(--mat-sys-primary); }
  `,
})
export class ScheduledCollectionDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ScheduledCollectionDialog, ScheduledCollectionResult>>(MatDialogRef);
  readonly data = inject<ScheduledCollectionData>(MAT_DIALOG_DATA);

  readonly isReschedule = this.data.collection !== null;
  /** Any non-cancelled project (the backend only checks that it exists). */
  readonly projects = this.data.projects
    .filter((project) => project.status !== ProjectStatus.CANCELLED)
    .sort((a, b) => a.code.localeCompare(b.code));

  readonly collectionForm = this.formBuilder.group({
    projectId: this.formBuilder.control<number | null>(
      { value: this.data.collection?.projectId ?? null, disabled: this.isReschedule },
      Validators.required,
    ),
    expectedAmount: this.formBuilder.control<number | null>(
      { value: this.data.collection?.expectedAmount ?? null, disabled: this.isReschedule },
      [Validators.required, Validators.min(0.01)],
    ),
    expectedOn: this.formBuilder.control<Date | null>(this.data.defaultDate, Validators.required),
    notes: this.formBuilder.nonNullable.control(
      { value: this.data.collection?.notes ?? '', disabled: this.isReschedule },
      Validators.maxLength(500),
    ),
  });

  private readonly expectedOn = toSignal(this.collectionForm.controls.expectedOn.valueChanges, {
    initialValue: this.collectionForm.controls.expectedOn.value,
  });
  /** Week the chosen date falls in (same rule as the backend). */
  readonly week = computed(() => {
    const date = this.expectedOn();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? CashFlowWeek.from(date) : null;
  });

  onSave(): void {
    if (this.collectionForm.invalid) {
      this.collectionForm.markAllAsTouched();
      return;
    }
    const value = this.collectionForm.getRawValue();
    const expectedOn = toIsoDate(value.expectedOn!);
    if (this.isReschedule) {
      this.dialogRef.close({ expectedOn });
      return;
    }
    this.dialogRef.close({
      projectId: value.projectId!,
      expectedAmount: Math.round(Number(value.expectedAmount) * 100) / 100,
      currency: SUPPORTED_CURRENCIES[0],
      expectedOn,
      notes: value.notes.trim() || null,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
