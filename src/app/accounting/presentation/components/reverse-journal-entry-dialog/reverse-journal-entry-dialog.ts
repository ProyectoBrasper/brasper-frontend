import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { fromIsoDate, toIsoDate } from '../../../../shared/domain/model/iso-date';
import { BaseForm } from '../../../../shared/presentation/base-form';
import { ReverseJournalEntryCommand } from '../../../domain/model/journal-entry.commands';
import { JournalEntry } from '../../../domain/model/journal-entry.entity';

export interface ReverseJournalEntryData {
  entry: JournalEntry;
  /** What the list shows for the entry (translated source or typed description). */
  description: string;
}

/** Today, or the entry's date when the entry is dated later (a reversal never goes before what it reverses). */
export function defaultReversalDate(entryDate: string, today: Date = new Date()): Date {
  const date = fromIsoDate(entryDate);
  return date && date > today ? date : today;
}

/**
 * Asks for the date of a reversal. The backend posts a new entry with the lines swapped on that date and marks the
 * original as reversed; it does not check the date, so the UI keeps it on or after the entry's. For an automatic
 * entry it warns that the document behind it (invoice, expense, payment) does not change. Closes with the command.
 */
@Component({
  selector: 'app-reverse-journal-entry-dialog',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'journalEntries.reverseTitle' | translate: { id: entry.id } }}</h2>
    <form [formGroup]="reversalForm" (ngSubmit)="onSave()" novalidate>
      <mat-dialog-content>
        <p class="summary">
          {{ data.description }}<br />
          {{ entry.entryDate | date: 'dd/MM/yyyy' }} · S/ {{ entry.totalDebit | number: '1.2-2' }}
        </p>
        <p class="help">{{ 'journalEntries.reverseHelp' | translate }}</p>

        @if (!entry.isManual()) {
          <p class="notice" role="note">
            <mat-icon>warning</mat-icon>
            <span>{{ 'journalEntries.automaticReverseNotice' | translate: { source: ('entrySource.' + entry.source | translate) } }}</span>
          </p>
        }

        <mat-form-field appearance="outline">
          <mat-label>{{ 'journalEntries.reversedOn' | translate }}</mat-label>
          <input matInput formControlName="reversedOn" [matDatepicker]="picker" [min]="minDate" placeholder="dd/mm/aaaa" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
          @if (isInvalidControl(reversalForm, 'reversedOn')) {
            <mat-error>
              {{
                reversalForm.controls.reversedOn.hasError('matDatepickerMin')
                  ? ('journalEntries.reversedBeforeEntry' | translate)
                  : errorMessageForControl(reversalForm, 'reversedOn')
              }}
            </mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">{{ 'common.cancel' | translate }}</button>
        <button mat-flat-button type="submit" class="danger">{{ 'journalEntries.reverse' | translate }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field { width: 100%; }
    .summary { margin: 0 0 12px; font-weight: 500; }
    .help { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .notice {
      display: flex; align-items: flex-start; gap: 8px; margin: 0 0 16px; padding: 12px 16px;
      border-radius: var(--brasper-radius-md);
      background: var(--brasper-warning-container); color: var(--brasper-warning); font: var(--mat-sys-body-medium);
    }
    .danger { --mat-button-filled-container-color: var(--mat-sys-error); --mat-button-filled-label-text-color: var(--mat-sys-on-error); }
  `,
})
export class ReverseJournalEntryDialog extends BaseForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ReverseJournalEntryDialog, ReverseJournalEntryCommand>>(MatDialogRef);
  readonly data = inject<ReverseJournalEntryData>(MAT_DIALOG_DATA);

  readonly entry = this.data.entry;
  readonly minDate = fromIsoDate(this.entry.entryDate);

  readonly reversalForm = this.formBuilder.group({
    reversedOn: this.formBuilder.control<Date | null>(defaultReversalDate(this.entry.entryDate), Validators.required),
  });

  onSave(): void {
    if (this.reversalForm.invalid) {
      this.reversalForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ reversedOn: toIsoDate(this.reversalForm.getRawValue().reversedOn!) });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
