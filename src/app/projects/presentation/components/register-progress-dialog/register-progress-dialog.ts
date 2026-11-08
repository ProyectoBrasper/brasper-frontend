import { PercentPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { toFraction, toPercent } from '../../../../shared/domain/model/percentage';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { ProgressRecord } from '../../../domain/model/progress-record.entity';
import { Project } from '../../../domain/model/project.entity';
import { isPeriodTaken, suggestedPeriod } from './progress-rules';

export interface RegisterProgressData {
  project: Project;
  records: ProgressRecord[];
}

/**
 * Registers the progress of one month (in-progress projects only). The percentage cannot exceed
 * what is left to reach 100 % and the month cannot already have progress (backend rules).
 * Closes with the new {@link ProgressRecord} or nothing.
 */
@Component({
  selector: 'app-register-progress-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    PercentPipe,
    TranslatePipe,
  ],
  templateUrl: './register-progress-dialog.html',
  styles: `
    .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 0 16px; }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    input.amount { text-align: right; }
    .remaining { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .complete-note { margin: 0; color: var(--brasper-success); font: var(--mat-sys-body-small); }
    .period-error { margin: -8px 0 12px; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
  `,
})
export class RegisterProgressDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<RegisterProgressDialog, ProgressRecord>>(MatDialogRef);
  readonly data = inject<RegisterProgressData>(MAT_DIALOG_DATA);

  /** Maximum percentage allowed (what is left to 100 %). */
  readonly maxPercentage = toPercent(this.data.project.remainingProgress());
  readonly months = Array.from({ length: 12 }, (_, index) => index + 1);
  private readonly initial = suggestedPeriod(this.data.records, new Date());

  readonly progressForm = this.formBuilder.group(
    {
      month: this.formBuilder.nonNullable.control(this.initial.month, Validators.required),
      year: this.formBuilder.nonNullable.control(this.initial.year, [
        Validators.required,
        Validators.min(2000),
        Validators.max(2100),
      ]),
      percentage: this.formBuilder.control<number | null>(null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(this.maxPercentage),
      ]),
    },
    { validators: (group: AbstractControl): ValidationErrors | null => this.periodValidator(group) },
  );

  monthName(month: number): string {
    const name = new Intl.DateTimeFormat(this.translate.getCurrentLang() === 'en' ? 'en-US' : 'es-PE', {
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, month - 1, 1)));
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /** True when the typed percentage completes the project. */
  completesProject(): boolean {
    return Number(this.progressForm.controls.percentage.value) === this.maxPercentage;
  }

  onSave(): void {
    if (this.progressForm.invalid) {
      this.progressForm.markAllAsTouched();
      return;
    }
    const { month, year, percentage } = this.progressForm.getRawValue();
    this.dialogRef.close(
      new ProgressRecord({
        id: 0,
        projectId: this.data.project.id,
        year: Number(year),
        month: Number(month),
        percentage: toFraction(Number(percentage)),
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private periodValidator(group: AbstractControl): ValidationErrors | null {
    const { month, year } = group.value as { month: number; year: number };
    return isPeriodTaken(this.data.records, Number(year), Number(month)) ? { periodTaken: true } : null;
  }
}
